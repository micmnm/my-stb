using System.Data;
using System.Text.Json;
using Dapper;

namespace MyStb.Api.Services;

public class VehiclePollerService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<VehiclePollerService> _logger;
    private readonly IHttpClientFactory _httpFactory;
    private DateTime _lastActivity = DateTime.MinValue;

    public VehiclePollerService(IServiceProvider services, IConfiguration config, ILogger<VehiclePollerService> logger, IHttpClientFactory httpFactory)
    {
        _services = services;
        _config = config;
        _logger = logger;
        _httpFactory = httpFactory;
    }

    /// <summary>
    /// Call from middleware on every /api request to signal user activity.
    /// </summary>
    public void Touch() => _lastActivity = DateTime.UtcNow;

    public bool IsActive => DateTime.UtcNow - _lastActivity < TimeSpan.FromMinutes(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = _config.GetValue("MoBiRo:PollIntervalSeconds", 30);

        while (!stoppingToken.IsCancellationRequested)
        {
            if (IsActive)
            {
                try
                {
                    await PollVehicles(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Vehicle poll failed");
                }
            }
            else
            {
                _logger.LogDebug("Skipping vehicle poll — no active users");
            }

            await Task.Delay(TimeSpan.FromSeconds(intervalSeconds), stoppingToken);
        }
    }

    private async Task PollVehicles(CancellationToken ct)
    {
        var url = _config["MoBiRo:BusDataUrl"]!;
        var http = _httpFactory.CreateClient();

        _logger.LogDebug("Polling vehicle positions from {Url}", url);
        var json = await http.GetStringAsync(url, ct);

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        if (root.ValueKind != JsonValueKind.Array)
        {
            _logger.LogWarning("Vehicle feed root was {Kind}, expected Array — skipping poll", root.ValueKind);
            return;
        }

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var upserted = 0;
        var skipped = 0;

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
                        UpdatedAt = now,
                    });
                upserted++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Vehicle upsert failed for {Id}", parsed.Id);
                skipped++;
            }
        }

        if (skipped > 0)
        {
            _logger.LogInformation("Vehicle poll: upserted {Up}, skipped {Skip}", upserted, skipped);
        }
        else
        {
            _logger.LogInformation("Upserted {Count} vehicle positions", upserted);
        }
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

        if (!TryGetLong(vehicle, "timestamp", out var ts))
        {
            ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        }

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
