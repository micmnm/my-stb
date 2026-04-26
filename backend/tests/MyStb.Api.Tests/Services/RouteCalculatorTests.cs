using System.Data;
using Dapper;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class RouteCalculatorTests
{
    private IDbConnection SetupDb()
    {
        var db = TestDb.Create();
        db.Execute("INSERT INTO stops VALUES ('s1','Stop A',44.4300,26.1000)");
        db.Execute("INSERT INTO stops VALUES ('s2','Stop B',44.4320,26.1020)");
        db.Execute("INSERT INTO stops VALUES ('s3','Stop C',44.4340,26.1040)");
        db.Execute("INSERT INTO stops VALUES ('s4','Stop D',44.4360,26.1060)");
        db.Execute("INSERT INTO routes VALUES ('r1','100','Test Line',3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s2',0,2)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s3',0,3)");
        db.Execute("INSERT INTO route_stops VALUES ('r1','s4',0,4)");
        db.Execute("INSERT INTO vehicles VALUES ('v1','r1',44.4295,26.0995,0,'B-01-AAA',0,0)");
        return db;
    }

    [Fact]
    public void FindRoutes_ReturnsDirectRoute()
    {
        var db = SetupDb();
        var calc = new RouteCalculatorService();
        // Origin near s1, destination near s4
        var results = calc.FindDirectRoutes(db, 44.4302, 26.1002, 44.4358, 26.1058, 500);
        Assert.Single(results);
        var r = results[0];
        Assert.Equal("r1", r.RouteId);
        Assert.Equal("100", r.ShortName);
        Assert.Equal("s1", r.OriginStopId);
        Assert.Equal("s4", r.DestStopId);
        Assert.Equal(3, r.StopCount); // 4 - 1 = 3 stops
    }

    [Fact]
    public void FindRoutes_RespectsDirection()
    {
        var db = SetupDb();
        var calc = new RouteCalculatorService();
        // Origin near s4, destination near s1 — no route in direction 0 goes s4→s1
        var results = calc.FindDirectRoutes(db, 44.4358, 26.1058, 44.4302, 26.1002, 500);
        Assert.Empty(results);
    }
}
