# Bucharest STB Real-Time Navigation App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal PWA for real-time public transit navigation in Bucharest using STB data, with a C# backend and React frontend.

**Architecture:** C# ASP.NET minimal API backend with SQLite stores GTFS static data and polls mo-bi.ro for live vehicle positions on demand (only while users are active). React+Vite frontend with Leaflet map displays routes, live vehicles, and manages favourites locally in browser storage. Both deployed on user's existing Kubernetes cluster.

**Tech Stack:** .NET 8 (ASP.NET minimal API, Dapper, Microsoft.Data.Sqlite), React 18 + TypeScript + Vite, Leaflet + react-leaflet, CsvHelper (GTFS parsing)

---

## File Structure

### Backend

```
backend/
  src/MyStb.Api/
    MyStb.Api.csproj
    Program.cs
    appsettings.json
    Database/
      DbInitializer.cs
    Models/
      Stop.cs
      Route.cs
      RouteStop.cs
      Vehicle.cs
      RouteShape.cs
      ShapePoint.cs
      RouteOption.cs
    Services/
      GtfsParser.cs
      GtfsLoaderService.cs
      VehiclePollerService.cs
      RouteCalculatorService.cs
      GeoUtils.cs
      IGeocodingProvider.cs
      NominatimProvider.cs
    Endpoints/
      StopEndpoints.cs
      RouteEndpoints.cs
      VehicleEndpoints.cs
      SearchEndpoints.cs
  tests/MyStb.Api.Tests/
    MyStb.Api.Tests.csproj
    Services/
      GtfsParserTests.cs
      RouteCalculatorTests.cs
      GeoUtilsTests.cs
    TestDb.cs
```

### Frontend

```
frontend/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  public/
    manifest.json
  src/
    main.tsx
    App.tsx
    App.css
    api/
      client.ts
    types/
      index.ts
    components/
      Map.tsx
      BottomSheet.tsx
      SearchBar.tsx
      RouteCard.tsx
      RouteResults.tsx
      VehicleMarker.tsx
      StopMarker.tsx
      LastMileLine.tsx
      FavouriteChips.tsx
      FavouritesManager.tsx
    hooks/
      useGeolocation.ts
      useSearch.ts
      useRoutes.ts
      useVehicles.ts
      useFavourites.ts  (localStorage, no backend calls)
```

---

## Task 1: Backend Project Scaffolding + Database Schema

**Files:**
- Create: `backend/src/MyStb.Api/MyStb.Api.csproj`
- Create: `backend/src/MyStb.Api/Program.cs`
- Create: `backend/src/MyStb.Api/appsettings.json`
- Create: `backend/src/MyStb.Api/Database/DbInitializer.cs`
- Create: `backend/src/MyStb.Api/Models/Stop.cs`
- Create: `backend/src/MyStb.Api/Models/Route.cs`
- Create: `backend/src/MyStb.Api/Models/RouteStop.cs`
- Create: `backend/src/MyStb.Api/Models/Vehicle.cs`
- Create: `backend/src/MyStb.Api/Models/RouteShape.cs`
- Create: `backend/src/MyStb.Api/Models/ShapePoint.cs`
- Create: `backend/tests/MyStb.Api.Tests/MyStb.Api.Tests.csproj`
- Create: `backend/tests/MyStb.Api.Tests/TestDb.cs`

- [ ] **Step 1: Create the backend solution and project**

```bash
cd backend
dotnet new sln -n MyStb
mkdir -p src/MyStb.Api
cd src/MyStb.Api
dotnet new web -n MyStb.Api --no-https
cd ../..
dotnet sln add src/MyStb.Api/MyStb.Api.csproj
```

- [ ] **Step 2: Add NuGet dependencies**

```bash
cd backend/src/MyStb.Api
dotnet add package Microsoft.Data.Sqlite --version 8.*
dotnet add package Dapper --version 2.*
dotnet add package CsvHelper --version 33.*
```

- [ ] **Step 3: Create the test project**

```bash
cd backend
mkdir -p tests/MyStb.Api.Tests
cd tests/MyStb.Api.Tests
dotnet new xunit -n MyStb.Api.Tests
dotnet add reference ../../src/MyStb.Api/MyStb.Api.csproj
cd ../..
dotnet sln add tests/MyStb.Api.Tests/MyStb.Api.Tests.csproj
```

- [ ] **Step 4: Create model classes**

`backend/src/MyStb.Api/Models/Stop.cs`:
```csharp
namespace MyStb.Api.Models;

public record Stop(string Id, string Name, double Lat, double Lng);
```

`backend/src/MyStb.Api/Models/Route.cs`:
```csharp
namespace MyStb.Api.Models;

public record Route(string Id, string ShortName, string LongName, int Type);
```

`backend/src/MyStb.Api/Models/RouteStop.cs`:
```csharp
namespace MyStb.Api.Models;

public record RouteStop(string RouteId, string StopId, int DirectionId, int StopSequence);
```

`backend/src/MyStb.Api/Models/Vehicle.cs`:
```csharp
namespace MyStb.Api.Models;

public record Vehicle(string Id, string RouteId, double Lat, double Lng, int DirectionId, string? LicensePlate, long Timestamp, long UpdatedAt);
```

`backend/src/MyStb.Api/Models/RouteShape.cs`:
```csharp
namespace MyStb.Api.Models;

public record RouteShape(string RouteId, int DirectionId, string ShapeId);
```

`backend/src/MyStb.Api/Models/ShapePoint.cs`:
```csharp
namespace MyStb.Api.Models;

public record ShapePoint(string ShapeId, double Lat, double Lng, int Sequence);
```

- [ ] **Step 5: Create DbInitializer with schema**

`backend/src/MyStb.Api/Database/DbInitializer.cs`:
```csharp
using System.Data;
using Dapper;

namespace MyStb.Api.Database;

public static class DbInitializer
{
    public static void Initialize(IDbConnection db)
    {
        db.Execute("""
            CREATE TABLE IF NOT EXISTS stops (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS routes (
                id TEXT PRIMARY KEY,
                short_name TEXT NOT NULL,
                long_name TEXT NOT NULL,
                type INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS route_stops (
                route_id TEXT NOT NULL,
                stop_id TEXT NOT NULL,
                direction_id INTEGER NOT NULL,
                stop_sequence INTEGER NOT NULL,
                PRIMARY KEY (route_id, stop_id, direction_id),
                FOREIGN KEY (route_id) REFERENCES routes(id),
                FOREIGN KEY (stop_id) REFERENCES stops(id)
            );

            CREATE TABLE IF NOT EXISTS schedules (
                route_id TEXT NOT NULL,
                stop_id TEXT NOT NULL,
                arrival_time TEXT NOT NULL,
                departure_time TEXT NOT NULL,
                service_id TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS vehicles (
                id TEXT PRIMARY KEY,
                route_id TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                direction_id INTEGER NOT NULL,
                license_plate TEXT,
                timestamp INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS route_shapes (
                route_id TEXT NOT NULL,
                direction_id INTEGER NOT NULL,
                shape_id TEXT NOT NULL,
                PRIMARY KEY (route_id, direction_id)
            );

            CREATE TABLE IF NOT EXISTS shape_points (
                shape_id TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                sequence INTEGER NOT NULL,
                PRIMARY KEY (shape_id, sequence)
            );

            CREATE INDEX IF NOT EXISTS idx_stops_lat_lng ON stops(lat, lng);
            CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
            CREATE INDEX IF NOT EXISTS idx_route_stops_stop ON route_stops(stop_id);
            CREATE INDEX IF NOT EXISTS idx_vehicles_route ON vehicles(route_id);
            CREATE INDEX IF NOT EXISTS idx_schedules_route_stop ON schedules(route_id, stop_id);
            """);
    }
}
```

- [ ] **Step 6: Create appsettings.json**

`backend/src/MyStb.Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "Sqlite": "Data Source=mystb.db"
  },
  "MoBiRo": {
    "BusDataUrl": "https://maps.mo-bi.ro/api/busData",
    "NextArrivalsUrl": "https://maps.mo-bi.ro/api/nextArrivals",
    "PollIntervalSeconds": 30
  },
  "Gtfs": {
    "DownloadUrl": "https://gtfs.tpbi.ro/regional/BUCHAREST-REGION.zip",
    "MaxAgeHours": 168
  },
  "Geocoding": {
    "Provider": "Nominatim",
    "NominatimBaseUrl": "https://nominatim.openstreetmap.org"
  }
}
```

- [ ] **Step 7: Set up Program.cs with DI and DB initialization**

`backend/src/MyStb.Api/Program.cs`:
```csharp
using System.Data;
using Microsoft.Data.Sqlite;
using MyStb.Api.Database;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IDbConnection>(_ =>
{
    var conn = new SqliteConnection(builder.Configuration.GetConnectionString("Sqlite"));
    conn.Open();
    return conn;
});

var app = builder.Build();

// Initialize DB on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
    DbInitializer.Initialize(db);
}

app.MapGet("/health", () => "ok");

app.Run();
```

- [ ] **Step 8: Create test helper for in-memory SQLite**

`backend/tests/MyStb.Api.Tests/TestDb.cs`:
```csharp
using System.Data;
using Microsoft.Data.Sqlite;
using MyStb.Api.Database;

namespace MyStb.Api.Tests;

public static class TestDb
{
    public static IDbConnection Create()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        DbInitializer.Initialize(conn);
        return conn;
    }
}
```

- [ ] **Step 9: Verify it builds and runs**

```bash
cd backend
dotnet build
dotnet run --project src/MyStb.Api &
sleep 2
curl http://localhost:5000/health
# Expected: ok
kill %1
```

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold project with SQLite schema and models"
```

---

## Task 2: GTFS Data Parser

Parses GTFS CSV files from a zip archive into model objects. Pure parsing logic, no DB writes.

**Files:**
- Create: `backend/src/MyStb.Api/Services/GtfsParser.cs`
- Create: `backend/tests/MyStb.Api.Tests/Services/GtfsParserTests.cs`
- Create: `backend/tests/MyStb.Api.Tests/Fixtures/test-gtfs.zip` (generated in test)

- [ ] **Step 1: Write the failing test for stops parsing**

`backend/tests/MyStb.Api.Tests/Services/GtfsParserTests.cs`:
```csharp
using System.IO.Compression;
using System.Text;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class GtfsParserTests
{
    private static Stream CreateTestGtfsZip(Dictionary<string, string> files)
    {
        var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, content) in files)
            {
                var entry = archive.CreateEntry(name);
                using var writer = new StreamWriter(entry.Open(), Encoding.UTF8);
                writer.Write(content);
            }
        }
        ms.Position = 0;
        return ms;
    }

    [Fact]
    public void ParseStops_ReturnsStopsFromCsv()
    {
        var zip = CreateTestGtfsZip(new Dictionary<string, string>
        {
            ["stops.txt"] = "stop_id,stop_name,stop_lat,stop_lon\n1,Piata Unirii,44.4268,26.1025\n2,Universitate,44.4352,26.1004"
        });

        var stops = GtfsParser.ParseStops(zip).ToList();

        Assert.Equal(2, stops.Count);
        Assert.Equal("1", stops[0].Id);
        Assert.Equal("Piata Unirii", stops[0].Name);
        Assert.Equal(44.4268, stops[0].Lat, 4);
        Assert.Equal(26.1025, stops[0].Lng, 4);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
dotnet test --filter "GtfsParserTests.ParseStops_ReturnsStopsFromCsv" -v n
# Expected: FAIL — GtfsParser does not exist
```

- [ ] **Step 3: Implement GtfsParser with stops parsing**

`backend/src/MyStb.Api/Services/GtfsParser.cs`:
```csharp
using System.Globalization;
using System.IO.Compression;
using CsvHelper;
using CsvHelper.Configuration;
using MyStb.Api.Models;

namespace MyStb.Api.Services;

public static class GtfsParser
{
    public static IEnumerable<Stop> ParseStops(Stream zipStream)
    {
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);
        var entry = archive.GetEntry("stops.txt") ?? throw new FileNotFoundException("stops.txt not found in GTFS zip");
        using var reader = new StreamReader(entry.Open());
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
        foreach (var record in csv.GetRecords<dynamic>())
        {
            yield return new Stop(
                (string)record.stop_id,
                (string)record.stop_name,
                double.Parse((string)record.stop_lat, CultureInfo.InvariantCulture),
                double.Parse((string)record.stop_lon, CultureInfo.InvariantCulture)
            );
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend
dotnet test --filter "GtfsParserTests.ParseStops_ReturnsStopsFromCsv" -v n
# Expected: PASS
```

- [ ] **Step 5: Write failing test for routes parsing**

Add to `GtfsParserTests.cs`:
```csharp
[Fact]
public void ParseRoutes_ReturnsRoutesFromCsv()
{
    var zip = CreateTestGtfsZip(new Dictionary<string, string>
    {
        ["routes.txt"] = "route_id,route_short_name,route_long_name,route_type\nr1,381,Berceni - Pipera,3\nr2,1,Depoul Alexandria - Nana,0"
    });

    var routes = GtfsParser.ParseRoutes(zip).ToList();

    Assert.Equal(2, routes.Count);
    Assert.Equal("r1", routes[0].Id);
    Assert.Equal("381", routes[0].ShortName);
    Assert.Equal(3, routes[0].Type);
    Assert.Equal(0, routes[1].Type);
}
```

- [ ] **Step 6: Run test to verify it fails, then implement**

Add to `GtfsParser.cs`:
```csharp
public static IEnumerable<Route> ParseRoutes(Stream zipStream)
{
    using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);
    var entry = archive.GetEntry("routes.txt") ?? throw new FileNotFoundException("routes.txt not found in GTFS zip");
    using var reader = new StreamReader(entry.Open());
    using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
    foreach (var record in csv.GetRecords<dynamic>())
    {
        yield return new Route(
            (string)record.route_id,
            (string)record.route_short_name,
            (string)record.route_long_name,
            int.Parse((string)record.route_type)
        );
    }
}
```

```bash
cd backend
dotnet test --filter "GtfsParserTests.ParseRoutes_ReturnsRoutesFromCsv" -v n
# Expected: PASS
```

- [ ] **Step 7: Write failing test for route stops parsing (via trips + stop_times)**

Add to `GtfsParserTests.cs`:
```csharp
[Fact]
public void ParseRouteStops_JoinsTripsAndStopTimes()
{
    var zip = CreateTestGtfsZip(new Dictionary<string, string>
    {
        ["trips.txt"] = "route_id,service_id,trip_id,direction_id,shape_id\nr1,weekday,t1,0,s1\nr1,weekday,t2,1,s2",
        ["stop_times.txt"] = "trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,08:00:00,08:00:00,stop1,1\nt1,08:05:00,08:05:00,stop2,2\nt2,08:10:00,08:10:00,stop2,1\nt2,08:15:00,08:15:00,stop1,2"
    });

    var routeStops = GtfsParser.ParseRouteStops(zip).ToList();

    Assert.Equal(4, routeStops.Count);
    Assert.Contains(routeStops, rs => rs.RouteId == "r1" && rs.StopId == "stop1" && rs.DirectionId == 0 && rs.StopSequence == 1);
    Assert.Contains(routeStops, rs => rs.RouteId == "r1" && rs.StopId == "stop2" && rs.DirectionId == 1 && rs.StopSequence == 1);
}
```

- [ ] **Step 8: Implement route stops parsing**

Add to `GtfsParser.cs`:
```csharp
public static IEnumerable<RouteStop> ParseRouteStops(Stream zipStream)
{
    using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

    // Build trip_id -> (route_id, direction_id) lookup
    var tripsEntry = archive.GetEntry("trips.txt") ?? throw new FileNotFoundException("trips.txt");
    var tripLookup = new Dictionary<string, (string RouteId, int DirectionId)>();
    using (var reader = new StreamReader(tripsEntry.Open()))
    using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
    {
        foreach (var record in csv.GetRecords<dynamic>())
        {
            string tripId = record.trip_id;
            if (!tripLookup.ContainsKey(tripId))
                tripLookup[tripId] = ((string)record.route_id, int.Parse((string)record.direction_id));
        }
    }

    // Parse stop_times and deduplicate by (route_id, stop_id, direction_id)
    var stopTimesEntry = archive.GetEntry("stop_times.txt") ?? throw new FileNotFoundException("stop_times.txt");
    var seen = new HashSet<(string, string, int)>();
    using var stReader = new StreamReader(stopTimesEntry.Open());
    using var stCsv = new CsvReader(stReader, CultureInfo.InvariantCulture);
    foreach (var record in stCsv.GetRecords<dynamic>())
    {
        string tripId = record.trip_id;
        if (!tripLookup.TryGetValue(tripId, out var trip)) continue;
        string stopId = record.stop_id;
        int seq = int.Parse((string)record.stop_sequence);
        var key = (trip.RouteId, stopId, trip.DirectionId);
        if (seen.Add(key))
            yield return new RouteStop(trip.RouteId, stopId, trip.DirectionId, seq);
    }
}
```

```bash
cd backend
dotnet test --filter "GtfsParserTests.ParseRouteStops_JoinsTripsAndStopTimes" -v n
# Expected: PASS
```

- [ ] **Step 9: Write failing test for shape points parsing**

Add to `GtfsParserTests.cs`:
```csharp
[Fact]
public void ParseShapePoints_ReturnsOrderedPoints()
{
    var zip = CreateTestGtfsZip(new Dictionary<string, string>
    {
        ["shapes.txt"] = "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\ns1,44.42,26.10,1\ns1,44.43,26.11,2\ns2,44.44,26.12,1"
    });

    var points = GtfsParser.ParseShapePoints(zip).ToList();

    Assert.Equal(3, points.Count);
    Assert.Equal("s1", points[0].ShapeId);
    Assert.Equal(1, points[0].Sequence);
    Assert.Equal(44.43, points[1].Lat, 2);
}
```

- [ ] **Step 10: Implement shape points parsing**

Add to `GtfsParser.cs`:
```csharp
public static IEnumerable<ShapePoint> ParseShapePoints(Stream zipStream)
{
    using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);
    var entry = archive.GetEntry("shapes.txt") ?? throw new FileNotFoundException("shapes.txt");
    using var reader = new StreamReader(entry.Open());
    using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
    foreach (var record in csv.GetRecords<dynamic>())
    {
        yield return new ShapePoint(
            (string)record.shape_id,
            double.Parse((string)record.shape_pt_lat, CultureInfo.InvariantCulture),
            double.Parse((string)record.shape_pt_lon, CultureInfo.InvariantCulture),
            int.Parse((string)record.shape_pt_sequence)
        );
    }
}
```

- [ ] **Step 11: Write failing test for route shapes parsing**

Add to `GtfsParserTests.cs`:
```csharp
[Fact]
public void ParseRouteShapes_ExtractsFirstShapePerRouteDirection()
{
    var zip = CreateTestGtfsZip(new Dictionary<string, string>
    {
        ["trips.txt"] = "route_id,service_id,trip_id,direction_id,shape_id\nr1,wd,t1,0,s1\nr1,wd,t2,0,s1\nr1,wd,t3,1,s2"
    });

    var shapes = GtfsParser.ParseRouteShapes(zip).ToList();

    Assert.Equal(2, shapes.Count);
    Assert.Contains(shapes, s => s.RouteId == "r1" && s.DirectionId == 0 && s.ShapeId == "s1");
    Assert.Contains(shapes, s => s.RouteId == "r1" && s.DirectionId == 1 && s.ShapeId == "s2");
}
```

- [ ] **Step 12: Implement route shapes parsing**

Add to `GtfsParser.cs`:
```csharp
public static IEnumerable<RouteShape> ParseRouteShapes(Stream zipStream)
{
    using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);
    var entry = archive.GetEntry("trips.txt") ?? throw new FileNotFoundException("trips.txt");
    var seen = new Dictionary<(string, int), string>();
    using var reader = new StreamReader(entry.Open());
    using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);
    foreach (var record in csv.GetRecords<dynamic>())
    {
        string routeId = record.route_id;
        int directionId = int.Parse((string)record.direction_id);
        string shapeId = record.shape_id;
        var key = (routeId, directionId);
        seen.TryAdd(key, shapeId);
    }
    foreach (var ((routeId, directionId), shapeId) in seen)
        yield return new RouteShape(routeId, directionId, shapeId);
}
```

```bash
cd backend
dotnet test -v n
# Expected: ALL PASS
```

- [ ] **Step 13: Commit**

```bash
git add backend/
git commit -m "feat(backend): add GTFS parser for stops, routes, route_stops, shapes"
```

---

## Task 3: GTFS Loader Service (Demand-Driven)

Downloads the GTFS zip from tpbi.ro and populates the database. Only loads on first user request (if DB is empty) and refreshes when data is stale and a user is active. Does NOT poll on a timer — saves resources when nobody is using the app.

**Files:**
- Create: `backend/src/MyStb.Api/Services/GtfsLoaderService.cs`

- [ ] **Step 1: Implement the demand-driven GTFS loader**

`backend/src/MyStb.Api/Services/GtfsLoaderService.cs`:
```csharp
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
        _http = httpFactory.CreateClient();
    }

    /// <summary>
    /// Ensures GTFS data is loaded and fresh. Call this on user-facing requests.
    /// Returns immediately if data is already loaded and not stale.
    /// </summary>
    public async Task EnsureLoadedAsync(CancellationToken ct = default)
    {
        var maxAgeHours = _config.GetValue("Gtfs:MaxAgeHours", 168);
        if (DateTime.UtcNow - _lastLoaded < TimeSpan.FromHours(maxAgeHours))
            return; // data is fresh

        // Check if DB has data
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
        var count = db.ExecuteScalar<int>("SELECT COUNT(*) FROM stops");
        if (count > 0 && DateTime.UtcNow - _lastLoaded < TimeSpan.FromHours(maxAgeHours))
            return;

        if (!await _lock.WaitAsync(0, ct))
            return; // another load is in progress, let it finish

        try
        {
            // Double-check after acquiring lock
            if (count > 0 && DateTime.UtcNow - _lastLoaded < TimeSpan.FromHours(maxAgeHours))
                return;

            await LoadGtfsData(db, ct);
            _lastLoaded = DateTime.UtcNow;
        }
        finally
        {
            _lock.Release();
        }
    }

    private async Task LoadGtfsData(IDbConnection db, CancellationToken ct)
    {
        var url = _config["Gtfs:DownloadUrl"]!;
        _logger.LogInformation("Downloading GTFS data from {Url}", url);

        try
        {
            var stream = await _http.GetStreamAsync(url, ct);
            var ms = new MemoryStream();
            await stream.CopyToAsync(ms, ct);

            using var tx = db.BeginTransaction();

            db.Execute("DELETE FROM shape_points", transaction: tx);
            db.Execute("DELETE FROM route_shapes", transaction: tx);
            db.Execute("DELETE FROM route_stops", transaction: tx);
            db.Execute("DELETE FROM schedules", transaction: tx);
            db.Execute("DELETE FROM routes", transaction: tx);
            db.Execute("DELETE FROM stops", transaction: tx);

            ms.Position = 0;
            foreach (var stop in GtfsParser.ParseStops(ms))
                db.Execute("INSERT OR IGNORE INTO stops (id, name, lat, lng) VALUES (@Id, @Name, @Lat, @Lng)", stop, tx);

            ms.Position = 0;
            foreach (var route in GtfsParser.ParseRoutes(ms))
                db.Execute("INSERT OR IGNORE INTO routes (id, short_name, long_name, type) VALUES (@Id, @ShortName, @LongName, @Type)", route, tx);

            ms.Position = 0;
            foreach (var rs in GtfsParser.ParseRouteStops(ms))
                db.Execute("INSERT OR IGNORE INTO route_stops (route_id, stop_id, direction_id, stop_sequence) VALUES (@RouteId, @StopId, @DirectionId, @StopSequence)", rs, tx);

            ms.Position = 0;
            foreach (var shape in GtfsParser.ParseRouteShapes(ms))
                db.Execute("INSERT OR IGNORE INTO route_shapes (route_id, direction_id, shape_id) VALUES (@RouteId, @DirectionId, @ShapeId)", shape, tx);

            ms.Position = 0;
            foreach (var pt in GtfsParser.ParseShapePoints(ms))
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
```

- [ ] **Step 2: Register as singleton in Program.cs**

Add to `Program.cs` before `var app = builder.Build();`:
```csharp
using MyStb.Api.Services;

builder.Services.AddHttpClient();
builder.Services.AddSingleton<GtfsLoaderService>();
```

- [ ] **Step 3: Verify it builds**

```bash
cd backend
dotnet build
# Expected: Build succeeded
```

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): add demand-driven GTFS loader service"
```

---

## Task 4: Vehicle Position Poller (Demand-Driven)

Polls mo-bi.ro/api/busData every 30 seconds, but ONLY while users are active. Tracks activity via API heartbeat — starts polling on first request, stops after 2 minutes of inactivity.

**Files:**
- Create: `backend/src/MyStb.Api/Services/VehiclePollerService.cs`

- [ ] **Step 1: Implement the demand-driven vehicle poller**

`backend/src/MyStb.Api/Services/VehiclePollerService.cs`:
```csharp
using System.Data;
using System.Text.Json;
using Dapper;

namespace MyStb.Api.Services;

public class VehiclePollerService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<VehiclePollerService> _logger;
    private readonly HttpClient _http;
    private DateTime _lastActivity = DateTime.MinValue;
    private static readonly TimeSpan IdleTimeout = TimeSpan.FromMinutes(2);

    public VehiclePollerService(IServiceProvider services, IConfiguration config, ILogger<VehiclePollerService> logger, IHttpClientFactory httpFactory)
    {
        _services = services;
        _config = config;
        _logger = logger;
        _http = httpFactory.CreateClient();
    }

    /// <summary>
    /// Call this from API endpoints to signal that a user is active.
    /// The poller will start/continue polling mo-bi.ro while users are active.
    /// </summary>
    public void Touch() => _lastActivity = DateTime.UtcNow;

    public bool IsActive => DateTime.UtcNow - _lastActivity < IdleTimeout;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var intervalSec = _config.GetValue("MoBiRo:PollIntervalSeconds", 30);

        while (!ct.IsCancellationRequested)
        {
            if (IsActive)
            {
                await PollVehicles(ct);
            }
            else
            {
                _logger.LogDebug("No active users, skipping vehicle poll");
            }

            try { await Task.Delay(TimeSpan.FromSeconds(intervalSec), ct); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task PollVehicles(CancellationToken ct)
    {
        var url = _config["MoBiRo:BusDataUrl"]!;
        try
        {
            var json = await _http.GetStringAsync(url, ct);
            var vehicles = JsonSerializer.Deserialize<JsonElement[]>(json);
            if (vehicles is null) return;

            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();

            foreach (var v in vehicles)
            {
                var vehicle = v.GetProperty("vehicle");
                var trip = vehicle.GetProperty("trip");
                var pos = vehicle.GetProperty("position");
                var veh = vehicle.GetProperty("vehicle");

                var id = v.GetProperty("id").GetString()!;
                var routeId = trip.GetProperty("routeId").GetString() ?? "";
                var lat = pos.GetProperty("latitude").GetDouble();
                var lng = pos.GetProperty("longitude").GetDouble();
                var directionId = trip.GetProperty("directionId").GetInt32();
                var licensePlate = veh.TryGetProperty("licensePlate", out var lp) ? lp.GetString() : null;
                var timestamp = vehicle.GetProperty("timestamp").GetInt64();

                db.Execute("""
                    INSERT INTO vehicles (id, route_id, lat, lng, direction_id, license_plate, timestamp, updated_at)
                    VALUES (@id, @routeId, @lat, @lng, @directionId, @licensePlate, @timestamp, @now)
                    ON CONFLICT(id) DO UPDATE SET
                        route_id = @routeId, lat = @lat, lng = @lng,
                        direction_id = @directionId, license_plate = @licensePlate,
                        timestamp = @timestamp, updated_at = @now
                    """, new { id, routeId, lat, lng, directionId, licensePlate, timestamp, now });
            }

            _logger.LogDebug("Polled {Count} vehicles", vehicles.Length);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to poll vehicle data");
        }
    }
}
```

- [ ] **Step 2: Register in Program.cs**

Add after the GtfsLoaderService registration:
```csharp
builder.Services.AddSingleton<VehiclePollerService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<VehiclePollerService>());
```

- [ ] **Step 3: Add activity middleware to Program.cs**

Add after `app.UseCors();` (added in Task 9) to touch the poller + ensure GTFS on every API request:
```csharp
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api"))
    {
        ctx.RequestServices.GetRequiredService<VehiclePollerService>().Touch();
        await ctx.RequestServices.GetRequiredService<GtfsLoaderService>().EnsureLoadedAsync(ctx.RequestAborted);
    }
    await next();
});
```

- [ ] **Step 4: Verify it builds**

```bash
cd backend
dotnet build
# Expected: Build succeeded
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): add demand-driven vehicle poller (active only while users connected)"
```

---

## Task 5: GeoUtils + Nearby Stops Endpoint

Haversine distance calculation and the `/api/stops/nearby` endpoint.

**Files:**
- Create: `backend/src/MyStb.Api/Services/GeoUtils.cs`
- Create: `backend/src/MyStb.Api/Endpoints/StopEndpoints.cs`
- Create: `backend/tests/MyStb.Api.Tests/Services/GeoUtilsTests.cs`

- [ ] **Step 1: Write failing test for Haversine distance**

`backend/tests/MyStb.Api.Tests/Services/GeoUtilsTests.cs`:
```csharp
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class GeoUtilsTests
{
    [Fact]
    public void HaversineMeters_ReturnsCorrectDistance()
    {
        // Piata Unirii to Universitate — roughly 950m
        var distance = GeoUtils.HaversineMeters(44.4268, 26.1025, 44.4352, 26.1004);
        Assert.InRange(distance, 900, 1000);
    }

    [Fact]
    public void HaversineMeters_SamePoint_ReturnsZero()
    {
        var distance = GeoUtils.HaversineMeters(44.4268, 26.1025, 44.4268, 26.1025);
        Assert.Equal(0, distance, 1);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
dotnet test --filter "GeoUtilsTests" -v n
# Expected: FAIL — GeoUtils does not exist
```

- [ ] **Step 3: Implement GeoUtils**

`backend/src/MyStb.Api/Services/GeoUtils.cs`:
```csharp
namespace MyStb.Api.Services;

public static class GeoUtils
{
    private const double EarthRadiusMeters = 6_371_000;

    public static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusMeters * c;
    }

    /// <summary>
    /// Returns a bounding box (minLat, maxLat, minLng, maxLng) for a given center and radius in meters.
    /// Used for fast SQL pre-filtering before exact Haversine.
    /// </summary>
    public static (double MinLat, double MaxLat, double MinLng, double MaxLng) BoundingBox(double lat, double lng, double radiusMeters)
    {
        var dLat = radiusMeters / EarthRadiusMeters * (180.0 / Math.PI);
        var dLng = dLat / Math.Cos(ToRad(lat));
        return (lat - dLat, lat + dLat, lng - dLng, lng + dLng);
    }

    private static double ToRad(double deg) => deg * Math.PI / 180.0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend
dotnet test --filter "GeoUtilsTests" -v n
# Expected: ALL PASS
```

- [ ] **Step 5: Implement nearby stops endpoint**

`backend/src/MyStb.Api/Endpoints/StopEndpoints.cs`:
```csharp
using System.Data;
using Dapper;
using MyStb.Api.Models;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class StopEndpoints
{
    public static void MapStopEndpoints(this WebApplication app)
    {
        app.MapGet("/api/stops/nearby", (double lat, double lng, double radius, IDbConnection db) =>
        {
            if (radius <= 0 || radius > 5000) radius = 500;

            var (minLat, maxLat, minLng, maxLng) = GeoUtils.BoundingBox(lat, lng, radius);

            var candidates = db.Query<Stop>(
                "SELECT id as Id, name as Name, lat as Lat, lng as Lng FROM stops WHERE lat BETWEEN @minLat AND @maxLat AND lng BETWEEN @minLng AND @maxLng",
                new { minLat, maxLat, minLng, maxLng });

            var results = candidates
                .Select(s => new { Stop = s, Distance = GeoUtils.HaversineMeters(lat, lng, s.Lat, s.Lng) })
                .Where(x => x.Distance <= radius)
                .OrderBy(x => x.Distance)
                .Select(x => new { x.Stop.Id, x.Stop.Name, x.Stop.Lat, x.Stop.Lng, Distance = Math.Round(x.Distance) });

            return Results.Ok(results);
        });
    }
}
```

- [ ] **Step 6: Register in Program.cs**

Add after `app.MapGet("/health", ...)`:
```csharp
using MyStb.Api.Endpoints;

app.MapStopEndpoints();
```

- [ ] **Step 7: Verify it builds**

```bash
cd backend
dotnet build
# Expected: Build succeeded
```

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat(backend): add GeoUtils and nearby stops endpoint"
```

---

## Task 6: Route Calculator Service

Core logic: given origin and destination coords, find direct routes serving both areas, estimate ETAs from live vehicle data.

**Files:**
- Create: `backend/src/MyStb.Api/Services/RouteCalculatorService.cs`
- Create: `backend/src/MyStb.Api/Models/RouteOption.cs`
- Create: `backend/tests/MyStb.Api.Tests/Services/RouteCalculatorTests.cs`

- [ ] **Step 1: Create the RouteOption response model**

`backend/src/MyStb.Api/Models/RouteOption.cs`:
```csharp
namespace MyStb.Api.Models;

public record RouteOption(
    string RouteId,
    string ShortName,
    int RouteType,
    string Direction,
    int DirectionId,
    string OriginStopId,
    string OriginStopName,
    double OriginStopDistance,
    string DestStopId,
    string DestStopName,
    double DestStopDistance,
    double LastMileDistance,
    int StopCount,
    int? EstimatedMinutes,
    List<double[]>? ShapeCoords
);
```

- [ ] **Step 2: Write the failing test**

`backend/tests/MyStb.Api.Tests/Services/RouteCalculatorTests.cs`:
```csharp
using System.Data;
using Dapper;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class RouteCalculatorTests
{
    private IDbConnection SetupDb()
    {
        var db = TestDb.Create();
        // Insert test stops along a line
        db.Execute("INSERT INTO stops VALUES ('s1','Stop A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Stop B',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Stop C',44.4340,26.1040)");
        db.Execute("INSERT INTO stops VALUES ('s4','Stop D',44.4360,26.1060)");
        // Route r1 serves s1->s2->s3->s4 in direction 0
        db.Execute("INSERT INTO routes VALUES ('r1','100','Test Line',3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',0,2)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s3',0,3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s4',0,4)");
        // A vehicle on route r1 near stop s1
        db.Execute("INSERT INTO vehicles VALUES ('v1','r1',44.4295,26.0995,0,'B-01-AAA',0,0)");
        return db;
    }

    [Fact]
    public void FindRoutes_ReturnsDirectRoute()
    {
        var db = SetupDb();
        var calc = new RouteCalculatorService();

        // Origin near s1, destination near s4
        var results = calc.FindDirectRoutes(db, 44.4302, 26.1002, 44.4358, 26.1058, 500);

        Assert.Single(results);
        var r = results[0];
        Assert.Equal("r1", r.RouteId);
        Assert.Equal("100", r.ShortName);
        Assert.Equal("s1", r.OriginStopId);
        Assert.Equal("s4", r.DestStopId);
        Assert.Equal(3, r.StopCount);
    }

    [Fact]
    public void FindRoutes_RespectsDirection()
    {
        var db = SetupDb();
        var calc = new RouteCalculatorService();

        // Origin near s4, destination near s1 — direction 0 goes s1->s4, not s4->s1
        var results = calc.FindDirectRoutes(db, 44.4358, 26.1058, 44.4302, 26.1002, 500);

        Assert.Empty(results); // No route in direction 0 from s4 to s1
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend
dotnet test --filter "RouteCalculatorTests" -v n
# Expected: FAIL — RouteCalculatorService does not exist
```

- [ ] **Step 4: Implement RouteCalculatorService**

`backend/src/MyStb.Api/Services/RouteCalculatorService.cs`:
```csharp
using System.Data;
using Dapper;
using MyStb.Api.Models;

namespace MyStb.Api.Services;

public class RouteCalculatorService
{
    public List<RouteOption> FindDirectRoutes(IDbConnection db, double fromLat, double fromLng, double toLat, double toLng, double radiusMeters = 500)
    {
        // 1. Find nearby stops for origin
        var originStops = FindNearbyStops(db, fromLat, fromLng, radiusMeters);
        if (originStops.Count == 0) return [];

        // 2. Find nearby stops for destination
        var destStops = FindNearbyStops(db, toLat, toLng, radiusMeters);
        if (destStops.Count == 0) return [];

        var originStopIds = originStops.Select(s => s.Id).ToHashSet();
        var destStopIds = destStops.Select(s => s.Id).ToHashSet();

        // 3. Find routes that serve both origin and destination stops in the right direction
        var allRouteStops = db.Query<RouteStopRow>(
            "SELECT rs.route_id, rs.stop_id, rs.direction_id, rs.stop_sequence, r.short_name, r.long_name, r.type as route_type " +
            "FROM route_stops rs JOIN routes r ON r.id = rs.route_id " +
            "WHERE rs.stop_id IN @originIds OR rs.stop_id IN @destIds",
            new { originIds = originStopIds.ToArray(), destIds = destStopIds.ToArray() });

        // Group by (route_id, direction_id)
        var grouped = allRouteStops.GroupBy(rs => (rs.route_id, rs.direction_id));

        var results = new List<RouteOption>();

        foreach (var group in grouped)
        {
            var stops = group.ToList();
            var originMatches = stops.Where(s => originStopIds.Contains(s.stop_id)).ToList();
            var destMatches = stops.Where(s => destStopIds.Contains(s.stop_id)).ToList();

            if (originMatches.Count == 0 || destMatches.Count == 0) continue;

            // Pick the best origin stop (closest to user) that comes BEFORE the best dest stop in sequence
            foreach (var origin in originMatches.OrderBy(o => originStops.First(s => s.Id == o.stop_id).Distance))
            {
                var validDests = destMatches
                    .Where(d => d.stop_sequence > origin.stop_sequence)
                    .OrderBy(d => destStops.First(s => s.Id == d.stop_id).Distance)
                    .ToList();

                if (validDests.Count == 0) continue;

                var dest = validDests[0];
                var originStop = originStops.First(s => s.Id == origin.stop_id);
                var destStop = destStops.First(s => s.Id == dest.stop_id);
                var lastMile = GeoUtils.HaversineMeters(destStop.Lat, destStop.Lng, toLat, toLng);

                // Estimate ETA from nearest vehicle
                int? estimatedMinutes = EstimateEta(db, origin.route_id, origin.direction_id, origin.stop_sequence);

                // Get shape coords
                var shapeCoords = GetShapeCoords(db, origin.route_id, origin.direction_id);

                results.Add(new RouteOption(
                    RouteId: origin.route_id,
                    ShortName: origin.short_name,
                    RouteType: origin.route_type,
                    Direction: origin.long_name,
                    DirectionId: origin.direction_id,
                    OriginStopId: origin.stop_id,
                    OriginStopName: originStop.Name,
                    OriginStopDistance: Math.Round(originStop.Distance),
                    DestStopId: dest.stop_id,
                    DestStopName: destStop.Name,
                    DestStopDistance: Math.Round(destStop.Distance),
                    LastMileDistance: Math.Round(lastMile),
                    StopCount: dest.stop_sequence - origin.stop_sequence,
                    EstimatedMinutes: estimatedMinutes,
                    ShapeCoords: shapeCoords
                ));

                break; // One result per route+direction
            }
        }

        return results.OrderBy(r => r.EstimatedMinutes ?? int.MaxValue).ThenBy(r => r.OriginStopDistance).ToList();
    }

    private List<NearbyStop> FindNearbyStops(IDbConnection db, double lat, double lng, double radiusMeters)
    {
        var (minLat, maxLat, minLng, maxLng) = GeoUtils.BoundingBox(lat, lng, radiusMeters);
        var candidates = db.Query<StopRow>(
            "SELECT id, name, lat, lng FROM stops WHERE lat BETWEEN @minLat AND @maxLat AND lng BETWEEN @minLng AND @maxLng",
            new { minLat, maxLat, minLng, maxLng });

        return candidates
            .Select(s => new NearbyStop(s.id, s.name, s.lat, s.lng, GeoUtils.HaversineMeters(lat, lng, s.lat, s.lng)))
            .Where(s => s.Distance <= radiusMeters)
            .OrderBy(s => s.Distance)
            .ToList();
    }

    private int? EstimateEta(IDbConnection db, string routeId, int directionId, int originSequence)
    {
        // Simple estimate: find nearest vehicle on this route+direction that hasn't passed the origin stop yet
        // This is a rough approximation — assumes ~2 min per stop
        var vehicles = db.Query<VehicleRow>(
            "SELECT id, lat, lng FROM vehicles WHERE route_id = @routeId AND direction_id = @directionId",
            new { routeId, directionId }).ToList();

        if (vehicles.Count == 0) return null;

        // For now, return a rough estimate based on number of active vehicles
        // A better version would calculate position relative to stops along the route
        return 5; // placeholder — refined in integration
    }

    private List<double[]>? GetShapeCoords(IDbConnection db, string routeId, int directionId)
    {
        var shapeId = db.QueryFirstOrDefault<string>(
            "SELECT shape_id FROM route_shapes WHERE route_id = @routeId AND direction_id = @directionId",
            new { routeId, directionId });

        if (shapeId is null) return null;

        return db.Query<ShapeRow>(
            "SELECT lat, lng FROM shape_points WHERE shape_id = @shapeId ORDER BY sequence",
            new { shapeId })
            .Select(s => new[] { s.lat, s.lng })
            .ToList();
    }

    private record NearbyStop(string Id, string Name, double Lat, double Lng, double Distance);
    private record StopRow(string id, string name, double lat, double lng);
    private record VehicleRow(string id, double lat, double lng);
    private record ShapeRow(double lat, double lng);
    private record RouteStopRow(string route_id, string stop_id, int direction_id, int stop_sequence, string short_name, string long_name, int route_type);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend
dotnet test --filter "RouteCalculatorTests" -v n
# Expected: ALL PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): add route calculator with direction-aware matching"
```

---

## Task 7: Route Finding + Vehicle Positions Endpoints

**Files:**
- Create: `backend/src/MyStb.Api/Endpoints/RouteEndpoints.cs`
- Create: `backend/src/MyStb.Api/Endpoints/VehicleEndpoints.cs`

- [ ] **Step 1: Implement route finding endpoint**

`backend/src/MyStb.Api/Endpoints/RouteEndpoints.cs`:
```csharp
using System.Data;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class RouteEndpoints
{
    public static void MapRouteEndpoints(this WebApplication app)
    {
        app.MapGet("/api/routes", (double fromLat, double fromLng, double toLat, double toLng, double? radius, IDbConnection db) =>
        {
            var calc = new RouteCalculatorService();
            var results = calc.FindDirectRoutes(db, fromLat, fromLng, toLat, toLng, radius ?? 500);
            return Results.Ok(results);
        });
    }
}
```

- [ ] **Step 2: Implement vehicle positions endpoint**

`backend/src/MyStb.Api/Endpoints/VehicleEndpoints.cs`:
```csharp
using System.Data;
using Dapper;

namespace MyStb.Api.Endpoints;

public static class VehicleEndpoints
{
    public static void MapVehicleEndpoints(this WebApplication app)
    {
        app.MapGet("/api/vehicles", (string routeId, IDbConnection db) =>
        {
            var vehicles = db.Query(
                "SELECT id, route_id as routeId, lat, lng, direction_id as directionId, license_plate as licensePlate, timestamp, updated_at as updatedAt FROM vehicles WHERE route_id = @routeId",
                new { routeId });
            return Results.Ok(vehicles);
        });
    }
}
```

- [ ] **Step 3: Register both in Program.cs**

Add after `app.MapStopEndpoints();`:
```csharp
app.MapRouteEndpoints();
app.MapVehicleEndpoints();
```

- [ ] **Step 4: Verify it builds**

```bash
cd backend
dotnet build
# Expected: Build succeeded
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): add route finding and vehicle positions endpoints"
```

---

## Task 8: Geocoding Abstraction + Nominatim + Search Endpoint

**Files:**
- Create: `backend/src/MyStb.Api/Services/IGeocodingProvider.cs`
- Create: `backend/src/MyStb.Api/Services/NominatimProvider.cs`
- Create: `backend/src/MyStb.Api/Endpoints/SearchEndpoints.cs`

- [ ] **Step 1: Define the geocoding interface**

`backend/src/MyStb.Api/Services/IGeocodingProvider.cs`:
```csharp
namespace MyStb.Api.Services;

public interface IGeocodingProvider
{
    Task<List<GeocodingResult>> SearchAsync(string query, CancellationToken ct = default);
}

public record GeocodingResult(string DisplayName, double Lat, double Lng, string? Type);
```

- [ ] **Step 2: Implement Nominatim provider**

`backend/src/MyStb.Api/Services/NominatimProvider.cs`:
```csharp
using System.Text.Json;

namespace MyStb.Api.Services;

public class NominatimProvider : IGeocodingProvider
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;

    public NominatimProvider(HttpClient http, string baseUrl)
    {
        _http = http;
        _baseUrl = baseUrl;
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("MyStb/1.0");
    }

    public async Task<List<GeocodingResult>> SearchAsync(string query, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/search?q={Uri.EscapeDataString(query)}&format=json&limit=10&viewbox=25.9,44.55,26.3,44.33&bounded=1";
        var json = await _http.GetStringAsync(url, ct);
        var results = JsonSerializer.Deserialize<JsonElement[]>(json);
        if (results is null) return [];

        return results.Select(r => new GeocodingResult(
            r.GetProperty("display_name").GetString()!,
            double.Parse(r.GetProperty("lat").GetString()!),
            double.Parse(r.GetProperty("lon").GetString()!),
            r.TryGetProperty("type", out var t) ? t.GetString() : null
        )).ToList();
    }
}
```

- [ ] **Step 3: Implement search endpoint**

`backend/src/MyStb.Api/Endpoints/SearchEndpoints.cs`:
```csharp
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this WebApplication app)
    {
        app.MapGet("/api/search", async (string q, IGeocodingProvider geocoding, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q)) return Results.BadRequest("Query required");
            var results = await geocoding.SearchAsync(q, ct);
            return Results.Ok(results);
        });
    }
}
```

- [ ] **Step 4: Register in Program.cs**

Add to service registration:
```csharp
builder.Services.AddSingleton<IGeocodingProvider>(sp =>
{
    var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient();
    var baseUrl = builder.Configuration["Geocoding:NominatimBaseUrl"]!;
    return new NominatimProvider(http, baseUrl);
});
```

Add to endpoint mapping:
```csharp
app.MapSearchEndpoints();
```

- [ ] **Step 5: Verify it builds**

```bash
cd backend
dotnet build
# Expected: Build succeeded
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat(backend): add geocoding abstraction with Nominatim provider"
```

---

## Task 9: CORS Setup

**Files:**
- Modify: `backend/src/MyStb.Api/Program.cs`

- [ ] **Step 1: Add CORS for frontend**

Add to `Program.cs` before `var app = builder.Build();`:
```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});
```

Add after `var app = builder.Build();` (before endpoint mappings):
```csharp
app.UseCors();
```

- [ ] **Step 2: Run all backend tests**

```bash
cd backend
dotnet test -v n
# Expected: ALL PASS
```

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "feat(backend): add CORS support for frontend"
```

---

## Task 10: Frontend Scaffolding + Leaflet Map + Geolocation

**Files:**
- Create: `frontend/package.json` (via vite create)
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/App.css`
- Create: `frontend/src/components/Map.tsx`
- Create: `frontend/src/hooks/useGeolocation.ts`
- Create: `frontend/src/types/index.ts`

- [ ] **Step 1: Scaffold the Vite + React + TypeScript project**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

- [ ] **Step 2: Create shared types**

`frontend/src/types/index.ts`:
```typescript
export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance?: number;
}

export interface RouteOption {
  routeId: string;
  shortName: string;
  routeType: number;
  direction: string;
  directionId: number;
  originStopId: string;
  originStopName: string;
  originStopDistance: number;
  destStopId: string;
  destStopName: string;
  destStopDistance: number;
  lastMileDistance: number;
  stopCount: number;
  estimatedMinutes: number | null;
  shapeCoords: [number, number][] | null;
}

export interface Vehicle {
  id: string;
  routeId: string;
  lat: number;
  lng: number;
  directionId: number;
  licensePlate: string | null;
  timestamp: number;
  updatedAt: number;
}

export interface Favourite {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lng: number;
  type: string | null;
}

export type RouteTypeLabel = 'bus' | 'tram' | 'trolley' | 'metro';

export function routeTypeLabel(type: number): RouteTypeLabel {
  switch (type) {
    case 0: return 'tram';
    case 1: return 'metro';
    case 11: return 'trolley';
    default: return 'bus';
  }
}
```

- [ ] **Step 3: Create geolocation hook**

`frontend/src/hooks/useGeolocation.ts`:
```typescript
import { useState, useEffect } from 'react';

interface Position {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { position, error };
}
```

- [ ] **Step 4: Create Map component**

`frontend/src/components/Map.tsx`:
```typescript
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Leaflet + bundlers issue)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BUCHAREST_CENTER: [number, number] = [44.4268, 26.1025];

interface MapProps {
  userPosition: { lat: number; lng: number } | null;
  children?: React.ReactNode;
}

function RecenterMap({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

export function Map({ userPosition, children }: MapProps) {
  const center = userPosition ? [userPosition.lat, userPosition.lng] as [number, number] : BUCHAREST_CENTER;

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap position={userPosition ? [userPosition.lat, userPosition.lng] : null} />
      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]}>
          <Popup>You are here</Popup>
        </Marker>
      )}
      {children}
    </MapContainer>
  );
}
```

- [ ] **Step 5: Set up App.tsx**

`frontend/src/App.tsx`:
```typescript
import { useState } from 'react';
import { Map } from './components/Map';
import { useGeolocation } from './hooks/useGeolocation';
import type { RouteOption } from './types';
import './App.css';

export default function App() {
  const { position } = useGeolocation();
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);

  return (
    <div className="app">
      <div className="map-container">
        <Map userPosition={position} />
      </div>
    </div>
  );
}
```

`frontend/src/App.css`:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }

.app {
  height: 100dvh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  position: relative;
}

.map-container {
  flex: 1;
  position: relative;
}
```

- [ ] **Step 6: Run the dev server and verify map loads**

```bash
cd frontend
npm run dev
# Open http://localhost:5173 — should see Bucharest map, blue marker at your location (or center of Bucharest)
```

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold React app with Leaflet map and geolocation"
```

---

## Task 11: API Client

**Files:**
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: Create the API client**

`frontend/src/api/client.ts`:
```typescript
import type { RouteOption, Vehicle, Favourite, GeocodingResult } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  searchRoutes(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteOption[]> {
    return get(`/api/routes?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`);
  },

  getVehicles(routeId: string): Promise<Vehicle[]> {
    return get(`/api/vehicles?routeId=${routeId}`);
  },

  searchPlaces(query: string): Promise<GeocodingResult[]> {
    return get(`/api/search?q=${encodeURIComponent(query)}`);
  },

};
```

- [ ] **Step 2: Create a `.env` file for local dev**

`frontend/.env`:
```
VITE_API_URL=http://localhost:5000
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/ frontend/.env
git commit -m "feat(frontend): add API client for backend communication"
```

---

## Task 12: Bottom Sheet + Search Bar

**Files:**
- Create: `frontend/src/components/BottomSheet.tsx`
- Create: `frontend/src/components/SearchBar.tsx`
- Create: `frontend/src/components/FavouriteChips.tsx`
- Create: `frontend/src/hooks/useSearch.ts`
- Create: `frontend/src/hooks/useFavourites.ts`

- [ ] **Step 1: Create the search hook**

`frontend/src/hooks/useSearch.ts`:
```typescript
import { useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { GeocodingResult } from '../types';

export function useSearch() {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchPlaces(query);
        setResults(res);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, search, clear };
}
```

- [ ] **Step 2: Create the favourites hook (localStorage)**

`frontend/src/hooks/useFavourites.ts`:
```typescript
import { useState, useCallback } from 'react';
import type { Favourite } from '../types';

const STORAGE_KEY = 'mystb-favourites';

function loadFavourites(): Favourite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFavourites(favs: Favourite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<Favourite[]>(loadFavourites);

  const add = useCallback((name: string, lat: number, lng: number) => {
    setFavourites(prev => {
      const next = [...prev, { id: crypto.randomUUID(), name, lat, lng }];
      saveFavourites(next);
      return next;
    });
  }, []);

  const update = useCallback((id: string, name: string, lat: number, lng: number) => {
    setFavourites(prev => {
      const next = prev.map(f => f.id === id ? { ...f, name, lat, lng } : f);
      saveFavourites(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setFavourites(prev => {
      const next = prev.filter(f => f.id !== id);
      saveFavourites(next);
      return next;
    });
  }, []);

  return { favourites, add, update, remove };
}
```

- [ ] **Step 3: Create SearchBar component**

`frontend/src/components/SearchBar.tsx`:
```typescript
import { useState } from 'react';
import { useSearch } from '../hooks/useSearch';
import type { GeocodingResult } from '../types';

interface SearchBarProps {
  onSelect: (result: GeocodingResult) => void;
}

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const { results, loading, search, clear } = useSearch();

  const handleChange = (value: string) => {
    setQuery(value);
    search(value);
  };

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.displayName.split(',')[0]);
    clear();
    onSelect(result);
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Where to?"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />
      {loading && <span className="search-loading">...</span>}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((r, i) => (
            <li key={i} onClick={() => handleSelect(r)}>
              {r.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create FavouriteChips component**

`frontend/src/components/FavouriteChips.tsx`:
```typescript
import type { Favourite } from '../types';

interface FavouriteChipsProps {
  favourites: Favourite[];
  onSelect: (fav: Favourite) => void;
}

export function FavouriteChips({ favourites, onSelect }: FavouriteChipsProps) {
  if (favourites.length === 0) return null;

  return (
    <div className="favourite-chips">
      {favourites.map((fav) => (
        <button key={fav.id} className="chip" onClick={() => onSelect(fav)}>
          {fav.name}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create BottomSheet component**

`frontend/src/components/BottomSheet.tsx`:
```typescript
import { ReactNode } from 'react';

interface BottomSheetProps {
  children: ReactNode;
}

export function BottomSheet({ children }: BottomSheetProps) {
  return (
    <div className="bottom-sheet">
      <div className="bottom-sheet-handle" />
      <div className="bottom-sheet-content">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add CSS for bottom sheet and search**

Append to `frontend/src/App.css`:
```css
.bottom-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.15);
  max-height: 60vh;
  overflow-y: auto;
  z-index: 1000;
}

.bottom-sheet-handle {
  width: 40px;
  height: 4px;
  background: #ccc;
  border-radius: 2px;
  margin: 8px auto;
}

.bottom-sheet-content {
  padding: 0 16px 16px;
}

.search-bar {
  position: relative;
  margin-bottom: 12px;
}

.search-bar input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
}

.search-bar input:focus {
  border-color: #3498db;
}

.search-loading {
  position: absolute;
  right: 12px;
  top: 12px;
  color: #999;
}

.search-results {
  list-style: none;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.search-results li {
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.search-results li:last-child {
  border-bottom: none;
}

.search-results li:active {
  background: #f0f0f0;
}

.favourite-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.chip {
  padding: 6px 14px;
  background: #e8f4fd;
  border: 1px solid #3498db;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  color: #2980b9;
}

.chip:active {
  background: #3498db;
  color: #fff;
}
```

- [ ] **Step 7: Wire into App.tsx**

Update `frontend/src/App.tsx`:
```typescript
import { useState } from 'react';
import { Map } from './components/Map';
import { BottomSheet } from './components/BottomSheet';
import { SearchBar } from './components/SearchBar';
import { FavouriteChips } from './components/FavouriteChips';
import { useGeolocation } from './hooks/useGeolocation';
import { useFavourites } from './hooks/useFavourites';
import type { RouteOption, GeocodingResult } from './types';
import './App.css';

export default function App() {
  const { position } = useGeolocation();
  const { favourites } = useFavourites();
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);

  const handleSearchSelect = (result: GeocodingResult) => {
    setDestination({ lat: result.lat, lng: result.lng, name: result.displayName.split(',')[0] });
  };

  const handleFavouriteSelect = (fav: { lat: number; lng: number; name: string }) => {
    setDestination({ lat: fav.lat, lng: fav.lng, name: fav.name });
  };

  return (
    <div className="app">
      <div className="map-container">
        <Map userPosition={position} />
      </div>
      <BottomSheet>
        <SearchBar onSelect={handleSearchSelect} />
        <FavouriteChips favourites={favourites} onSelect={handleFavouriteSelect} />
      </BottomSheet>
    </div>
  );
}
```

- [ ] **Step 8: Verify the UI in browser**

```bash
cd frontend
npm run dev
# Open http://localhost:5173 — map with bottom sheet, search bar, favourite chips visible
```

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add bottom sheet, search bar, and favourite chips"
```

---

## Task 13: Route Search + Results Display

**Files:**
- Create: `frontend/src/hooks/useRoutes.ts`
- Create: `frontend/src/components/RouteCard.tsx`
- Create: `frontend/src/components/RouteResults.tsx`

- [ ] **Step 1: Create the routes hook**

`frontend/src/hooks/useRoutes.ts`:
```typescript
import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { RouteOption } from '../types';

export function useRoutes() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    setLoading(true);
    try {
      setRoutes(await api.searchRoutes(fromLat, fromLng, toLat, toLng));
    } catch { setRoutes([]); }
    finally { setLoading(false); }
  }, []);

  const clear = useCallback(() => setRoutes([]), []);

  return { routes, loading, search, clear };
}
```

- [ ] **Step 2: Create RouteCard component**

`frontend/src/components/RouteCard.tsx`:
```typescript
import type { RouteOption } from '../types';
import { routeTypeLabel } from '../types';

interface RouteCardProps {
  route: RouteOption;
  onSelect: (route: RouteOption) => void;
}

const typeColors: Record<string, string> = {
  bus: '#3498db',
  tram: '#e74c3c',
  trolley: '#2ecc71',
  metro: '#f39c12',
};

export function RouteCard({ route, onSelect }: RouteCardProps) {
  const label = routeTypeLabel(route.routeType);
  const color = typeColors[label] || '#3498db';

  return (
    <div className="route-card" onClick={() => onSelect(route)}>
      <div className="route-card-badge" style={{ background: color }}>
        <span className="route-card-line">{route.shortName}</span>
        <span className="route-card-type">{label}</span>
      </div>
      <div className="route-card-info">
        <div className="route-card-direction">{route.direction}</div>
        <div className="route-card-details">
          <span>{route.originStopName} → {route.destStopName}</span>
          <span>{route.stopCount} stops</span>
        </div>
        <div className="route-card-meta">
          <span>Walk {route.originStopDistance}m to stop</span>
          {route.lastMileDistance > 0 && <span> · {route.lastMileDistance}m to destination</span>}
          {route.estimatedMinutes && <span> · ~{route.estimatedMinutes} min</span>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create RouteResults component**

`frontend/src/components/RouteResults.tsx`:
```typescript
import type { RouteOption } from '../types';
import { RouteCard } from './RouteCard';

interface RouteResultsProps {
  routes: RouteOption[];
  loading: boolean;
  onSelect: (route: RouteOption) => void;
}

export function RouteResults({ routes, loading, onSelect }: RouteResultsProps) {
  if (loading) return <div className="route-results-loading">Finding routes...</div>;
  if (routes.length === 0) return null;

  return (
    <div className="route-results">
      <h3>{routes.length} route{routes.length > 1 ? 's' : ''} found</h3>
      {routes.map((r) => (
        <RouteCard key={`${r.routeId}-${r.directionId}`} route={r} onSelect={onSelect} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Add CSS for route cards**

Append to `frontend/src/App.css`:
```css
.route-results h3 {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.route-results-loading {
  text-align: center;
  color: #999;
  padding: 16px;
}

.route-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

.route-card:active {
  background: #f8f8f8;
}

.route-card-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  padding: 8px;
  border-radius: 8px;
  color: #fff;
}

.route-card-line {
  font-size: 18px;
  font-weight: bold;
}

.route-card-type {
  font-size: 10px;
  text-transform: uppercase;
}

.route-card-info {
  flex: 1;
  min-width: 0;
}

.route-card-direction {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.route-card-details {
  font-size: 13px;
  color: #555;
  display: flex;
  justify-content: space-between;
}

.route-card-meta {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
```

- [ ] **Step 5: Wire route search into App.tsx**

Update `App.tsx` — add the route search trigger when destination is set:
```typescript
import { useState, useEffect } from 'react';
import { Map } from './components/Map';
import { BottomSheet } from './components/BottomSheet';
import { SearchBar } from './components/SearchBar';
import { FavouriteChips } from './components/FavouriteChips';
import { RouteResults } from './components/RouteResults';
import { useGeolocation } from './hooks/useGeolocation';
import { useFavourites } from './hooks/useFavourites';
import { useRoutes } from './hooks/useRoutes';
import type { RouteOption, GeocodingResult } from './types';
import './App.css';

export default function App() {
  const { position } = useGeolocation();
  const { favourites } = useFavourites();
  const { routes, loading: routesLoading, search: searchRoutes, clear: clearRoutes } = useRoutes();
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);

  useEffect(() => {
    if (position && destination) {
      searchRoutes(position.lat, position.lng, destination.lat, destination.lng);
    }
  }, [position, destination, searchRoutes]);

  const handleSearchSelect = (result: GeocodingResult) => {
    setSelectedRoute(null);
    setDestination({ lat: result.lat, lng: result.lng, name: result.displayName.split(',')[0] });
  };

  const handleFavouriteSelect = (fav: { lat: number; lng: number; name: string }) => {
    setSelectedRoute(null);
    setDestination({ lat: fav.lat, lng: fav.lng, name: fav.name });
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
  };

  return (
    <div className="app">
      <div className="map-container">
        <Map userPosition={position} />
      </div>
      <BottomSheet>
        <SearchBar onSelect={handleSearchSelect} />
        <FavouriteChips favourites={favourites} onSelect={handleFavouriteSelect} />
        <RouteResults routes={routes} loading={routesLoading} onSelect={handleRouteSelect} />
      </BottomSheet>
    </div>
  );
}
```

- [ ] **Step 6: Verify in browser**

```bash
cd frontend
npm run dev
# Search for a place, verify route cards appear in bottom sheet
# (requires backend running with GTFS data loaded)
```

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add route search results with route cards"
```

---

## Task 14: Route Selection + Map Rendering + Last Mile

When a route is selected, draw the polyline, stop markers, and last-mile dotted line on the map.

**Files:**
- Create: `frontend/src/components/StopMarker.tsx`
- Create: `frontend/src/components/LastMileLine.tsx`
- Modify: `frontend/src/components/Map.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create StopMarker component**

`frontend/src/components/StopMarker.tsx`:
```typescript
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface StopMarkerProps {
  lat: number;
  lng: number;
  name: string;
  type: 'origin' | 'destination';
}

const originIcon = new L.DivIcon({
  className: 'stop-marker origin',
  html: '<div class="stop-dot origin-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = new L.DivIcon({
  className: 'stop-marker dest',
  html: '<div class="stop-dot dest-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function StopMarker({ lat, lng, name, type }: StopMarkerProps) {
  return (
    <Marker position={[lat, lng]} icon={type === 'origin' ? originIcon : destIcon}>
      <Popup>{name}</Popup>
    </Marker>
  );
}
```

- [ ] **Step 2: Create LastMileLine component**

`frontend/src/components/LastMileLine.tsx`:
```typescript
import { Polyline, Tooltip } from 'react-leaflet';

interface LastMileLineProps {
  from: [number, number];
  to: [number, number];
  distance: number;
}

export function LastMileLine({ from, to, distance }: LastMileLineProps) {
  return (
    <Polyline
      positions={[from, to]}
      pathOptions={{ color: '#999', weight: 3, dashArray: '8, 8' }}
    >
      <Tooltip permanent direction="center">
        ~{distance}m
      </Tooltip>
    </Polyline>
  );
}
```

- [ ] **Step 3: Update Map component to accept route overlay props**

Replace `frontend/src/components/Map.tsx`:
```typescript
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { StopMarker } from './StopMarker';
import { LastMileLine } from './LastMileLine';
import type { RouteOption, Stop } from '../types';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BUCHAREST_CENTER: [number, number] = [44.4268, 26.1025];

const routeColors: Record<number, string> = {
  0: '#e74c3c',  // tram
  3: '#3498db',  // bus
  11: '#2ecc71', // trolley
  1: '#f39c12',  // metro
};

interface MapProps {
  userPosition: { lat: number; lng: number } | null;
  selectedRoute: RouteOption | null;
  destination: { lat: number; lng: number } | null;
  originStop: Stop | null;
  destStop: Stop | null;
  children?: React.ReactNode;
}

function FitBounds({ route, userPosition }: { route: RouteOption | null; userPosition: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (route?.shapeCoords && route.shapeCoords.length > 0) {
      const bounds = L.latLngBounds(route.shapeCoords.map(c => [c[0], c[1]] as [number, number]));
      if (userPosition) bounds.extend([userPosition.lat, userPosition.lng]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (userPosition) {
      map.setView([userPosition.lat, userPosition.lng], 15);
    }
  }, [route, userPosition, map]);
  return null;
}

export function Map({ userPosition, selectedRoute, destination, originStop, destStop, children }: MapProps) {
  const center = userPosition ? [userPosition.lat, userPosition.lng] as [number, number] : BUCHAREST_CENTER;
  const routeColor = selectedRoute ? (routeColors[selectedRoute.routeType] || '#3498db') : '#3498db';

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds route={selectedRoute} userPosition={userPosition} />

      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {selectedRoute?.shapeCoords && (
        <Polyline
          positions={selectedRoute.shapeCoords.map(c => [c[0], c[1]] as [number, number])}
          pathOptions={{ color: routeColor, weight: 4 }}
        />
      )}

      {originStop && <StopMarker lat={originStop.lat} lng={originStop.lng} name={originStop.name} type="origin" />}
      {destStop && <StopMarker lat={destStop.lat} lng={destStop.lng} name={destStop.name} type="destination" />}

      {destStop && destination && selectedRoute && selectedRoute.lastMileDistance > 0 && (
        <LastMileLine
          from={[destStop.lat, destStop.lng]}
          to={[destination.lat, destination.lng]}
          distance={selectedRoute.lastMileDistance}
        />
      )}

      {children}
    </MapContainer>
  );
}
```

- [ ] **Step 4: Add stop marker CSS**

Append to `frontend/src/App.css`:
```css
.stop-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.origin-dot { background: #2ecc71; }
.dest-dot { background: #e74c3c; }
```

- [ ] **Step 5: Update App.tsx to pass route data to Map**

Update `App.tsx` — replace the `<Map>` call and add stop resolution:
```typescript
import { useState, useEffect, useMemo } from 'react';
import { Map } from './components/Map';
import { BottomSheet } from './components/BottomSheet';
import { SearchBar } from './components/SearchBar';
import { FavouriteChips } from './components/FavouriteChips';
import { RouteResults } from './components/RouteResults';
import { useGeolocation } from './hooks/useGeolocation';
import { useFavourites } from './hooks/useFavourites';
import { useRoutes } from './hooks/useRoutes';
import type { RouteOption, GeocodingResult, Stop } from './types';
import './App.css';

export default function App() {
  const { position } = useGeolocation();
  const { favourites } = useFavourites();
  const { routes, loading: routesLoading, search: searchRoutes } = useRoutes();
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);

  useEffect(() => {
    if (position && destination) {
      searchRoutes(position.lat, position.lng, destination.lat, destination.lng);
    }
  }, [position, destination, searchRoutes]);

  const handleSearchSelect = (result: GeocodingResult) => {
    setSelectedRoute(null);
    setDestination({ lat: result.lat, lng: result.lng, name: result.displayName.split(',')[0] });
  };

  const handleFavouriteSelect = (fav: { lat: number; lng: number; name: string }) => {
    setSelectedRoute(null);
    setDestination({ lat: fav.lat, lng: fav.lng, name: fav.name });
  };

  const originStop: Stop | null = useMemo(() =>
    selectedRoute ? { id: selectedRoute.originStopId, name: selectedRoute.originStopName, lat: 0, lng: 0 } : null
  , [selectedRoute]);

  const destStop: Stop | null = useMemo(() =>
    selectedRoute ? { id: selectedRoute.destStopId, name: selectedRoute.destStopName, lat: 0, lng: 0 } : null
  , [selectedRoute]);

  // Note: origin/dest stop lat/lng will need to come from the route option or a separate lookup.
  // For now the polyline + last mile line handle the visual positioning.

  return (
    <div className="app">
      <div className="map-container">
        <Map
          userPosition={position}
          selectedRoute={selectedRoute}
          destination={destination}
          originStop={null}
          destStop={null}
        />
      </div>
      <BottomSheet>
        <SearchBar onSelect={handleSearchSelect} />
        <FavouriteChips favourites={favourites} onSelect={handleFavouriteSelect} />
        <RouteResults routes={routes} loading={routesLoading} onSelect={setSelectedRoute} />
      </BottomSheet>
    </div>
  );
}
```

**Note:** The stop lat/lng are not in RouteOption yet. Add `originStopLat`, `originStopLng`, `destStopLat`, `destStopLng` to the backend `RouteOption` model and the frontend `RouteOption` type. Update `RouteCalculatorService` to include them from the stop data it already has. This is a refinement during integration — the shape polyline already shows the route visually.

- [ ] **Step 6: Verify in browser**

```bash
cd frontend
npm run dev
# Select a route — verify polyline and last-mile dotted line appear on map
```

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add route polyline, stop markers, and last-mile indicator"
```

---

## Task 15: Live Vehicle Tracking

**Files:**
- Create: `frontend/src/hooks/useVehicles.ts`
- Create: `frontend/src/components/VehicleMarker.tsx`
- Modify: `frontend/src/components/Map.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create the vehicles polling hook**

`frontend/src/hooks/useVehicles.ts`:
```typescript
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { Vehicle } from '../types';

export function useVehicles(routeId: string | null) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!routeId) {
      setVehicles([]);
      return;
    }

    const poll = async () => {
      try {
        setVehicles(await api.getVehicles(routeId));
      } catch { /* ignore */ }
    };

    poll();
    intervalRef.current = setInterval(poll, 10_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [routeId]);

  return vehicles;
}
```

- [ ] **Step 2: Create VehicleMarker component**

`frontend/src/components/VehicleMarker.tsx`:
```typescript
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Vehicle } from '../types';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  lineName: string;
  color: string;
}

function createVehicleIcon(lineName: string, color: string) {
  return new L.DivIcon({
    className: 'vehicle-marker',
    html: `<div class="vehicle-dot" style="background:${color}">${lineName}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function VehicleMarker({ vehicle, lineName, color }: VehicleMarkerProps) {
  return (
    <Marker position={[vehicle.lat, vehicle.lng]} icon={createVehicleIcon(lineName, color)}>
      <Popup>
        {lineName} · {vehicle.licensePlate || vehicle.id}
      </Popup>
    </Marker>
  );
}
```

- [ ] **Step 3: Add vehicle marker CSS**

Append to `frontend/src/App.css`:
```css
.vehicle-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  transition: transform 0.5s ease;
}
```

- [ ] **Step 4: Add VehicleMarker rendering to Map.tsx**

Add to the `MapProps` interface:
```typescript
import type { Vehicle } from '../types';
// Add to MapProps:
vehicles: Vehicle[];
routeLineName: string;
```

Add inside `MapContainer`, after the last-mile line:
```typescript
{vehicles.map((v) => (
  <VehicleMarker
    key={v.id}
    vehicle={v}
    lineName={routeLineName}
    color={routeColor}
  />
))}
```

- [ ] **Step 5: Wire vehicle tracking into App.tsx**

Add to `App.tsx`:
```typescript
import { useVehicles } from './hooks/useVehicles';

// Inside App component:
const vehicles = useVehicles(selectedRoute?.routeId ?? null);
```

Pass to `<Map>`:
```typescript
<Map
  userPosition={position}
  selectedRoute={selectedRoute}
  destination={destination}
  originStop={null}
  destStop={null}
  vehicles={vehicles}
  routeLineName={selectedRoute?.shortName ?? ''}
/>
```

- [ ] **Step 6: Verify in browser**

```bash
cd frontend
npm run dev
# Select a route — vehicle dots should appear and move every 10s
```

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add live vehicle tracking with 10s polling"
```

---

## Task 16: Favourites Manager UI

**Files:**
- Create: `frontend/src/components/FavouritesManager.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create FavouritesManager component**

`frontend/src/components/FavouritesManager.tsx`:
```typescript
import { useState } from 'react';
import type { Favourite } from '../types';

interface FavouritesManagerProps {
  favourites: Favourite[];
  onAdd: (name: string, lat: number, lng: number) => void;
  onUpdate: (id: string, name: string, lat: number, lng: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  pendingSave: { lat: number; lng: number; name: string } | null;
}

export function FavouritesManager({ favourites, onAdd, onUpdate, onRemove, onClose, pendingSave }: FavouritesManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saveName, setSaveName] = useState(pendingSave?.name ?? '');

  const handleSave = () => {
    if (!pendingSave || !saveName.trim()) return;
    onAdd(saveName.trim(), pendingSave.lat, pendingSave.lng);
    onClose();
  };

  const handleEdit = (fav: Favourite) => {
    setEditingId(fav.id);
    setEditName(fav.name);
  };

  const handleEditSave = (fav: Favourite) => {
    if (!editName.trim()) return;
    onUpdate(fav.id, editName.trim(), fav.lat, fav.lng);
    setEditingId(null);
  };

  return (
    <div className="favourites-manager">
      <div className="favourites-header">
        <h3>Favourites</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {pendingSave && (
        <div className="save-favourite">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name this place"
          />
          <button onClick={handleSave}>Save</button>
        </div>
      )}

      <ul className="favourites-list">
        {favourites.map((fav) => (
          <li key={fav.id}>
            {editingId === fav.id ? (
              <div className="edit-row">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <button onClick={() => handleEditSave(fav)}>OK</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="fav-row">
                <span className="fav-name">{fav.name}</span>
                <button onClick={() => handleEdit(fav)}>Edit</button>
                <button className="delete-btn" onClick={() => onRemove(fav.id)}>Delete</button>
              </div>
            )}
          </li>
        ))}
        {favourites.length === 0 && !pendingSave && (
          <li className="empty">No favourites yet. Search for a place and save it.</li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Add CSS for favourites manager**

Append to `frontend/src/App.css`:
```css
.favourites-manager {
  padding: 8px 0;
}

.favourites-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.favourites-header h3 {
  font-size: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
}

.save-favourite {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.save-favourite input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.save-favourite button {
  padding: 8px 16px;
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.favourites-list {
  list-style: none;
}

.favourites-list li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.fav-row, .edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fav-name { flex: 1; font-size: 14px; }

.fav-row button, .edit-row button {
  padding: 4px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.delete-btn { color: #e74c3c; border-color: #e74c3c; }

.edit-row input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.empty { color: #999; font-size: 13px; padding: 16px 0; text-align: center; }
```

- [ ] **Step 3: Wire FavouritesManager into App.tsx**

Add state and toggle to `App.tsx`:
```typescript
import { FavouritesManager } from './components/FavouritesManager';

// Inside App component, add state:
const [showFavManager, setShowFavManager] = useState(false);
const [pendingSaveFav, setPendingSaveFav] = useState<{ lat: number; lng: number; name: string } | null>(null);
```

Add a menu button above the bottom sheet content, and conditionally render the manager:
```typescript
<BottomSheet>
  {showFavManager ? (
    <FavouritesManager
      favourites={favourites}
      onAdd={favourites_hook.add}
      onUpdate={favourites_hook.update}
      onRemove={favourites_hook.remove}
      onClose={() => { setShowFavManager(false); setPendingSaveFav(null); }}
      pendingSave={pendingSaveFav}
    />
  ) : (
    <>
      <SearchBar onSelect={handleSearchSelect} />
      <FavouriteChips favourites={favourites} onSelect={handleFavouriteSelect} />
      <RouteResults routes={routes} loading={routesLoading} onSelect={setSelectedRoute} />
    </>
  )}
</BottomSheet>
```

Rename the `useFavourites` destructure so we have access to the actions:
```typescript
const favHook = useFavourites();
const { favourites } = favHook;
```

- [ ] **Step 4: Verify in browser**

```bash
cd frontend
npm run dev
# Open favourites manager, add/edit/delete favourites
```

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add favourites manager with add/edit/delete"
```

---

## Task 17: PWA Setup

**Files:**
- Create: `frontend/public/manifest.json`
- Modify: `frontend/index.html`
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Install PWA plugin**

```bash
cd frontend
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Create manifest**

`frontend/public/manifest.json`:
```json
{
  "name": "MySTB - Bucharest Transit",
  "short_name": "MySTB",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3498db",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 3: Update vite.config.ts**

`frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // using public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
});
```

- [ ] **Step 4: Add manifest link to index.html**

Add to `<head>` in `frontend/index.html`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3498db" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

- [ ] **Step 5: Verify build succeeds**

```bash
cd frontend
npm run build
# Expected: dist/ folder with service worker files
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add PWA support with service worker and tile caching"
```

---

## Task 18: Dockerfiles

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Create backend Dockerfile**

`backend/Dockerfile`:
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY src/MyStb.Api/MyStb.Api.csproj src/MyStb.Api/
RUN dotnet restore src/MyStb.Api/MyStb.Api.csproj
COPY . .
RUN dotnet publish src/MyStb.Api/MyStb.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app
COPY --from=build /app .
RUN mkdir -p /data
ENV ASPNETCORE_URLS=http://+:8080
ENV ConnectionStrings__Sqlite="Data Source=/data/mystb.db"
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyStb.Api.dll"]
```

- [ ] **Step 2: Create frontend Dockerfile**

`frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
EXPOSE 80
```

- [ ] **Step 3: Verify both build**

```bash
cd backend && docker build -t mystb-api .
cd ../frontend && docker build -t mystb-frontend .
# Expected: both images build successfully
```

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile
git commit -m "feat: add Dockerfiles for backend and frontend"
```

---

## Integration Refinements (to address during implementation)

These are known gaps to resolve as you work through the tasks:

1. **Stop lat/lng in RouteOption** — Add `originStopLat`, `originStopLng`, `destStopLat`, `destStopLng` fields to the backend `RouteOption` model and populate from the stop data in `RouteCalculatorService`. Update the frontend `RouteOption` type to match. This enables the map to place stop markers at correct positions.

2. **ETA estimation** — The placeholder `return 5` in `RouteCalculatorService.EstimateEta()` should be replaced with real logic: calculate the nearest vehicle's position relative to stops along the route using the stop sequence and Haversine distances, then estimate ~2 min per stop.

3. **GTFS zip re-reading** — `GtfsParser` methods each open the zip independently. For production, refactor `GtfsLoaderService` to open the zip once and pass individual entry streams to each parser method. Not blocking for v1.

4. **PWA icons** — Generate `icon-192.png` and `icon-512.png` and place in `frontend/public/`. A simple bus/transit icon works.

## Key Design Decisions

- **Favourites are browser-local** — stored in `localStorage`, no backend involvement. Simpler, no auth needed, works offline.
- **Vehicle polling is demand-driven** — backend only polls mo-bi.ro when users are active (tracked via API request middleware). Polls every 30s while active, stops after 2 min idle. Saves resources and respects rate limits.
- **GTFS loading is demand-driven** ��� only downloads/parses when a user request comes in and data is empty or stale (>7 days). No background timer.
