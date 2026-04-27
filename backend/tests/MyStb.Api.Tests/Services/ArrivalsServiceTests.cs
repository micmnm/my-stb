using System.Data;
using Dapper;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class ArrivalsServiceTests
{
    private static IDbConnection SetupDb(long vehicleUpdatedAt)
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','Stop A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Stop B',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Stop C',44.4340,26.1040)");
        db.Execute("INSERT INTO stops VALUES ('s4','Stop D — Terminus',44.4360,26.1060)");
        db.Execute("INSERT INTO routes VALUES ('r1','100','Test Line',3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',0,2)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s3',0,3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s4',0,4)");
        // vehicle near s1, heading toward s4
        db.Execute(
            "INSERT INTO vehicles VALUES ('v1','r1',44.4300,26.1000,0,'B-01-AAA',@Ts,@Ts)",
            new { Ts = vehicleUpdatedAt });
        return db;
    }

    [Fact]
    public void GetArrivals_ReturnsLiveVehicleAtStop()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var db = SetupDb(vehicleUpdatedAt: now);
        var svc = new ArrivalsService();

        var resp = svc.GetArrivals(db, "s3", now);

        Assert.NotNull(resp);
        Assert.Equal("s3", resp!.StopId);
        Assert.Single(resp.Arrivals);
        var arrival = resp.Arrivals[0];
        Assert.Equal("r1", arrival.RouteId);
        Assert.Equal("v1", arrival.VehicleId);
        Assert.Equal("a", arrival.Direction);
        Assert.Equal("s4", arrival.DestinationStopId);
        Assert.True(arrival.IsLive);
        Assert.True(arrival.EtaSeconds > 0);
    }

    [Fact]
    public void GetArrivals_MarksStaleVehicleNotLive()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var db = SetupDb(vehicleUpdatedAt: now - 200);
        var svc = new ArrivalsService();

        var resp = svc.GetArrivals(db, "s3", now);

        Assert.NotNull(resp);
        Assert.Single(resp!.Arrivals);
        Assert.False(resp.Arrivals[0].IsLive);
    }

    [Fact]
    public void GetArrivals_ExcludesPassedVehicles()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var db = SetupDb(vehicleUpdatedAt: now);
        var svc = new ArrivalsService();

        // The vehicle is closest to s1; it has already passed s1 by definition (not strictly upcoming)
        var resp = svc.GetArrivals(db, "s1", now);

        Assert.NotNull(resp);
        Assert.Empty(resp!.Arrivals);
    }

    [Fact]
    public void GetArrivals_SortedByEtaAscending()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','Stop A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Stop B',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Stop C',44.4340,26.1040)");
        db.Execute("INSERT INTO stops VALUES ('s4','Stop D',44.4360,26.1060)");
        db.Execute("INSERT INTO routes VALUES ('r1','100','Line',3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',0,2)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s3',0,3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s4',0,4)");
        // Two vehicles: v_near at s2, v_far at s1
        db.Execute("INSERT INTO vehicles VALUES ('v_near','r1',44.4320,26.1020,0,null,@Ts,@Ts)", new { Ts = now });
        db.Execute("INSERT INTO vehicles VALUES ('v_far','r1',44.4300,26.1000,0,null,@Ts,@Ts)", new { Ts = now });

        var svc = new ArrivalsService();
        var resp = svc.GetArrivals(db, "s4", now);

        Assert.NotNull(resp);
        Assert.Equal(2, resp!.Arrivals.Count);
        Assert.True(resp.Arrivals[0].EtaSeconds <= resp.Arrivals[1].EtaSeconds);
        Assert.Equal("v_near", resp.Arrivals[0].VehicleId);
    }

    [Fact]
    public void GetStop_ReturnsServingRoutes()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var db = SetupDb(vehicleUpdatedAt: now);
        var svc = new ArrivalsService();

        var stop = svc.GetStop(db, "s2");

        Assert.NotNull(stop);
        Assert.Equal("Stop B", stop!.Name);
        Assert.Single(stop.Routes);
        Assert.Equal("100", stop.Routes[0].ShortName);
    }
}
