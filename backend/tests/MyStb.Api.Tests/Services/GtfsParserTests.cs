using System.IO.Compression;
using System.Text;
using MyStb.Api.Models;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class GtfsParserTests
{
    private static Stream CreateTestGtfsZip(Dictionary<string, string> files)
    {
        var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, content) in files)
            {
                var entry = archive.CreateEntry(name);
                using var writer = new StreamWriter(entry.Open(), Encoding.UTF8);
                writer.Write(content);
            }
        }
        ms.Position = 0;
        return ms;
    }

    // --- ParseStops ---

    [Fact]
    public void ParseStops_ReturnsStopsFromCsv()
    {
        var csv = "stop_id,stop_name,stop_lat,stop_lon\n" +
                  "S1,Stop One,46.123,21.456\n" +
                  "S2,Stop Two,46.789,21.012\n";
        using var zip = CreateTestGtfsZip(new() { ["stops.txt"] = csv });

        var stops = GtfsParser.ParseStops(zip).ToList();

        Assert.Equal(2, stops.Count);
        Assert.Equal(new Stop("S1", "Stop One", 46.123, 21.456), stops[0]);
        Assert.Equal(new Stop("S2", "Stop Two", 46.789, 21.012), stops[1]);
    }

    [Fact]
    public void ParseStops_EmptyFile_ReturnsEmpty()
    {
        var csv = "stop_id,stop_name,stop_lat,stop_lon\n";
        using var zip = CreateTestGtfsZip(new() { ["stops.txt"] = csv });

        var stops = GtfsParser.ParseStops(zip).ToList();

        Assert.Empty(stops);
    }

    // --- ParseRoutes ---

    [Fact]
    public void ParseRoutes_ReturnsRoutesFromCsv()
    {
        var csv = "route_id,route_short_name,route_long_name,route_type\n" +
                  "R1,1,Route One,3\n" +
                  "R2,2,Route Two,0\n";
        using var zip = CreateTestGtfsZip(new() { ["routes.txt"] = csv });

        var routes = GtfsParser.ParseRoutes(zip).ToList();

        Assert.Equal(2, routes.Count);
        Assert.Equal(new Route("R1", "1", "Route One", 3), routes[0]);
        Assert.Equal(new Route("R2", "2", "Route Two", 0), routes[1]);
    }

    [Fact]
    public void ParseRoutes_EmptyFile_ReturnsEmpty()
    {
        var csv = "route_id,route_short_name,route_long_name,route_type\n";
        using var zip = CreateTestGtfsZip(new() { ["routes.txt"] = csv });

        var routes = GtfsParser.ParseRoutes(zip).ToList();

        Assert.Empty(routes);
    }

    // --- ParseRouteStops ---

    [Fact]
    public void ParseRouteStops_JoinsTripsAndStopTimes()
    {
        var trips = "route_id,trip_id,direction_id\n" +
                    "R1,T1,0\n" +
                    "R1,T2,1\n";
        var stopTimes = "trip_id,stop_id,stop_sequence\n" +
                        "T1,S1,1\n" +
                        "T1,S2,2\n" +
                        "T2,S3,1\n";
        using var zip = CreateTestGtfsZip(new()
        {
            ["trips.txt"] = trips,
            ["stop_times.txt"] = stopTimes
        });

        var routeStops = GtfsParser.ParseRouteStops(zip).ToList();

        Assert.Equal(3, routeStops.Count);
        Assert.Contains(new RouteStop("R1", "S1", 0, 1), routeStops);
        Assert.Contains(new RouteStop("R1", "S2", 0, 2), routeStops);
        Assert.Contains(new RouteStop("R1", "S3", 1, 1), routeStops);
    }

    [Fact]
    public void ParseRouteStops_DeduplicatesByRouteStopDirection()
    {
        // Two trips on same route+direction visiting the same stop should produce one entry
        var trips = "route_id,trip_id,direction_id\n" +
                    "R1,T1,0\n" +
                    "R1,T2,0\n";
        var stopTimes = "trip_id,stop_id,stop_sequence\n" +
                        "T1,S1,1\n" +
                        "T1,S2,2\n" +
                        "T2,S1,1\n" +
                        "T2,S2,2\n";
        using var zip = CreateTestGtfsZip(new()
        {
            ["trips.txt"] = trips,
            ["stop_times.txt"] = stopTimes
        });

        var routeStops = GtfsParser.ParseRouteStops(zip).ToList();

        Assert.Equal(2, routeStops.Count);
        Assert.Contains(new RouteStop("R1", "S1", 0, 1), routeStops);
        Assert.Contains(new RouteStop("R1", "S2", 0, 2), routeStops);
    }

    // --- ParseShapePoints ---

    [Fact]
    public void ParseShapePoints_ReturnsShapePointsFromCsv()
    {
        var csv = "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\n" +
                  "SH1,46.1,21.2,1\n" +
                  "SH1,46.3,21.4,2\n" +
                  "SH2,47.0,22.0,1\n";
        using var zip = CreateTestGtfsZip(new() { ["shapes.txt"] = csv });

        var points = GtfsParser.ParseShapePoints(zip).ToList();

        Assert.Equal(3, points.Count);
        Assert.Equal(new ShapePoint("SH1", 46.1, 21.2, 1), points[0]);
        Assert.Equal(new ShapePoint("SH1", 46.3, 21.4, 2), points[1]);
        Assert.Equal(new ShapePoint("SH2", 47.0, 22.0, 1), points[2]);
    }

    [Fact]
    public void ParseShapePoints_EmptyFile_ReturnsEmpty()
    {
        var csv = "shape_id,shape_pt_lat,shape_pt_lon,shape_pt_sequence\n";
        using var zip = CreateTestGtfsZip(new() { ["shapes.txt"] = csv });

        var points = GtfsParser.ParseShapePoints(zip).ToList();

        Assert.Empty(points);
    }

    // --- ParseRouteShapes ---

    [Fact]
    public void ParseRouteShapes_ExtractsFirstShapePerRouteAndDirection()
    {
        var trips = "route_id,trip_id,direction_id,shape_id\n" +
                    "R1,T1,0,SH1\n" +
                    "R1,T2,0,SH2\n" +  // duplicate route+direction, should keep SH1
                    "R1,T3,1,SH3\n" +
                    "R2,T4,0,SH4\n";
        using var zip = CreateTestGtfsZip(new() { ["trips.txt"] = trips });

        var routeShapes = GtfsParser.ParseRouteShapes(zip).ToList();

        Assert.Equal(3, routeShapes.Count);
        Assert.Contains(new RouteShape("R1", 0, "SH1"), routeShapes);
        Assert.Contains(new RouteShape("R1", 1, "SH3"), routeShapes);
        Assert.Contains(new RouteShape("R2", 0, "SH4"), routeShapes);
    }

    [Fact]
    public void ParseRouteShapes_EmptyFile_ReturnsEmpty()
    {
        var trips = "route_id,trip_id,direction_id,shape_id\n";
        using var zip = CreateTestGtfsZip(new() { ["trips.txt"] = trips });

        var routeShapes = GtfsParser.ParseRouteShapes(zip).ToList();

        Assert.Empty(routeShapes);
    }
}
