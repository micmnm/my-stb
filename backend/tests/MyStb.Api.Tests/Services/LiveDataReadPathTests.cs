using System.Data;
using Dapper;
using MyStb.Api.Endpoints;
using MyStb.Api.Models;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

// Expired vehicles (> HideSeconds since report) must not surface through any read path.
public class LiveDataReadPathTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(1_794_641_060);
    private static long NowUnix => Now.ToUnixTimeSeconds();

    private static IDbConnection SetupDb()
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','Stop A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Stop B',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Stop C',44.4360,26.1060)");
        db.Execute("INSERT INTO routes VALUES ('r1','41','Test Tram',0)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',0,2)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s3',0,3)");
        return db;
    }

    private static void AddVehicle(IDbConnection db, string id, long timestamp, long updatedAt) =>
        db.Execute("INSERT INTO vehicles VALUES (@id,'r1',44.4310,26.1010,0,null,@timestamp,@updatedAt)",
            new { id, timestamp, updatedAt });

    private sealed class NoAlerts : IAlertsProvider
    {
        public IReadOnlyList<ServiceAlert> GetActiveForRoute(string routeId, DateTimeOffset now) => [];
        public IReadOnlyList<ServiceAlert> GetActiveForStop(string stopId, DateTimeOffset now) => [];
        public IReadOnlyList<ServiceAlert> GetAllActive(DateTimeOffset now) => [];
    }

    [Fact]
    public void RouteDetail_VehiclesCarryFreshnessAndExcludeExpired()
    {
        var db = SetupDb();
        AddVehicle(db, "live", NowUnix - 30, NowUnix);
        AddVehicle(db, "stale", NowUnix - 180, NowUnix);
        AddVehicle(db, "expired", NowUnix - 601, NowUnix);

        var resp = new RouteDetailService().Get(db, "r1", "a", new NoAlerts(), Now)!;

        var byId = resp.Vehicles.ToDictionary(v => v.Id);
        Assert.Equal(["live", "stale"], byId.Keys.Order());
        Assert.Equal("live", byId["live"].Freshness);
        Assert.Equal(30, byId["live"].LastSeenSeconds);
        Assert.True(byId["live"].IsLive);
        Assert.Equal("stale", byId["stale"].Freshness);
        Assert.Equal(180, byId["stale"].LastSeenSeconds);
        Assert.False(byId["stale"].IsLive);
    }

    [Fact]
    public void VehiclesEndpoint_ExcludesExpired()
    {
        var db = SetupDb();
        AddVehicle(db, "live", NowUnix - 30, NowUnix);
        AddVehicle(db, "expired", NowUnix - 700, NowUnix);
        AddVehicle(db, "expiredUnknown", 0, NowUnix - 700);

        var ids = VehicleEndpoints.Query(db, "r1", NowUnix).Select(v => (string)v.id).ToList();

        Assert.Equal(["live"], ids);
    }

    private static PlanService.PlanRequest PlanReq() => new(
        From: new PlanService.PlanLocation("address", null, 44.4302, 26.1002, "Origin"),
        To: new PlanService.PlanLocation("address", null, 44.4358, 26.1058, "Destination"),
        When: new PlanService.PlanWhen("now", null),
        Modes: null,
        MaxWalkMeters: 500,
        Accessible: false);

    private static bool FirstTransitIsLive(PlanService.PlanResponse resp) =>
        resp.Trips[0].Legs.OfType<PlanService.TransitLeg>().First().IsLive;

    [Fact]
    public void Plan_IgnoresExpiredVehicleEvenIfRecentlyPolled()
    {
        var db = SetupDb();
        AddVehicle(db, "expired", NowUnix - 700, NowUnix);

        Assert.False(FirstTransitIsLive(new PlanService().Plan(db, PlanReq(), Now)));
    }

    [Fact]
    public void Plan_FreshVehicleMarksTripLive()
    {
        var db = SetupDb();
        AddVehicle(db, "fresh", NowUnix - 10, NowUnix);

        Assert.True(FirstTransitIsLive(new PlanService().Plan(db, PlanReq(), Now)));
    }
}
