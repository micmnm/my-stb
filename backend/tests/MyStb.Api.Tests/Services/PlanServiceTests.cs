using System.Data;
using Dapper;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class PlanServiceTests
{
    private static IDbConnection SetupDb()
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','Origin Stop',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Mid Stop',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Dest Stop',44.4360,26.1060)");
        db.Execute("INSERT INTO routes VALUES ('r1','41','Test Tram',0)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',0,2)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s3',0,3)");
        return db;
    }

    [Fact]
    public void Plan_BuildsTripFromKnownStops()
    {
        var db = SetupDb();
        var svc = new PlanService();
        var now = DateTimeOffset.UtcNow;

        var req = new PlanService.PlanRequest(
            From: new PlanService.PlanLocation("address", null, 44.4302, 26.1002, "Origin"),
            To:   new PlanService.PlanLocation("address", null, 44.4358, 26.1058, "Destination"),
            When: new PlanService.PlanWhen("now", null),
            Modes: null,
            MaxWalkMeters: 500,
            Accessible: false);

        var resp = svc.Plan(db, req, now);

        Assert.NotEmpty(resp.Trips);
        var trip = resp.Trips[0];
        Assert.True(trip.Legs.Count >= 2);
        Assert.IsType<PlanService.WalkLeg>(trip.Legs[0]);
        Assert.IsType<PlanService.TransitLeg>(trip.Legs[1]);
        Assert.True(trip.DurationSeconds > 0);
    }

    [Fact]
    public void Plan_FilterModesExcludesNonMatching()
    {
        var db = SetupDb();
        var svc = new PlanService();
        var now = DateTimeOffset.UtcNow;

        var req = new PlanService.PlanRequest(
            From: new PlanService.PlanLocation("address", null, 44.4302, 26.1002, null),
            To:   new PlanService.PlanLocation("address", null, 44.4358, 26.1058, null),
            When: new PlanService.PlanWhen("now", null),
            Modes: new List<string> { "bus" }, // we only seeded a tram
            MaxWalkMeters: 500,
            Accessible: false);

        var resp = svc.Plan(db, req, now);

        Assert.Empty(resp.Trips);
    }

    [Fact]
    public void Plan_StopKindResolvesByStopId()
    {
        var db = SetupDb();
        var svc = new PlanService();
        var now = DateTimeOffset.UtcNow;

        var req = new PlanService.PlanRequest(
            From: new PlanService.PlanLocation("stop", "s1", null, null, null),
            To:   new PlanService.PlanLocation("stop", "s3", null, null, null),
            When: new PlanService.PlanWhen("now", null),
            Modes: null,
            MaxWalkMeters: 500,
            Accessible: false);

        var resp = svc.Plan(db, req, now);

        Assert.NotEmpty(resp.Trips);
    }
}
