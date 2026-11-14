using System.Data;
using System.IO.Compression;
using Dapper;

namespace MyStb.Api.Services;

public class GtfsLoaderService
{
    private static readonly TimeSpan RetryAfterFailure = TimeSpan.FromMinutes(15);
    private const double MinStopRatio = 0.5;

    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<GtfsLoaderService> _logger;
    private readonly HttpClient _http;
    private readonly TimeProvider _time;
    private readonly SemaphoreSlim _lock = new(1, 1);
    // UTC ticks; 0 = not since process start. Read/written via Interlocked.
    private long _lastLoadedTicks;
    private long _lastFailureTicks;
    private volatile bool _hasData;
    private Task _backgroundRefresh = Task.CompletedTask;

    public GtfsLoaderService(IServiceProvider services, IConfiguration config, ILogger<GtfsLoaderService> logger, IHttpClientFactory httpFactory, TimeProvider? time = null)
    {
        _services = services;
        _config = config;
        _logger = logger;
        _http = httpFactory.CreateClient("Gtfs");
        _time = time ?? TimeProvider.System;
    }

    /// <summary>The most recently started background refresh (completed when none is running).</summary>
    public Task BackgroundRefresh => _backgroundRefresh;

    /// <summary>
    /// Ensures GTFS data is loaded. Call on user-facing requests.
    /// An empty DB blocks callers until one shared load finishes; stale data is
    /// served while a single background refresh runs.
    /// </summary>
    public async Task EnsureLoadedAsync(CancellationToken ct = default)
    {
        var maxAge = TimeSpan.FromHours(_config.GetValue("Gtfs:MaxAgeHours", 168));
        var last = Interlocked.Read(ref _lastLoadedTicks);
        if (last != 0 && NowTicks() - last < maxAge.Ticks) return;
        if (InFailureBackoff()) return;

        if (_hasData || last != 0 || CountStops() > 0)
        {
            _hasData = true;
            StartBackgroundRefresh();
            return;
        }

        await _lock.WaitAsync(ct);
        try
        {
            if (Interlocked.Read(ref _lastLoadedTicks) != 0 || InFailureBackoff()) return;
            // Not the caller's token: an aborted request must not cancel the load others wait on.
            await LoadAsync(CancellationToken.None);
        }
        finally
        {
            _lock.Release();
        }
    }

    private long NowTicks() => _time.GetUtcNow().UtcTicks;

    private bool InFailureBackoff()
    {
        var failed = Interlocked.Read(ref _lastFailureTicks);
        return failed != 0 && NowTicks() - failed < RetryAfterFailure.Ticks;
    }

    private int CountStops()
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
        return db.ExecuteScalar<int>("SELECT COUNT(*) FROM stops");
    }

    private void StartBackgroundRefresh()
    {
        if (!_lock.Wait(0)) return;
        _backgroundRefresh = Task.Run(async () =>
        {
            try
            {
                await LoadAsync(CancellationToken.None);
            }
            finally
            {
                _lock.Release();
            }
        });
    }

    private async Task LoadAsync(CancellationToken ct)
    {
        try
        {
            await LoadGtfsData(ct);
            Interlocked.Exchange(ref _lastLoadedTicks, NowTicks());
            _hasData = true;
        }
        catch (Exception ex)
        {
            Interlocked.Exchange(ref _lastFailureTicks, NowTicks());
            _logger.LogError(ex, "Failed to load GTFS data; retrying in {Minutes} min", RetryAfterFailure.TotalMinutes);
        }
    }

    private async Task LoadGtfsData(CancellationToken ct)
    {
        var url = _config["Gtfs:DownloadUrl"]!;
        _logger.LogInformation("Downloading GTFS data from {Url}", url);

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.UserAgent.ParseAdd(VehiclePollerService.UserAgent);
        using var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();

        using var ms = new MemoryStream();
        await response.Content.CopyToAsync(ms, ct);
        ms.Position = 0;
        using var archive = new ZipArchive(ms, ZipArchiveMode.Read);

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
        ImportArchive(db, archive);

        var stopCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM stops");
        var routeCount = db.ExecuteScalar<int>("SELECT COUNT(*) FROM routes");
        _logger.LogInformation("GTFS loaded: {Stops} stops, {Routes} routes", stopCount, routeCount);
    }

    /// <summary>
    /// Replaces static GTFS tables from <paramref name="archive"/>. Throws <see cref="InvalidDataException"/>
    /// without touching the DB when the feed looks broken: the download skips TLS validation.
    /// </summary>
    public static void ImportArchive(IDbConnection db, ZipArchive archive)
    {
        foreach (var required in new[] { "stops.txt", "routes.txt" })
        {
            if (archive.GetEntry(required) is null)
                throw new InvalidDataException($"GTFS zip does not contain {required}");
        }

        var stops = GtfsParser.ParseStops(archive).ToList();
        var currentStops = db.ExecuteScalar<int>("SELECT COUNT(*) FROM stops");
        if (stops.Count == 0 || stops.Count < currentStops * MinStopRatio)
            throw new InvalidDataException($"GTFS zip has {stops.Count} stops, current data has {currentStops}");

        using var tx = db.BeginTransaction();

        db.Execute("DELETE FROM shape_points", transaction: tx);
        db.Execute("DELETE FROM route_shapes", transaction: tx);
        db.Execute("DELETE FROM route_stops", transaction: tx);
        db.Execute("DELETE FROM schedules", transaction: tx);
        db.Execute("DELETE FROM routes", transaction: tx);
        db.Execute("DELETE FROM stops", transaction: tx);

        foreach (var stop in stops)
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
    }
}
