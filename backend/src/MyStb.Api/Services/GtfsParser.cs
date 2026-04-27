using System.Globalization;
using System.IO.Compression;
using CsvHelper;
using CsvHelper.Configuration;
using Route = MyStb.Api.Models.Route;
using MyStb.Api.Models;

namespace MyStb.Api.Services;

public static class GtfsParser
{
    private static CsvConfiguration CsvConfig => new(CultureInfo.InvariantCulture)
    {
        HasHeaderRecord = true,
        MissingFieldFound = null,
    };

    private static StreamReader OpenCsvFromZip(ZipArchive archive, string fileName)
    {
        var entry = archive.GetEntry(fileName)
                    ?? throw new FileNotFoundException($"GTFS zip does not contain {fileName}");
        return new StreamReader(entry.Open());
    }

    public static IEnumerable<Stop> ParseStops(ZipArchive archive)
    {
        using var reader = OpenCsvFromZip(archive, "stops.txt");
        using var csv = new CsvReader(reader, CsvConfig);

        var stops = new List<Stop>();
        foreach (var row in csv.GetRecords<dynamic>())
        {
            stops.Add(new Stop(
                Id: (string)row.stop_id,
                Name: (string)row.stop_name,
                Lat: double.Parse((string)row.stop_lat, CultureInfo.InvariantCulture),
                Lng: double.Parse((string)row.stop_lon, CultureInfo.InvariantCulture)
            ));
        }
        return stops;
    }

    public static IEnumerable<Route> ParseRoutes(ZipArchive archive)
    {
        using var reader = OpenCsvFromZip(archive, "routes.txt");
        using var csv = new CsvReader(reader, CsvConfig);

        var routes = new List<Route>();
        foreach (var row in csv.GetRecords<dynamic>())
        {
            routes.Add(new Route(
                Id: (string)row.route_id,
                ShortName: (string)row.route_short_name,
                LongName: (string)row.route_long_name,
                Type: int.Parse((string)row.route_type, CultureInfo.InvariantCulture)
            ));
        }
        return routes;
    }

    public static IEnumerable<RouteStop> ParseRouteStops(ZipArchive archive)
    {
        // Read trips into a lookup: trip_id -> (route_id, direction_id)
        var trips = new Dictionary<string, (string RouteId, int DirectionId)>();
        using (var reader = OpenCsvFromZip(archive, "trips.txt"))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (var row in csv.GetRecords<dynamic>())
            {
                string tripId = row.trip_id;
                trips[tripId] = (
                    (string)row.route_id,
                    int.Parse((string)row.direction_id, CultureInfo.InvariantCulture)
                );
            }
        }

        // Read stop_times and join with trips, deduplicating by (route_id, stop_id, direction_id)
        var seen = new HashSet<(string RouteId, string StopId, int DirectionId)>();
        var result = new List<RouteStop>();

        using (var reader = OpenCsvFromZip(archive, "stop_times.txt"))
        using (var csv = new CsvReader(reader, CsvConfig))
        {
            foreach (var row in csv.GetRecords<dynamic>())
            {
                string tripId = row.trip_id;
                if (!trips.TryGetValue(tripId, out var trip))
                    continue;

                string stopId = row.stop_id;
                int stopSequence = int.Parse((string)row.stop_sequence, CultureInfo.InvariantCulture);

                if (seen.Add((trip.RouteId, stopId, trip.DirectionId)))
                {
                    result.Add(new RouteStop(
                        RouteId: trip.RouteId,
                        StopId: stopId,
                        DirectionId: trip.DirectionId,
                        StopSequence: stopSequence
                    ));
                }
            }
        }

        return result;
    }

    public static IEnumerable<ShapePoint> ParseShapePoints(ZipArchive archive)
    {
        using var reader = OpenCsvFromZip(archive, "shapes.txt");
        using var csv = new CsvReader(reader, CsvConfig);

        var points = new List<ShapePoint>();
        foreach (var row in csv.GetRecords<dynamic>())
        {
            points.Add(new ShapePoint(
                ShapeId: (string)row.shape_id,
                Lat: double.Parse((string)row.shape_pt_lat, CultureInfo.InvariantCulture),
                Lng: double.Parse((string)row.shape_pt_lon, CultureInfo.InvariantCulture),
                Sequence: int.Parse((string)row.shape_pt_sequence, CultureInfo.InvariantCulture)
            ));
        }
        return points;
    }

    public static IEnumerable<RouteShape> ParseRouteShapes(ZipArchive archive)
    {
        using var reader = OpenCsvFromZip(archive, "trips.txt");
        using var csv = new CsvReader(reader, CsvConfig);

        // Keep only the first shape_id per (route_id, direction_id)
        var mapping = new Dictionary<(string RouteId, int DirectionId), string>();

        foreach (var row in csv.GetRecords<dynamic>())
        {
            string routeId = row.route_id;
            int directionId = int.Parse((string)row.direction_id, CultureInfo.InvariantCulture);
            string shapeId = row.shape_id;

            mapping.TryAdd((routeId, directionId), shapeId);
        }

        return mapping.Select(kv => new RouteShape(
            RouteId: kv.Key.RouteId,
            DirectionId: kv.Key.DirectionId,
            ShapeId: kv.Value
        )).ToList();
    }
}
