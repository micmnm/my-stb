using System.Data;
using Dapper;
using MyStb.Api.Models;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class RouteDetailServiceTests
{
    private static IDbConnection SetupDb(long now)
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','Stop A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Stop B',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Stop C',44.4340,26.1040)");
        db.Execute("INSERT INTO stops VALUES ('s4','Stop D',44.4360,26.1060)");
        db.Execute("INSERT INTO routes VALUES ('r1','41','Test Tram',0)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',0,2)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s3',0,3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s4',0,4)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s4',1,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s3',1,2)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',1,3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',1,4)");
        db.Execute("INSERT INTO vehicles VALUES ('vA','r1',44.4310,26.1010,0,null,@N,@N)", new { N = now });
        db.Execute("INSERT INTO vehicles VALUES ('vB','r1',44.4350,26.1050,1,null,@N,@N)", new { N = now });
        return db;
    }

    private class StubAlertsProvider : IAlertsProvider
    {
        public List<ServiceAlert> All { get; } = [];
        public IReadOnlyList<ServiceAlert> GetActiveForRoute(string routeId, DateTimeOffset now) =>
            All.Where(a => a.AffectedRouteIds?.Contains(routeId) ?? false).ToList();
        public IReadOnlyList<ServiceAlert> GetActiveForStop(string stopId, DateTimeOffset now) => [];
        public IReadOnlyList<ServiceAlert> GetAllActive(DateTimeOffset now) => All;
    }

    [Fact]
    public void Get_ReturnsForwardDirectionStopsAndVehicles()
    {
        var now = DateTimeOffset.UtcNow;
        var db = SetupDb(now.ToUnixTimeSeconds());
        var svc = new RouteDetailService();

        var resp = svc.Get(db, "r1", "a", new StubAlertsProvider(), now);

        Assert.NotNull(resp);
        Assert.Equal("41", resp!.Route.ShortName);
        Assert.Equal("tram", resp.Route.Mode);
        Assert.Equal("a", resp.Direction);
        Assert.Equal(4, resp.Stops.Count);
        Assert.Equal("s1", resp.Stops.First().Id);
        Assert.Equal("s4", resp.Stops.Last().Id);
        Assert.True(resp.Stops.First().IsTerminus);
        Assert.True(resp.Stops.Last().IsTerminus);

        // Only forward-direction vehicles
        Assert.Single(resp.Vehicles);
        Assert.Equal("vA", resp.Vehicles[0].Id);
        Assert.Equal("a", resp.Vehicles[0].Direction);
        Assert.True(resp.Vehicles[0].IsLive);
        Assert.NotNull(resp.Vehicles[0].NextStopId);
    }

    [Fact]
    public void Get_ReverseDirection_FlipsStopsAndVehicles()
    {
        var now = DateTimeOffset.UtcNow;
        var db = SetupDb(now.ToUnixTimeSeconds());
        var svc = new RouteDetailService();

        var resp = svc.Get(db, "r1", "b", new StubAlertsProvider(), now);

        Assert.NotNull(resp);
        Assert.Equal("b", resp!.Direction);
        Assert.Equal("s4", resp.Stops.First().Id);
        Assert.Equal("s1", resp.Stops.Last().Id);
        Assert.Single(resp.Vehicles);
        Assert.Equal("vB", resp.Vehicles[0].Id);
        Assert.Equal("b", resp.Vehicles[0].Direction);
    }

    [Fact]
    public void Get_IncludesAlertsForRoute()
    {
        var now = DateTimeOffset.UtcNow;
        var db = SetupDb(now.ToUnixTimeSeconds());
        var alerts = new StubAlertsProvider();
        alerts.All.Add(new ServiceAlert("a1", "warning", "Lucrări", "Body",
            ["r1"], null, now.AddDays(-1), now.AddDays(1), null));
        alerts.All.Add(new ServiceAlert("a2", "info", "Other", "Body",
            ["r9"], null, now.AddDays(-1), now.AddDays(1), null));

        var resp = new RouteDetailService().Get(db, "r1", "a", alerts, now);

        Assert.NotNull(resp);
        Assert.Single(resp!.Alerts);
        Assert.Equal("a1", resp.Alerts[0].Id);
    }

    [Fact]
    public void Get_UnknownRouteReturnsNull()
    {
        var now = DateTimeOffset.UtcNow;
        var db = SetupDb(now.ToUnixTimeSeconds());
        var svc = new RouteDetailService();

        var resp = svc.Get(db, "doesnotexist", "a", new StubAlertsProvider(), now);

        Assert.Null(resp);
    }
}
