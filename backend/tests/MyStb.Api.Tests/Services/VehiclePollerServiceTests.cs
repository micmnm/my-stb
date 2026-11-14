using System.Data;
using System.Net;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class VehiclePollerServiceTests
{
    private const long Now = 1_794_641_060;

    private static string Entry(string id, string routeId, string? timestampJson)
    {
        var ts = timestampJson is null ? "" : $",\"timestamp\":{timestampJson}";
        return "{\"id\":\"" + id + "\",\"vehicle\":{\"trip\":{\"routeId\":\"" + routeId + "\",\"directionId\":0},"
               + "\"vehicle\":{\"licensePlate\":\"B01\"},\"position\":{\"latitude\":44.43,\"longitude\":26.10}"
               + ts + "}}";
    }

    private static (long Timestamp, long UpdatedAt) Row(IDbConnection db, string id) =>
        db.QuerySingle<(long, long)>("SELECT timestamp, updated_at FROM vehicles WHERE id = @id", new { id });

    [Fact]
    public void ApplyFeed_StoresFeedReportTimeInSeconds()
    {
        var db = TestDb.Create();

        VehiclePollerService.ApplyFeed(db, $"[{Entry("v1", "r1", (Now - 45).ToString())}]", Now);

        Assert.Equal((Now - 45, Now), Row(db, "v1"));
    }

    [Fact]
    public void ApplyFeed_NormalizesMillisecondTimestamps()
    {
        var db = TestDb.Create();

        VehiclePollerService.ApplyFeed(db, $"[{Entry("v1", "r1", ((Now - 45) * 1000 + 123).ToString())}]", Now);

        Assert.Equal(Now - 45, Row(db, "v1").Timestamp);
    }

    [Fact]
    public void ApplyFeed_MissingTimestampIsStoredAsUnknown()
    {
        var db = TestDb.Create();

        VehiclePollerService.ApplyFeed(db, $"[{Entry("v1", "r1", null)}]", Now);

        Assert.Equal((0L, Now), Row(db, "v1"));
    }

    [Fact]
    public void ApplyFeed_PrunesVehiclesOlderThanHideThreshold()
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO vehicles VALUES ('gone','r1',44.4,26.1,0,null,@Ts,@Ts)", new { Ts = Now - 660 });
        db.Execute("INSERT INTO vehicles VALUES ('unknownOld','r1',44.4,26.1,0,null,0,@Ts)", new { Ts = Now - 700 });
        db.Execute("INSERT INTO vehicles VALUES ('kept','r1',44.4,26.1,0,null,@Ts,@Ts)", new { Ts = Now - 300 });

        var result = VehiclePollerService.ApplyFeed(db,
            $"[{Entry("fresh", "r1", Now.ToString())},{Entry("silent", "r1", (Now - 601).ToString())}]", Now);

        var ids = db.Query<string>("SELECT id FROM vehicles ORDER BY id").ToList();
        Assert.Equal(["fresh", "kept"], ids);
        Assert.Equal(3, result.Pruned);
    }

    [Fact]
    public void ApplyFeed_SkipsEntriesWithoutRoute()
    {
        var db = TestDb.Create();
        const string noRoute = """{"id":"x","vehicle":{"trip":{"agencyId":"1"},"position":{"latitude":44.4,"longitude":26.1},"timestamp":1}}""";

        var result = VehiclePollerService.ApplyFeed(db, $"[{noRoute},{Entry("v1", "r1", Now.ToString())}]", Now);

        Assert.Equal(1, result.Upserted);
        Assert.Equal(1, result.Skipped);
    }

    [Fact]
    public void ApplyFeed_NonArrayRootThrows()
    {
        var db = TestDb.Create();

        Assert.Throws<InvalidDataException>(() => VehiclePollerService.ApplyFeed(db, """{"error":"x"}""", Now));
    }

    private sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Requests.Add(request);
            return Task.FromResult(respond(request));
        }
    }

    private sealed class FakeHttpFactory(HttpMessageHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }

    private sealed class FixedTime(DateTimeOffset now) : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = now;
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static (VehiclePollerService Poller, IDbConnection Db) CreatePoller(FakeHandler handler, FixedTime time)
    {
        var db = TestDb.Create();
        var services = new ServiceCollection().AddSingleton(db).BuildServiceProvider();
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["MoBiRo:BusDataUrl"] = "http://feed.test/busData" })
            .Build();
        var poller = new VehiclePollerService(services, config, NullLogger<VehiclePollerService>.Instance,
            new FakeHttpFactory(handler), time);
        return (poller, db);
    }

    [Fact]
    public async Task PollOnce_SuccessSendsUserAgentAndRecordsHealth()
    {
        var time = new FixedTime(DateTimeOffset.FromUnixTimeSeconds(Now));
        var handler = new FakeHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent($"[{Entry("v1", "r1", Now.ToString())}]"),
        });
        var (poller, db) = CreatePoller(handler, time);

        var ok = await poller.PollOnceAsync(CancellationToken.None);

        Assert.True(ok);
        Assert.Equal(VehiclePollerService.UserAgent, handler.Requests.Single().Headers.UserAgent.ToString());
        Assert.Equal(1, db.ExecuteScalar<int>("SELECT COUNT(*) FROM vehicles"));
        Assert.Equal(time.Now, poller.LastSuccessUtc);
        Assert.Equal("ok", poller.GetFeedStatus().Status);
    }

    [Fact]
    public async Task PollOnce_UpstreamErrorForFourIntervalsReportsDown()
    {
        var time = new FixedTime(DateTimeOffset.FromUnixTimeSeconds(Now));
        var status = HttpStatusCode.OK;
        var handler = new FakeHandler(_ => new HttpResponseMessage(status) { Content = new StringContent("[]") });
        var (poller, _) = CreatePoller(handler, time);
        poller.Touch();
        await poller.PollOnceAsync(CancellationToken.None);

        status = HttpStatusCode.InternalServerError;
        for (var i = 0; i < 4; i++)
        {
            time.Now = time.Now.AddSeconds(30);
            poller.Touch();
            Assert.False(await poller.PollOnceAsync(CancellationToken.None));
        }

        Assert.Equal(4, poller.ConsecutiveFailures);
        Assert.Equal("down", poller.GetFeedStatus().Status);
    }
}
