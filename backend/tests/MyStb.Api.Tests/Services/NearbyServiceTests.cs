using System.Data;
using Dapper;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class NearbyServiceTests
{
    private static IDbConnection SetupDb()
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','Stop A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Stop B',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Far',44.5000,26.2000)");
        db.Execute("INSERT INTO routes VALUES ('r1','41','Tram',0)");
        db.Execute("INSERT INTO routes VALUES ('r2','178','Bus',3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r2','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',0,2)");
        return db;
    }

    [Fact]
    public void Find_OrdersByDistanceAndIncludesRoutes()
    {
        var db = SetupDb();
        var svc = new NearbyService();

        var results = svc.Find(db, 44.4300, 26.1000, maxMeters: 1000, limit: 5);

        Assert.NotEmpty(results);
        Assert.Equal("s1", results[0].Id);
        Assert.True(results[0].DistanceMeters < (results.Count > 1 ? results[1].DistanceMeters : int.MaxValue));
        Assert.True(results[0].WalkSeconds >= 0);
        // s1 is on routes r1 (tram, type 0) and r2 (bus, type 3)
        var s1 = results.First(r => r.Id == "s1");
        Assert.Equal(2, s1.Routes.Count);
        Assert.Contains(s1.Routes, r => r.ShortName == "41" && r.RouteType == 0);
        Assert.Contains(s1.Routes, r => r.ShortName == "178" && r.RouteType == 3);
    }

    [Fact]
    public void Find_RespectsMaxMeters()
    {
        var db = SetupDb();
        var svc = new NearbyService();

        var results = svc.Find(db, 44.4300, 26.1000, maxMeters: 100, limit: 10);

        // Far stop should be excluded; s2 (~280m away) likely too.
        Assert.DoesNotContain(results, r => r.Id == "s3");
    }

    [Fact]
    public void Find_RespectsLimit()
    {
        var db = SetupDb();
        var svc = new NearbyService();

        var results = svc.Find(db, 44.4300, 26.1000, maxMeters: 50000, limit: 1);

        Assert.Single(results);
    }
}
