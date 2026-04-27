using System.Data;
using Dapper;
using MyStb.Api.Models;

namespace MyStb.Api.Services;

public class RouteDetailService
{
    private const double AverageSpeedMps = 5.0;
    private const int LiveThresholdSeconds = 90;

    public record RouteSummary(string Id, string ShortName, string LongName, int RouteType, string Mode);
    public record Terminus(string StopId, string Name);
    public record SchematicStopDto(
        string Id,
        string Name,
        int Sequence,
        bool IsTerminus,
        int? EtaSeconds);
    public record VehicleDto(
        string Id,
        string RouteId,
        double Lat,
        double Lng,
        int DirectionId,
        string Direction,
        long UpdatedAt,
        bool IsLive,
        string? NextStopId,
        int? NextStopEtaSeconds);
    public record RouteDetailResponse(
        RouteSummary Route,
        Terminus? TerminusA,
        Terminus? TerminusB,
        string Direction,
        List<SchematicStopDto> Stops,
        List<VehicleDto> Vehicles,
        List<ServiceAlert> Alerts,
        string ServerTime);

    private record RouteRow(string Id, string ShortName, string LongName, long RouteType);
    private record StopRow(string Id, string Name, double Lat, double Lng, long Sequence);
    private record VehicleRow(string Id, string RouteId, double Lat, double Lng, long DirectionId, long UpdatedAt);

    public RouteDetailResponse? Get(IDbConnection db, string routeId, string direction, IAlertsProvider alerts, DateTimeOffset now)
    {
        var route = db.QueryFirstOrDefault<RouteRow>(
            "SELECT id AS Id, short_name AS ShortName, long_name AS LongName, type AS RouteType FROM routes WHERE id = @Id",
            new { Id = routeId });
        if (route is null) return null;

        var dirId = direction == "b" ? 1 : 0;

        var stopsForward = db.Query<StopRow>(
            """
            SELECT s.id AS Id, s.name AS Name, s.lat AS Lat, s.lng AS Lng, rs.stop_sequence AS Sequence
            FROM route_stops rs
            JOIN stops s ON s.id = rs.stop_id
            WHERE rs.route_id = @RouteId AND rs.direction_id = 0
            ORDER BY rs.stop_sequence
            """,
            new { RouteId = routeId }).ToList();

        var stopsReverse = db.Query<StopRow>(
            """
            SELECT s.id AS Id, s.name AS Name, s.lat AS Lat, s.lng AS Lng, rs.stop_sequence AS Sequence
            FROM route_stops rs
            JOIN stops s ON s.id = rs.stop_id
            WHERE rs.route_id = @RouteId AND rs.direction_id = 1
            ORDER BY rs.stop_sequence
            """,
            new { RouteId = routeId }).ToList();

        var stops = dirId == 0 ? stopsForward : stopsReverse;
        if (stops.Count == 0) stops = dirId == 0 ? stopsReverse : stopsForward; // fall back if only one direction exists

        Terminus? terminusA = stopsForward.Count > 0 ? new Terminus(stopsForward[^1].Id, stopsForward[^1].Name) : null;
        Terminus? terminusB = stopsReverse.Count > 0 ? new Terminus(stopsReverse[^1].Id, stopsReverse[^1].Name) : null;

        var vehicles = db.Query<VehicleRow>(
            """
            SELECT id AS Id, route_id AS RouteId, lat AS Lat, lng AS Lng,
                   direction_id AS DirectionId, updated_at AS UpdatedAt
            FROM vehicles
            WHERE route_id = @RouteId AND direction_id = @DirectionId
            """,
            new { RouteId = routeId, DirectionId = dirId }).ToList();

        var nowUnix = now.ToUnixTimeSeconds();

        var schematic = stops
            .Select(s => new SchematicStopDto(
                Id: s.Id,
                Name: s.Name,
                Sequence: (int)s.Sequence,
                IsTerminus: s.Sequence == stops.First().Sequence || s.Sequence == stops.Last().Sequence,
                EtaSeconds: null))
            .ToList();

        var vehicleDtos = new List<VehicleDto>();
        foreach (var v in vehicles)
        {
            var (nextIdx, _) = ProjectToNextStop(v, stops);
            string? nextStopId = null;
            int? nextEta = null;
            if (nextIdx is not null && nextIdx.Value < stops.Count)
            {
                var nextStop = stops[nextIdx.Value];
                nextStopId = nextStop.Id;
                var meters = GeoUtils.HaversineMeters(v.Lat, v.Lng, nextStop.Lat, nextStop.Lng);
                nextEta = Math.Max(0, (int)Math.Round(meters / AverageSpeedMps));
            }
            vehicleDtos.Add(new VehicleDto(
                Id: v.Id,
                RouteId: v.RouteId,
                Lat: v.Lat,
                Lng: v.Lng,
                DirectionId: (int)v.DirectionId,
                Direction: v.DirectionId == 0 ? "a" : "b",
                UpdatedAt: v.UpdatedAt,
                IsLive: nowUnix - v.UpdatedAt <= LiveThresholdSeconds,
                NextStopId: nextStopId,
                NextStopEtaSeconds: nextEta));
        }

        var routeAlerts = alerts.GetActiveForRoute(routeId, now)
            .OrderByDescending(a => SeverityRank(a.Severity))
            .ThenByDescending(a => a.StartsAt ?? DateTimeOffset.MinValue)
            .ToList();

        var mode = ModeForRouteType((int)route.RouteType, route.ShortName);

        return new RouteDetailResponse(
            Route: new RouteSummary(route.Id, route.ShortName, route.LongName, (int)route.RouteType, mode),
            TerminusA: terminusA,
            TerminusB: terminusB,
            Direction: direction,
            Stops: schematic,
            Vehicles: vehicleDtos,
            Alerts: routeAlerts,
            ServerTime: now.ToString("yyyy-MM-ddTHH:mm:sszzz"));
    }

    private static (int? NextStopIndex, double DistanceMeters) ProjectToNextStop(VehicleRow vehicle, List<StopRow> stops)
    {
        if (stops.Count == 0) return (null, 0);
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
        // The "next stop" is the stop at closestIdx if vehicle hasn't arrived; otherwise the one after.
        // Treat the vehicle as just-left the closest stop; next is min(closestIdx + 1, last).
        var nextIdx = Math.Min(closestIdx + 1, stops.Count - 1);
        return (nextIdx, closestDist);
    }

    private static int SeverityRank(string severity) => severity?.ToLowerInvariant() switch
    {
        "critical" => 3,
        "warning" => 2,
        "info" => 1,
        _ => 0,
    };

    private static string ModeForRouteType(int type, string shortName)
    {
        if (type == 1)
        {
            var sn = shortName?.ToUpperInvariant();
            return sn switch
            {
                "M1" => "m1",
                "M2" => "m2",
                "M3" => "m3",
                "M4" => "m4",
                "M5" => "m5",
                _ => "m1",
            };
        }
        return type switch
        {
            0 => "tram",
            11 => "trolley",
            _ => "bus",
        };
    }
}
