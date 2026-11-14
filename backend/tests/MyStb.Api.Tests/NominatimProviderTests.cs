using System.Net;
using System.Diagnostics;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using MyStb.Api.Services;

namespace MyStb.Api.Tests;

public class NominatimProviderTests
{
    private const string OneHit = """[{"display_name":"Piata Unirii","lat":"44.42","lon":"26.10","type":"square"}]""";

    private sealed class FakeHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> respond)
        : HttpMessageHandler
    {
        public List<(HttpRequestMessage Request, long Ticks)> Calls { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            lock (Calls) Calls.Add((request, Stopwatch.GetTimestamp()));
            return respond(request, ct);
        }
    }

    private static HttpResponseMessage Json(string body, HttpStatusCode code = HttpStatusCode.OK) =>
        new(code) { Content = new StringContent(body) };

    private sealed class ListLogger : ILogger<NominatimProvider>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            Entries.Add((logLevel, formatter(state, exception)));
    }

    private static NominatimProvider Make(FakeHandler h, ILogger<NominatimProvider>? log = null,
        TimeSpan? spacing = null, TimeSpan? maxWait = null, TimeSpan? timeout = null) =>
        new(new HttpClient(h), "https://nominatim.test", new MemoryCache(new MemoryCacheOptions()),
            log ?? NullLogger<NominatimProvider>.Instance,
            spacing ?? TimeSpan.Zero, maxWait ?? TimeSpan.FromSeconds(3), timeout ?? TimeSpan.FromSeconds(5));

    [Fact]
    public async Task Search_ParsesResults()
    {
        var h = new FakeHandler((_, _) => Task.FromResult(Json(OneHit)));

        var res = await Make(h).SearchAsync("piata unirii");

        var hit = Assert.Single(res);
        Assert.Equal("Piata Unirii", hit.DisplayName);
        Assert.Equal(44.42, hit.Lat);
    }

    [Fact]
    public async Task Search_SendsUserAgent()
    {
        var h = new FakeHandler((_, _) => Task.FromResult(Json(OneHit)));

        await Make(h).SearchAsync("piata unirii");

        Assert.Equal("MyStb/1.0 (+https://mystb.mltru.com)", h.Calls[0].Request.Headers.UserAgent.ToString());
    }

    [Fact]
    public async Task Search_RepeatedNormalisedQuery_HitsUpstreamOnce()
    {
        var h = new FakeHandler((_, _) => Task.FromResult(Json(OneHit)));
        var p = Make(h);

        await p.SearchAsync("Piata  Unirii");
        var again = await p.SearchAsync("  piata unirii ");

        Assert.Single(h.Calls);
        Assert.Single(again);
    }

    [Fact]
    public async Task Search_DistinctQueries_AreSpacedByGate()
    {
        var h = new FakeHandler((_, _) => Task.FromResult(Json(OneHit)));
        var p = Make(h, spacing: TimeSpan.FromMilliseconds(300));

        await p.SearchAsync("aaa");
        await p.SearchAsync("bbb");

        var gap = Stopwatch.GetElapsedTime(h.Calls[0].Ticks, h.Calls[1].Ticks);
        Assert.True(gap >= TimeSpan.FromMilliseconds(280), $"gap was {gap}");
    }

    [Fact]
    public async Task Search_WaitingLongerThanMaxWait_ReturnsEmptyWithoutUpstreamCall()
    {
        var h = new FakeHandler((_, _) => Task.FromResult(Json(OneHit)));
        var p = Make(h, spacing: TimeSpan.FromSeconds(2), maxWait: TimeSpan.FromMilliseconds(200));

        await p.SearchAsync("aaa");
        var second = await p.SearchAsync("bbb");

        Assert.Empty(second);
        Assert.Single(h.Calls);
    }

    [Fact]
    public async Task Search_UpstreamTimeout_ReturnsEmptyAndIsNotCached()
    {
        var h = new FakeHandler(async (_, ct) =>
        {
            await Task.Delay(Timeout.Infinite, ct);
            return Json(OneHit);
        });
        var p = Make(h, timeout: TimeSpan.FromMilliseconds(100));

        var res = await p.SearchAsync("slow");
        await p.SearchAsync("slow");

        Assert.Empty(res);
        Assert.Equal(2, h.Calls.Count);
    }

    [Fact]
    public async Task Search_CallerCancellation_Propagates()
    {
        var h = new FakeHandler(async (_, ct) =>
        {
            await Task.Delay(Timeout.Infinite, ct);
            return Json(OneHit);
        });
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Make(h).SearchAsync("x", cts.Token));
    }

    [Theory]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    public async Task Search_BlockedResponse_LogsWarningReturnsEmptyAndIsNotCached(HttpStatusCode code)
    {
        var log = new ListLogger();
        var h = new FakeHandler((_, _) => Task.FromResult(Json("blocked", code)));
        var p = Make(h, log);

        var res = await p.SearchAsync("blocked");
        await p.SearchAsync("blocked");

        Assert.Empty(res);
        Assert.Equal(2, h.Calls.Count);
        Assert.Contains(log.Entries, e => e.Level == LogLevel.Warning && e.Message.Contains(((int)code).ToString()));
    }
}
