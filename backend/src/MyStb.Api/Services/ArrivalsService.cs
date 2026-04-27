using System.Data;
using Dapper;

namespace MyStb.Api.Services;

public class ArrivalsService
{
    private const double AverageSpeedMps = 5.0; // ~18 km/h, accounts for stops
    private const int LiveThresholdSeconds = 90;
    private const int MaxPerDirection = 5;

    public record Arrival(
        string RouteId,
        string ShortName,
        int RouteType,
        string VehicleId,
        string Direction,
        int DirectionId,
        string DestinationStopId,
        string DestinationName,
        int EtaSeconds,
        bool IsLive,
        bool IsCancelled);

    public record ArrivalsResponse(string StopId, string ServerTime, List<Arrival> Arrivals);

    public record StopWithRoutes(string Id, string Name, double Lat, double Lng, List<RouteSummary> Routes);
    public record RouteSummary(string Id, string ShortName, int RouteType);
    private record RouteSummaryRow(string Id, string ShortName, long RouteType);

    private record StopRow(string Id, string Name, double Lat, double Lng);
    private record ServingRouteRow(string RouteId, string ShortName, long RouteType, long DirectionId, long StopSequence);
    private record RouteStopRow(string StopId, string Name, double Lat, double Lng, long StopSequence);
    private record VehicleRow(string Id, string RouteId, double Lat, double Lng, long DirectionId, long UpdatedAt);

    public StopWithRoutes? GetStop(IDbConnection db, string stopId)
    {
        var stop = db.QueryFirstOrDefault<StopRow>(
            "SELECT id AS Id, name AS Name, lat AS Lat, lng AS Lng FROM stops WHERE id = @Id",
            new { Id = stopId });
        if (stop is null) return null;

        var routeRows = db.Query<RouteSummaryRow>(
            """
            SELECT DISTINCT r.id AS Id, r.short_name AS ShortName, r.type AS RouteType
            FROM route_stops rs
            JOIN routes r ON r.id = rs.route_id
            WHERE rs.stop_id = @StopId
            ORDER BY CAST(r.short_name AS INTEGER), r.short_name
            """,
            new { StopId = stopId }).ToList();

        var routes = routeRows.Select(r => new RouteSummary(r.Id, r.ShortName, (int)r.RouteType)).ToList();
        return new StopWithRoutes(stop.Id, stop.Name, stop.Lat, stop.Lng, routes);
    }

    public ArrivalsResponse? GetArrivals(IDbConnection db, string stopId, long nowUnix)
    {
        var stop = db.QueryFirstOrDefault<StopRow>(
            "SELECT id AS Id, name AS Name, lat AS Lat, lng AS Lng FROM stops WHERE id = @Id",
            new { Id = stopId });
        if (stop is null) return null;

        var serving = db.Query<ServingRouteRow>(
            """
            SELECT rs.route_id AS RouteId,
                   r.short_name AS ShortName,
                   r.type AS RouteType,
                   rs.direction_id AS DirectionId,
                   rs.stop_sequence AS StopSequence
            FROM route_stops rs
            JOIN routes r ON r.id = rs.route_id
            WHERE rs.stop_id = @StopId
            """,
            new { StopId = stopId }).ToList();

        if (serving.Count == 0)
            return new ArrivalsResponse(stopId, FormatServerTime(nowUnix), []);

        var arrivals = new List<Arrival>();

        foreach (var leg in serving)
        {
            var stopsInDirection = db.Query<RouteStopRow>(
                """
                SELECT rs.stop_id AS StopId,
                       s.name AS Name,
                       s.lat AS Lat,
                       s.lng AS Lng,
                       rs.stop_sequence AS StopSequence
                FROM route_stops rs
                JOIN stops s ON s.id = rs.stop_id
                WHERE rs.route_id = @RouteId AND rs.direction_id = @DirectionId
                ORDER BY rs.stop_sequence
                """,
                new { leg.RouteId, leg.DirectionId }).ToList();

            if (stopsInDirection.Count == 0) continue;

            var terminus = stopsInDirection[^1];

            var vehicles = db.Query<VehicleRow>(
                """
                SELECT id AS Id, route_id AS RouteId, lat AS Lat, lng AS Lng,
                       direction_id AS DirectionId, updated_at AS UpdatedAt
                FROM vehicles
                WHERE route_id = @RouteId AND direction_id = @DirectionId
                """,
                new { leg.RouteId, leg.DirectionId }).ToList();

            var perDirection = new List<Arrival>();

            foreach (var v in vehicles)
            {
                var (vehicleSeq, distanceFromVehicleToVehicleStop) = ProjectVehicleToSequence(v, stopsInDirection);
                if (vehicleSeq is null) continue;
                if (vehicleSeq.Value >= leg.StopSequence) continue;

                var meters = DistanceAlongRoute(stopsInDirection, vehicleSeq.Value, (int)leg.StopSequence)
                             + distanceFromVehicleToVehicleStop;
                var etaSeconds = Math.Max(0, (int)Math.Round(meters / AverageSpeedMps));
                var isLive = (nowUnix - v.UpdatedAt) <= LiveThresholdSeconds;

                perDirection.Add(new Arrival(
                    RouteId: leg.RouteId,
                    ShortName: leg.ShortName,
                    RouteType: (int)leg.RouteType,
                    VehicleId: v.Id,
                    Direction: leg.DirectionId == 0 ? "a" : "b",
                    DirectionId: (int)leg.DirectionId,
                    DestinationStopId: terminus.StopId,
                    DestinationName: terminus.Name,
                    EtaSeconds: etaSeconds,
                    IsLive: isLive,
                    IsCancelled: false));
            }

            arrivals.AddRange(perDirection
                .OrderBy(a => a.EtaSeconds)
                .Take(MaxPerDirection));
        }

        arrivals = arrivals.OrderBy(a => a.EtaSeconds).ToList();
        return new ArrivalsResponse(stopId, FormatServerTime(nowUnix), arrivals);
    }

    private static string FormatServerTime(long unix) =>
        DateTimeOffset.FromUnixTimeSeconds(unix).ToString("yyyy-MM-ddTHH:mm:sszzz");

    private static (int? SequenceIndexBeforeOrAt, double DistanceFromVehicleToThatStop) ProjectVehicleToSequence(
        VehicleRow vehicle,
        List<RouteStopRow> stops)
    {
        // Find the stop in the sequence whose lat/lng is closest to the vehicle.
        // Treat the vehicle as having passed up to that stop.
        var closestIdx = -1;
        var closestDist = double.MaxValue;
        for (var i = 0; i < stops.Count; i++)
        {
            var d = GeoUtils.HaversineMeters(vehicle.Lat, vehicle.Lng, stops[i].Lat, stops[i].Lng);
            if (d < closestDist)
            {
                closestDist = d;
                closestIdx = i;
            }
        }
        if (closestIdx < 0) return (null, 0);
        return ((int)stops[closestIdx].StopSequence, closestDist);
    }

    private static double DistanceAlongRoute(List<RouteStopRow> stops, int fromSequence, int toSequence)
    {
        if (fromSequence >= toSequence) return 0;
        var total = 0d;
        for (var i = 0; i < stops.Count - 1; i++)
        {
            var a = stops[i];
            var b = stops[i + 1];
            if (a.StopSequence < fromSequence || b.StopSequence > toSequence) continue;
            total += GeoUtils.HaversineMeters(a.Lat, a.Lng, b.Lat, b.Lng);
        }
        return total;
    }
}
