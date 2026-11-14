using System.Data;
using System.Net;
using System.Text;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using MyStb.Api.Endpoints;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Endpoints;

// Real Kestrel on a loopback port: exercises minimal-API binding and JSON casing without Mvc.Testing.
public class StopEndpointsHttpTests : IAsyncLifetime
{
    private WebApplication _app = null!;
    private HttpClient _client = null!;
    private IDbConnection _db = null!;

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Production" });
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        _db = TestDb.Create();
        builder.Services.AddSingleton(_db);
        builder.Services.AddHttpClient();
        builder.Services.AddSingleton<VehiclePollerService>();
        _app = builder.Build();
        _app.MapStopEndpoints();
        await _app.StartAsync();

        var address = _app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.First();
        _client = new HttpClient { BaseAddress = new Uri(address) };
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _app.StopAsync();
        await _app.DisposeAsync();
    }

    private Task<HttpResponseMessage> PostPeek(string json) =>
        _client.PostAsync("/api/stops/arrivals/peek", new StringContent(json, Encoding.UTF8, "application/json"));

    [Fact]
    public async Task Peek_MalformedBody_Is400()
    {
        var resp = await PostPeek("{\"stopIds\": [");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Peek_WrongShape_Is400()
    {
        var resp = await PostPeek("{\"stopIds\": \"s1\"}");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task Peek_OverCap_IsProblemDetails400()
    {
        var ids = string.Join(",", Enumerable.Range(0, 21).Select(i => $"\"s{i}\""));

        var resp = await PostPeek($"{{\"stopIds\":[{ids}]}}");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        Assert.Equal("application/problem+json", resp.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Peek_ResponseShapeMatchesContract()
    {
        _db.Execute("INSERT INTO stops VALUES ('s1','A',44.4300,26.1000)");
        _db.Execute("INSERT INTO stops VALUES ('s2','B',44.4320,26.1020)");
        _db.Execute("INSERT INTO routes VALUES ('X','X','Line X',3)");
        _db.Execute("INSERT INTO route_stops VALUES ('X','s1',0,1)");
        _db.Execute("INSERT INTO route_stops VALUES ('X','s2',0,2)");
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        _db.Execute("INSERT INTO vehicles VALUES ('v1','X',44.4300,26.1000,0,null,@Ts,@Ts)", new { Ts = now - 200 });

        var resp = await PostPeek("{\"stopIds\":[\"s2\"],\"routeIds\":[\"X\"]}");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        Assert.Equal("down", root.GetProperty("feed").GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("feed").GetProperty("lastSuccessAt").ValueKind);
        var a = root.GetProperty("stops").GetProperty("s2").GetProperty("soonest")[0];
        Assert.Equal("X", a.GetProperty("routeId").GetString());
        Assert.Equal("stale", a.GetProperty("freshness").GetString());
        Assert.False(a.GetProperty("isLive").GetBoolean());
        Assert.True(a.GetProperty("isEstimate").GetBoolean());
        Assert.InRange(a.GetProperty("lastSeenSeconds").GetInt32(), 199, 205);
        Assert.Equal(44.43, a.GetProperty("lat").GetDouble());
        Assert.Equal(26.1, a.GetProperty("lng").GetDouble());
    }

    [Fact]
    public async Task Arrivals_IncludeFeed()
    {
        _db.Execute("INSERT INTO stops VALUES ('s1','A',44.4300,26.1000)");

        var resp = await _client.GetAsync("/api/stops/s1/arrivals");

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        Assert.Equal("s1", doc.RootElement.GetProperty("stopId").GetString());
        Assert.Equal("down", doc.RootElement.GetProperty("feed").GetProperty("status").GetString());
        Assert.Equal(0, doc.RootElement.GetProperty("arrivals").GetArrayLength());
    }

    [Theory]
    [InlineData("lat=95&lng=26.1")]
    [InlineData("lat=44.4&lng=26.1&radius=1000000000")]
    [InlineData("lat=44.4&lng=26.1&limit=500")]
    [InlineData("lat=NaN&lng=26.1")]
    public async Task Nearby_OutOfRange_Is400(string query)
    {
        var resp = await _client.GetAsync($"/api/stops/nearby?{query}");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }
}
