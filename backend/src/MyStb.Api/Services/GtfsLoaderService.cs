using System.Data;
using Dapper;

namespace MyStb.Api.Services;

public class GtfsLoaderService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<GtfsLoaderService> _logger;
    private readonly HttpClient _http;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private DateTime _lastLoaded = DateTime.MinValue;

    public GtfsLoaderService(IServiceProvider services, IConfiguration config, ILogger<GtfsLoaderService> logger, IHttpClientFactory httpFactory)
    {
        _services = services;
        _config = config;
        _logger = logger;
        _http = httpFactory.CreateClient("Gtfs");
    }

    /// <summary>
    /// Ensures GTFS data is loaded and fresh. Call on user-facing requests.
    /// Returns immediately if data is loaded and not stale.
    /// </summary>
    public async Task EnsureLoadedAsync(CancellationToken ct = default)
    {
        var maxAgeHours = _config.GetValue("Gtfs:MaxAgeHours", 168);
        if (DateTime.UtcNow - _lastLoaded < TimeSpan.FromHours(maxAgeHours))
            return;

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
        var count = db.ExecuteScalar<int>("SELECT COUNT(*) FROM stops");
        if (count > 0 && _lastLoaded != DateTime.MinValue)
            return;

        if (!await _lock.WaitAsync(0, ct))
            return; // another load in progress

        try
        {
            await LoadGtfsData(ct);
            _lastLoaded = DateTime.UtcNow;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task LoadGtfsData(CancellationToken ct)
    {
        var url = _config["Gtfs:DownloadUrl"]!;
        _logger.LogInformation("Downloading GTFS data from {Url}", url);

        try
        {
            using var stream = await _http.GetStreamAsync(url, ct);
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms, ct);
            ms.Position = 0;

            // Open the zip once and reuse it across parsers — the previous
            // implementation re-wrapped the same MemoryStream in N ZipArchives,
            // each disposing the underlying stream on close.
            using var archive = new System.IO.Compression.ZipArchive(ms, System.IO.Compression.ZipArchiveMode.Read);

            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
            using var tx = db.BeginTransaction();

            db.Execute("DELETE FROM shape_points", transaction: tx);
            db.Execute("DELETE FROM route_shapes", transaction: tx);
            db.Execute("DELETE FROM route_stops", transaction: tx);
            db.Execute("DELETE FROM schedules", transaction: tx);
            db.Execute("DELETE FROM routes", transaction: tx);
            db.Execute("DELETE FROM stops", transaction: tx);

            foreach (var stop in GtfsParser.ParseStops(archive))
                db.Execute("INSERT OR IGNORE INTO stops (id, name, lat, lng) VALUES (@Id, @Name, @Lat, @Lng)", stop, tx);

            foreach (var route in GtfsParser.ParseRoutes(archive))
                db.Execute("INSERT OR IGNORE INTO routes (id, short_name, long_name, type) VALUES (@Id, @ShortName, @LongName, @Type)", route, tx);

            foreach (var rs in GtfsParser.ParseRouteStops(archive))
                db.Execute("INSERT OR IGNORE INTO route_stops (route_id, stop_id, direction_id, stop_sequence) VALUES (@RouteId, @StopId, @DirectionId, @StopSequence)", rs, tx);

            foreach (var shape in GtfsParser.ParseRouteShapes(archive))
                db.Execute("INSERT OR IGNORE INTO route_shapes (route_id, direction_id, shape_id) VALUES (@RouteId, @DirectionId, @ShapeId)", shape, tx);

            foreach (var pt in GtfsParser.ParseShapePoints(archive))
                db.Execute("INSERT OR IGNORE INTO shape_points (shape_id, lat, lng, sequence) VALUES (@ShapeId, @Lat, @Lng, @Sequence)", pt, tx);

            tx.Commit();
            var stopCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM stops");
            var routeCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM routes");
            _logger.LogInformation("GTFS loaded: {Stops} stops, {Routes} routes", stopCount, routeCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load GTFS data");
        }
    }
}
