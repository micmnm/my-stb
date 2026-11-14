using System.Data;
using System.Text.Json;
using Dapper;

namespace MyStb.Api.Services;

public class VehiclePollerService : BackgroundService
{
    public const string UserAgent = "MyStb/1.0 (+https://mystb.mltru.com)";
    private static readonly TimeSpan PollTimeout = TimeSpan.FromSeconds(20);

    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<VehiclePollerService> _logger;
    private readonly IHttpClientFactory _httpFactory;
    private readonly TimeProvider _time;
    private readonly TimeSpan _interval;
    private readonly FeedHealth _health;
    private readonly SemaphoreSlim _wake = new(0, 1);

    public VehiclePollerService(IServiceProvider services, IConfiguration config, ILogger<VehiclePollerService> logger, IHttpClientFactory httpFactory, TimeProvider? time = null)
    {
        _services = services;
        _config = config;
        _logger = logger;
        _httpFactory = httpFactory;
        _time = time ?? TimeProvider.System;
        _interval = TimeSpan.FromSeconds(config.GetValue("MoBiRo:PollIntervalSeconds", 30));
        _health = new FeedHealth(_interval);
    }

    /// <summary>
    /// Call from middleware on every /api request to signal user activity.
    /// After an idle period this triggers an immediate poll.
    /// </summary>
    public void Touch()
    {
        if (!_health.Touch(_time.GetUtcNow())) return;
        try { _wake.Release(); }
        catch (SemaphoreFullException) { }
    }

    public bool IsActive => _health.IsActive(_time.GetUtcNow());
    public DateTimeOffset? LastSuccessUtc => _health.LastSuccessUtc;
    public DateTimeOffset? LastAttemptUtc => _health.LastAttemptUtc;
    public int ConsecutiveFailures => _health.ConsecutiveFailures;

    public FeedStatus GetFeedStatus() => _health.Snapshot(_time.GetUtcNow());

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            if (IsActive)
            {
                await PollOnceAsync(stoppingToken);
            }
            else
            {
                _logger.LogDebug("Skipping vehicle poll — no active users");
            }

            try
            {
                await _wake.WaitAsync(_interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    /// <summary>Fetches and stores one feed snapshot; false when the attempt failed.</summary>
    public async Task<bool> PollOnceAsync(CancellationToken ct)
    {
        try
        {
            var url = _config["MoBiRo:BusDataUrl"]!;
            _logger.LogDebug("Polling vehicle positions from {Url}", url);

            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(PollTimeout);
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.UserAgent.ParseAdd(UserAgent);
            using var response = await _httpFactory.CreateClient().SendAsync(request, timeout.Token);
            response.EnsureSuccessStatusCode();
            var json = await response.Content.ReadAsStringAsync(timeout.Token);

            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
            var result = ApplyFeed(db, json, _time.GetUtcNow().ToUnixTimeSeconds());
            _health.RecordSuccess(_time.GetUtcNow());

            if (result.Skipped > 0)
                _logger.LogInformation("Vehicle poll: upserted {Up}, skipped {Skip}, pruned {Pruned}", result.Upserted, result.Skipped, result.Pruned);
            else
                _logger.LogInformation("Upserted {Count} vehicle positions, pruned {Pruned}", result.Upserted, result.Pruned);
            return true;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _health.RecordFailure(_time.GetUtcNow());
            _logger.LogError(ex, "Vehicle poll failed ({Failures} in a row)", _health.ConsecutiveFailures);
            return false;
        }
    }

    public record ApplyResult(int Upserted, int Skipped, int Pruned);

    /// <summary>Upserts a busData payload, then deletes vehicles past the hide threshold.</summary>
    public static ApplyResult ApplyFeed(IDbConnection db, string json, long nowUnix)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Array)
            throw new InvalidDataException($"Vehicle feed root was {root.ValueKind}, expected Array");

        var upserted = 0;
        var skipped = 0;
        using var tx = db.BeginTransaction();

        foreach (var item in root.EnumerateArray())
        {
            var parsed = TryParseVehicleEntry(item);
            if (parsed is null)
            {
                skipped++;
                continue;
            }

            try
            {
                db.Execute("""
                    INSERT INTO vehicles (id, route_id, lat, lng, direction_id, license_plate, timestamp, updated_at)
                    VALUES (@Id, @RouteId, @Lat, @Lng, @DirectionId, @LicensePlate, @Timestamp, @UpdatedAt)
                    ON CONFLICT(id) DO UPDATE SET
                        route_id = @RouteId,
                        lat = @Lat,
                        lng = @Lng,
                        direction_id = @DirectionId,
                        license_plate = @LicensePlate,
                        timestamp = @Timestamp,
                        updated_at = @UpdatedAt
                    """,
                    new
                    {
                        parsed.Id,
                        parsed.RouteId,
                        parsed.Lat,
                        parsed.Lng,
                        parsed.DirectionId,
                        parsed.LicensePlate,
                        parsed.Timestamp,
                        UpdatedAt = nowUnix,
                    }, tx);
                upserted++;
            }
            catch (Exception)
            {
                skipped++;
            }
        }

        var pruned = db.Execute(
            $"DELETE FROM vehicles WHERE {VehicleFreshness.ReportedAtSql} < @Since",
            new { Since = VehicleFreshness.VisibleSince(nowUnix) }, tx);
        tx.Commit();
        return new ApplyResult(upserted, skipped, pruned);
    }

    private record ParsedVehicle(string Id, string RouteId, double Lat, double Lng, int DirectionId, string? LicensePlate, long Timestamp);

    private static ParsedVehicle? TryParseVehicleEntry(JsonElement item)
    {
        if (item.ValueKind != JsonValueKind.Object) return null;
        if (!TryGetString(item, "id", out var id)) return null;
        if (!item.TryGetProperty("vehicle", out var vehicle) || vehicle.ValueKind != JsonValueKind.Object) return null;
        if (!vehicle.TryGetProperty("trip", out var trip) || trip.ValueKind != JsonValueKind.Object) return null;
        if (!vehicle.TryGetProperty("position", out var pos) || pos.ValueKind != JsonValueKind.Object) return null;

        if (!TryGetString(trip, "routeId", out var routeId)) return null;
        if (!TryGetInt(trip, "directionId", out var directionId)) directionId = 0;
        if (!TryGetDouble(pos, "latitude", out var lat)) return null;
        if (!TryGetDouble(pos, "longitude", out var lng)) return null;

        string? licensePlate = null;
        if (vehicle.TryGetProperty("vehicle", out var veh) && veh.ValueKind == JsonValueKind.Object
            && TryGetString(veh, "licensePlate", out var lp))
        {
            licensePlate = lp;
        }

        // 0 = unknown report time; readers fall back to updated_at.
        var ts = TryGetLong(vehicle, "timestamp", out var raw) ? VehicleFreshness.NormalizeFeedTimestamp(raw) : 0;

        return new ParsedVehicle(id!, routeId!, lat, lng, directionId, licensePlate, ts);
    }

    private static bool TryGetString(JsonElement el, string name, out string? value)
    {
        value = null;
        if (!el.TryGetProperty(name, out var p)) return false;
        if (p.ValueKind == JsonValueKind.String) { value = p.GetString(); return value is not null; }
        return false;
    }

    private static bool TryGetDouble(JsonElement el, string name, out double value)
    {
        value = 0;
        if (!el.TryGetProperty(name, out var p)) return false;
        if (p.ValueKind == JsonValueKind.Number) { value = p.GetDouble(); return true; }
        if (p.ValueKind == JsonValueKind.String && double.TryParse(p.GetString(), out var d)) { value = d; return true; }
        return false;
    }

    private static bool TryGetInt(JsonElement el, string name, out int value)
    {
        value = 0;
        if (!el.TryGetProperty(name, out var p)) return false;
        if (p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var i)) { value = i; return true; }
        if (p.ValueKind == JsonValueKind.String && int.TryParse(p.GetString(), out var s)) { value = s; return true; }
        return false;
    }

    private static bool TryGetLong(JsonElement el, string name, out long value)
    {
        value = 0;
        if (!el.TryGetProperty(name, out var p)) return false;
        if (p.ValueKind == JsonValueKind.Number && p.TryGetInt64(out var i)) { value = i; return true; }
        if (p.ValueKind == JsonValueKind.String && long.TryParse(p.GetString(), out var s)) { value = s; return true; }
        return false;
    }
}
