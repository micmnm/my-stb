using System.Data;
using System.IO.Compression;
using System.Net;
using System.Text;
using Dapper;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MyStb.Api.Database;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class GtfsLoaderServiceTests : IDisposable
{
    private readonly string _connectionString = $"Data Source=file:gtfs{Guid.NewGuid():N}?mode=memory&cache=shared";
    private readonly SqliteConnection _keepAlive;

    public GtfsLoaderServiceTests()
    {
        _keepAlive = new SqliteConnection(_connectionString);
        _keepAlive.Open();
        DbInitializer.Initialize(_keepAlive);
    }

    public void Dispose() => _keepAlive.Dispose();

    private static byte[] GtfsZip(int stopCount, bool includeRoutes = true)
    {
        var stops = new StringBuilder("stop_id,stop_name,stop_lat,stop_lon\n");
        var stopTimes = new StringBuilder("trip_id,stop_id,stop_sequence\n");
        for (var i = 0; i < stopCount; i++)
        {
            stops.Append($"S{i},Stop {i},44.{4300 + i},26.1000\n");
            stopTimes.Append($"T1,S{i},{i + 1}\n");
        }
        var files = new Dictionary<string, string>
        {
            ["stops.txt"] = stops.ToString(),
            ["trips.txt"] = "trip_id,route_id,direction_id,shape_id\nT1,R1,0,SH1\n",
            ["stop_times.txt"] = stopTimes.ToString(),
            ["shapes.txt"] = "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\nSH1,44.43,26.1,1\n",
        };
        if (includeRoutes) files["routes.txt"] = "route_id,route_short_name,route_long_name,route_type\nR1,41,Line,0\n";

        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, content) in files)
            {
                using var writer = new StreamWriter(archive.CreateEntry(name).Open());
                writer.Write(content);
            }
        }
        return ms.ToArray();
    }

    private sealed class FakeGtfsServer : HttpMessageHandler
    {
        private int _requests;
        public int Requests => _requests;
        public Queue<Func<HttpResponseMessage>> Responses { get; } = new();
        public List<string> UserAgents { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Interlocked.Increment(ref _requests);
            lock (UserAgents) UserAgents.Add(request.Headers.UserAgent.ToString());
            await Task.Delay(50, ct);
            Func<HttpResponseMessage> next;
            lock (Responses) next = Responses.Dequeue();
            return next();
        }
    }

    private static Func<HttpResponseMessage> Zip(byte[] bytes) =>
        () => new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(bytes) };

    private static Func<HttpResponseMessage> ServerError() =>
        () => new HttpResponseMessage(HttpStatusCode.InternalServerError);

    private sealed class FakeHttpFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class FixedTime(DateTimeOffset now) : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = now;
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private GtfsLoaderService CreateLoader(FakeGtfsServer server, FixedTime time)
    {
        var services = new ServiceCollection()
            .AddScoped<IDbConnection>(_ =>
            {
                var conn = new SqliteConnection(_connectionString);
                conn.Open();
                return conn;
            })
            .BuildServiceProvider();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Gtfs:DownloadUrl"] = "http://gtfs.test/feed.zip",
                ["Gtfs:MaxAgeHours"] = "168",
            })
            .Build();
        return new GtfsLoaderService(services, config, NullLogger<GtfsLoaderService>.Instance, new FakeHttpFactory(server), time);
    }

    private int StopCount() => _keepAlive.ExecuteScalar<int>("SELECT COUNT(*) FROM stops");

    private static readonly DateTimeOffset T0 = new(2026, 11, 14, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ColdStart_ConcurrentRequestsAllWaitAndDownloadOnce()
    {
        var server = new FakeGtfsServer();
        server.Responses.Enqueue(Zip(GtfsZip(10)));
        var loader = CreateLoader(server, new FixedTime(T0));

        var counts = await Task.WhenAll(Enumerable.Range(0, 30).Select(_ => Task.Run(async () =>
        {
            await loader.EnsureLoadedAsync();
            return StopCount();
        })));

        Assert.All(counts, c => Assert.Equal(10, c));
        Assert.Equal(1, server.Requests);
        Assert.Equal(VehiclePollerService.UserAgent, server.UserAgents.Single());
    }

    [Fact]
    public async Task Failure_RetriesOnlyAfterFifteenMinutes()
    {
        var server = new FakeGtfsServer();
        server.Responses.Enqueue(ServerError());
        server.Responses.Enqueue(Zip(GtfsZip(10)));
        var time = new FixedTime(T0);
        var loader = CreateLoader(server, time);

        await loader.EnsureLoadedAsync();
        Assert.Equal(0, StopCount());

        time.Now = T0.AddMinutes(14);
        await loader.EnsureLoadedAsync();
        Assert.Equal(1, server.Requests);

        time.Now = T0.AddMinutes(16);
        await loader.EnsureLoadedAsync();
        Assert.Equal(2, server.Requests);
        Assert.Equal(10, StopCount());
    }

    [Fact]
    public async Task FreshData_DoesNotDownloadAgain()
    {
        var server = new FakeGtfsServer();
        server.Responses.Enqueue(Zip(GtfsZip(10)));
        var time = new FixedTime(T0);
        var loader = CreateLoader(server, time);
        await loader.EnsureLoadedAsync();

        time.Now = T0.AddHours(167);
        await loader.EnsureLoadedAsync();

        Assert.Equal(1, server.Requests);
    }

    [Fact]
    public async Task StaleData_ServesExistingAndRefreshesInBackground()
    {
        var server = new FakeGtfsServer();
        server.Responses.Enqueue(Zip(GtfsZip(10)));
        server.Responses.Enqueue(Zip(GtfsZip(12)));
        var time = new FixedTime(T0);
        var loader = CreateLoader(server, time);
        await loader.EnsureLoadedAsync();

        time.Now = T0.AddHours(169);
        await loader.EnsureLoadedAsync();
        await loader.EnsureLoadedAsync();
        await loader.BackgroundRefresh;

        Assert.Equal(2, server.Requests);
        Assert.Equal(12, StopCount());
    }

    [Fact]
    public async Task Restart_WithExistingData_RefreshesInBackground()
    {
        _keepAlive.Execute("INSERT INTO stops VALUES ('old','Old',44.4,26.1)");
        var server = new FakeGtfsServer();
        server.Responses.Enqueue(Zip(GtfsZip(10)));
        var loader = CreateLoader(server, new FixedTime(T0));

        await loader.EnsureLoadedAsync();
        await loader.BackgroundRefresh;

        Assert.Equal(1, server.Requests);
        Assert.Equal(10, StopCount());
    }

    [Fact]
    public void ImportArchive_RejectsZipWithoutRoutes()
    {
        _keepAlive.Execute("INSERT INTO stops VALUES ('old','Old',44.4,26.1)");
        using var zip = new ZipArchive(new MemoryStream(GtfsZip(10, includeRoutes: false)));

        Assert.Throws<InvalidDataException>(() => GtfsLoaderService.ImportArchive(_keepAlive, zip));
        Assert.Equal(1, StopCount());
    }

    [Fact]
    public void ImportArchive_RejectsFeedWithUnderHalfTheCurrentStops()
    {
        for (var i = 0; i < 10; i++)
            _keepAlive.Execute("INSERT INTO stops VALUES (@Id,'Old',44.4,26.1)", new { Id = $"old{i}" });
        using var zip = new ZipArchive(new MemoryStream(GtfsZip(4)));

        Assert.Throws<InvalidDataException>(() => GtfsLoaderService.ImportArchive(_keepAlive, zip));
        Assert.Equal(10, StopCount());
    }

    [Fact]
    public void ImportArchive_AcceptsFeedWithHalfTheCurrentStops()
    {
        for (var i = 0; i < 10; i++)
            _keepAlive.Execute("INSERT INTO stops VALUES (@Id,'Old',44.4,26.1)", new { Id = $"old{i}" });
        using var zip = new ZipArchive(new MemoryStream(GtfsZip(5)));

        GtfsLoaderService.ImportArchive(_keepAlive, zip);

        Assert.Equal(5, StopCount());
        Assert.Equal(1, _keepAlive.ExecuteScalar<int>("SELECT COUNT(*) FROM routes"));
    }
}
