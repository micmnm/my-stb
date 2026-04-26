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
        var items = doc.RootElement;

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var count = 0;

        foreach (var item in items.EnumerateArray())
        {
            var id = item.GetProperty("id").GetString();
            var vehicle = item.GetProperty("vehicle");
            var trip = vehicle.GetProperty("trip");
            var veh = vehicle.GetProperty("vehicle");
            var pos = vehicle.GetProperty("position");

            var routeId = trip.GetProperty("routeId").GetString();
            var directionId = trip.GetProperty("directionId").GetInt32();
            var lat = pos.GetProperty("latitude").GetDouble();
            var lng = pos.GetProperty("longitude").GetDouble();
            var licensePlate = veh.TryGetProperty("licensePlate", out var lp) ? lp.GetString() : null;
            var timestamp = vehicle.GetProperty("timestamp").GetInt64();

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
                new { Id = id, RouteId = routeId, Lat = lat, Lng = lng, DirectionId = directionId, LicensePlate = licensePlate, Timestamp = timestamp, UpdatedAt = now });

            count++;
        }

        _logger.LogInformation("Upserted {Count} vehicle positions", count);
    }
}
