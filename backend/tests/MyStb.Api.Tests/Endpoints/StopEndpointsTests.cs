using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using MyStb.Api.Endpoints;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Endpoints;

public class StopEndpointsTests
{
    private const long Now = 1_794_641_060;
    private static readonly FeedStatus Ok = new("ok", DateTimeOffset.FromUnixTimeSeconds(Now));

    private static int StatusOf(IResult result) => ((IStatusCodeHttpResult)result).StatusCode ?? 200;

    [Fact]
    public void Peek_TooManyStops_Is400()
    {
        var body = new PeekRequest(Enumerable.Range(0, 21).Select(i => $"s{i}").ToList(), null);

        Assert.Equal(400, StatusOf(StopEndpoints.HandlePeek(body, TestDb.Create(), Ok, Now)));
    }

    [Fact]
    public void Peek_TooManyRoutes_Is400()
    {
        var body = new PeekRequest(["s1"], Enumerable.Range(0, 51).Select(i => $"r{i}").ToList());

        Assert.Equal(400, StatusOf(StopEndpoints.HandlePeek(body, TestDb.Create(), Ok, Now)));
    }

    [Fact]
    public void Peek_AtCaps_Is200()
    {
        var body = new PeekRequest(
            Enumerable.Range(0, 20).Select(i => $"s{i}").ToList(),
            Enumerable.Range(0, 50).Select(i => $"r{i}").ToList());

        Assert.Equal(200, StatusOf(StopEndpoints.HandlePeek(body, TestDb.Create(), Ok, Now)));
    }

    [Fact]
    public void Peek_ReturnsFeedAndFilteredStops()
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','B',44.4320,26.1020)");
        db.Execute("INSERT INTO routes VALUES ('X','X','Line X',3)");
        db.Execute("INSERT INTO routes VALUES ('Y','Y','Line Y',3)");
        foreach (var r in new[] { "X", "Y" })
        {
            db.Execute("INSERT INTO route_stops VALUES (@r,'s1',0,1)", new { r });
            db.Execute("INSERT INTO route_stops VALUES (@r,'s2',0,2)", new { r });
            db.Execute("INSERT INTO vehicles VALUES (@id,@r,44.4300,26.1000,0,null,@Now,@Now)", new { id = $"v{r}", r, Now });
        }

        var result = StopEndpoints.HandlePeek(new PeekRequest(["s2"], ["X"]), db, Ok, Now);

        var ok = Assert.IsType<Ok<PeekResponse>>(result);
        Assert.Same(Ok, ok.Value!.Feed);
        Assert.Equal("X", ok.Value.Stops["s2"].Soonest.Single().RouteId);
    }

    [Fact]
    public void Peek_EmptyOrMissingStopIds_ReturnsEmptyStops()
    {
        var result = StopEndpoints.HandlePeek(new PeekRequest(null, null), TestDb.Create(), Ok, Now);

        var ok = Assert.IsType<Ok<PeekResponse>>(result);
        Assert.Empty(ok.Value!.Stops);
    }

    [Theory]
    [InlineData(44.4, 26.1, null, null, null)]
    [InlineData(-90, -180, 3000.0, null, 50)]
    [InlineData(90, 180, null, 1.0, 1)]
    public void Nearby_InRangeIsValid(double lat, double lng, double? radius, double? maxMeters, int? limit)
    {
        Assert.Null(StopEndpoints.ValidateNearby(lat, lng, radius, maxMeters, limit));
    }

    [Theory]
    [InlineData(90.01, 26.1, null, null, null, "lat")]
    [InlineData(-91, 26.1, null, null, null, "lat")]
    [InlineData(double.NaN, 26.1, null, null, null, "lat")]
    [InlineData(44.4, 180.5, null, null, null, "lng")]
    [InlineData(44.4, double.PositiveInfinity, null, null, null, "lng")]
    [InlineData(44.4, 26.1, 3001.0, null, null, "radius")]
    [InlineData(44.4, 26.1, 0.0, null, null, "radius")]
    [InlineData(44.4, 26.1, double.NaN, null, null, "radius")]
    [InlineData(44.4, 26.1, null, 1_000_000_000.0, null, "maxMeters")]
    [InlineData(44.4, 26.1, null, null, 51, "limit")]
    [InlineData(44.4, 26.1, null, null, 0, "limit")]
    public void Nearby_OutOfRangeIsRejected(double lat, double lng, double? radius, double? maxMeters, int? limit, string field)
    {
        var error = StopEndpoints.ValidateNearby(lat, lng, radius, maxMeters, limit);

        Assert.NotNull(error);
        Assert.Contains(field is "lat" ? "latitude" : field is "lng" ? "longitude" : field, error);
    }
}
