using System.Data;
using Dapper;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class SearchServiceTests
{
    private static IDbConnection SetupDb()
    {
        var db = TestDb.Create();
        // Stops to test prefix vs substring ranking
        db.Execute("INSERT INTO stops VALUES ('s1','Piața Romană',44.4486,26.0966)");
        db.Execute("INSERT INTO stops VALUES ('s2','Apărătorii Patriei',44.3850,26.1280)");
        db.Execute("INSERT INTO stops VALUES ('s3','Piața Unirii',44.4280,26.1027)");
        // Routes
        db.Execute("INSERT INTO routes VALUES ('r41','41','Drumul Taberei – Piața Presei',0)");
        db.Execute("INSERT INTO routes VALUES ('r178','178','Magheru – Pantelimon',3)");
        db.Execute("INSERT INTO routes VALUES ('rM2','M2','Pipera – Berceni',1)");
        // Route stops so SearchStops returns lines per stop
        db.Execute("INSERT INTO route_stops VALUES ('r41','s1',0,1)");
        db.Execute("INSERT INTO route_stops VALUES ('r178','s1',0,1)");
        return db;
    }

    [Fact]
    public void Score_PrefixOutranksSubstring()
    {
        var prefix = SearchService.Score("Piața Romană", "pia");
        var substr = SearchService.Score("Apărătorii Patriei", "pa");
        Assert.NotNull(prefix);
        Assert.NotNull(substr);
        Assert.True(prefix > substr);
    }

    [Fact]
    public void SearchStops_PrefixRanksBeforeSubstring()
    {
        var db = SetupDb();
        var svc = new SearchService();
        var hits = svc.SearchStops(db, "pia", null, null, 10);
        Assert.NotEmpty(hits);
        Assert.Equal("s1", hits[0].Id); // Piața Romană (prefix)
    }

    [Fact]
    public void SearchStops_BoostsByDistanceWhenLatLngProvided()
    {
        var db = SetupDb();
        var svc = new SearchService();
        // Both Piața stops match "pia"; ranking should put the closer one first when tied on prefix.
        var hitsRomana = svc.SearchStops(db, "Piața", 44.4486, 26.0966, 10);
        var hitsUnirii = svc.SearchStops(db, "Piața", 44.4280, 26.1027, 10);
        Assert.NotEmpty(hitsRomana);
        Assert.NotEmpty(hitsUnirii);
        Assert.Equal("s1", hitsRomana[0].Id);
        Assert.Equal("s3", hitsUnirii[0].Id);
    }

    [Fact]
    public void SearchStops_IncludesServingRoutes()
    {
        var db = SetupDb();
        var svc = new SearchService();
        var hits = svc.SearchStops(db, "Romană", null, null, 5);
        Assert.NotEmpty(hits);
        Assert.Contains(hits, h => h.Id == "s1");
        var first = hits.First(h => h.Id == "s1");
        Assert.Contains("41", first.Routes);
        Assert.Contains("178", first.Routes);
    }

    [Fact]
    public void SearchRoutes_ShortNamePrefixWins()
    {
        var db = SetupDb();
        var svc = new SearchService();
        var hits = svc.SearchRoutes(db, "41", 10);
        Assert.NotEmpty(hits);
        Assert.Equal("r41", hits[0].Id);
    }

    [Fact]
    public void SearchRoutes_LongNameSubstringMatches()
    {
        var db = SetupDb();
        var svc = new SearchService();
        var hits = svc.SearchRoutes(db, "Pantelimon", 10);
        Assert.NotEmpty(hits);
        Assert.Contains(hits, h => h.Id == "r178");
    }
}
