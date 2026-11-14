using System.Data;
using Dapper;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class ArrivalsFreshnessTests
{
    private const long Now = 1_794_641_060;

    // r1 and r2 both run s1 → s4 in direction 0; vehicles are added per test.
    private static IDbConnection SetupDb()
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','Stop A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Stop B',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Stop C',44.4340,26.1040)");
        db.Execute("INSERT INTO stops VALUES ('s4','Stop D',44.4360,26.1060)");
        foreach (var route in new[] { "r1", "r2" })
        {
            db.Execute("INSERT INTO routes VALUES (@R, @R, 'Line', 3)", new { R = route });
            for (var i = 1; i <= 4; i++)
                db.Execute("INSERT INTO route_stops VALUES (@R, @S, 0, @Seq)", new { R = route, S = $"s{i}", Seq = i });
        }
        return db;
    }

    private static void AddVehicle(IDbConnection db, string id, string route, string nearStop, long timestamp, long updatedAt)
    {
        var (lat, lng) = nearStop switch
        {
            "s1" => (44.4300, 26.1000),
            "s2" => (44.4320, 26.1020),
            _ => (44.4340, 26.1040),
        };
        db.Execute("INSERT INTO vehicles VALUES (@id, @route, @lat, @lng, 0, null, @timestamp, @updatedAt)",
            new { id, route, lat, lng, timestamp, updatedAt });
    }

    [Fact]
    public void LiveArrival_CarriesPositionAgeAndEstimateFlag()
    {
        var db = SetupDb();
        AddVehicle(db, "v1", "r1", "s2", timestamp: Now - 30, updatedAt: Now);

        var a = new ArrivalsService().GetArrivals(db, "s4", Now)!.Arrivals.Single();

        Assert.Equal(44.4320, a.Lat);
        Assert.Equal(26.1020, a.Lng);
        Assert.Equal(30, a.LastSeenSeconds);
        Assert.Equal("live", a.Freshness);
        Assert.True(a.IsLive);
        Assert.True(a.IsEstimate);
    }

    [Fact]
    public void ThreeMinuteOldVehicle_IsStaleWithLastSeen()
    {
        var db = SetupDb();
        AddVehicle(db, "v1", "r1", "s2", timestamp: Now - 180, updatedAt: Now);

        var a = new ArrivalsService().GetArrivals(db, "s4", Now)!.Arrivals.Single();

        Assert.Equal("stale", a.Freshness);
        Assert.False(a.IsLive);
        Assert.Equal(180, a.LastSeenSeconds);
    }

    [Fact]
    public void UnknownReportTime_UsesPollTime()
    {
        var db = SetupDb();
        AddVehicle(db, "v1", "r1", "s2", timestamp: 0, updatedAt: Now - 20);

        var a = new ArrivalsService().GetArrivals(db, "s4", Now)!.Arrivals.Single();

        Assert.Equal(20, a.LastSeenSeconds);
        Assert.Equal("live", a.Freshness);
    }

    [Fact]
    public void ElevenMinuteOldVehicle_IsExcluded()
    {
        var db = SetupDb();
        AddVehicle(db, "old", "r1", "s2", timestamp: Now - 660, updatedAt: Now);
        AddVehicle(db, "oldUnknown", "r1", "s2", timestamp: 0, updatedAt: Now - 660);

        var resp = new ArrivalsService().GetArrivals(db, "s4", Now)!;

        Assert.Empty(resp.Arrivals);
    }

    [Fact]
    public void StaleArrival_SortsAfterLiveInItsGroup_EvenWhenCloser()
    {
        var db = SetupDb();
        AddVehicle(db, "staleNear", "r1", "s3", timestamp: Now - 200, updatedAt: Now);
        AddVehicle(db, "liveFar", "r1", "s1", timestamp: Now - 10, updatedAt: Now);

        var arrivals = new ArrivalsService().GetArrivals(db, "s4", Now)!.Arrivals;

        Assert.Equal(["liveFar", "staleNear"], arrivals.Select(a => a.VehicleId));
        Assert.True(arrivals[1].EtaSeconds < arrivals[0].EtaSeconds);
    }

    [Fact]
    public void Peek_FiltersToRequestedRoutes()
    {
        var db = SetupDb();
        AddVehicle(db, "v1", "r1", "s2", timestamp: Now, updatedAt: Now);
        AddVehicle(db, "v2", "r2", "s3", timestamp: Now, updatedAt: Now);

        var peek = new ArrivalsService().Peek(db, ["s4"], ["r1"], Now);

        Assert.Equal("r1", peek["s4"].Soonest.Single().RouteId);
    }

    [Fact]
    public void Peek_WithoutRouteFilter_ReturnsUpToTwoAcrossRoutes()
    {
        var db = SetupDb();
        AddVehicle(db, "v1", "r1", "s2", timestamp: Now, updatedAt: Now);
        AddVehicle(db, "v1b", "r1", "s3", timestamp: Now, updatedAt: Now);
        AddVehicle(db, "v2", "r2", "s1", timestamp: Now, updatedAt: Now);

        var soonest = new ArrivalsService().Peek(db, ["s4"], null, Now)["s4"].Soonest;

        Assert.Equal(["v1b", "v2"], soonest.Select(a => a.VehicleId));
    }

    [Fact]
    public void Peek_PrefersLiveOverStaleWithinARouteDirection()
    {
        var db = SetupDb();
        AddVehicle(db, "staleNear", "r1", "s3", timestamp: Now - 200, updatedAt: Now);
        AddVehicle(db, "liveFar", "r1", "s1", timestamp: Now, updatedAt: Now);

        var soonest = new ArrivalsService().Peek(db, ["s4"], null, Now)["s4"].Soonest;

        Assert.Equal("liveFar", soonest.Single().VehicleId);
    }

    [Fact]
    public void Peek_FallsBackToFlaggedStaleWhenNoLive()
    {
        var db = SetupDb();
        AddVehicle(db, "staleOnly", "r1", "s2", timestamp: Now - 200, updatedAt: Now);
        AddVehicle(db, "live", "r2", "s1", timestamp: Now, updatedAt: Now);

        var soonest = new ArrivalsService().Peek(db, ["s4"], null, Now)["s4"].Soonest;

        Assert.Equal(["live", "staleOnly"], soonest.Select(a => a.VehicleId));
        Assert.Equal("stale", soonest[1].Freshness);
    }

    [Fact]
    public void Peek_UnknownStopGetsEmptyList()
    {
        var db = SetupDb();

        var peek = new ArrivalsService().Peek(db, ["nope", "nope"], null, Now);

        Assert.Empty(peek["nope"].Soonest);
    }
}
