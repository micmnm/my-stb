using System.Data;
using Dapper;
using MyStb.Api.Models;

namespace MyStb.Api.Services;

public class RouteCalculatorService
{
    private record NearbyStop(string Id, string Name, double Lat, double Lng, double Distance);

    private record RouteStopRow(
        string RouteId, string ShortName, long RouteType,
        string StopId, string StopName, double StopLat, double StopLng,
        long DirectionId, long StopSequence);

    public List<RouteOption> FindDirectRoutes(
        IDbConnection db,
        double fromLat, double fromLng,
        double toLat, double toLng,
        double radiusMeters = 500)
    {
        var originStops = FindNearbyStops(db, fromLat, fromLng, radiusMeters);
        var destStops = FindNearbyStops(db, toLat, toLng, radiusMeters);

        if (originStops.Count == 0 || destStops.Count == 0)
            return [];

        var originStopIds = originStops.Select(s => s.Id).ToHashSet();
        var destStopIds = destStops.Select(s => s.Id).ToHashSet();
        var allStopIds = originStopIds.Union(destStopIds).ToList();

        var rows = db.Query<RouteStopRow>(
            """
            SELECT rs.route_id AS RouteId,
                   r.short_name AS ShortName,
                   r.type AS RouteType,
                   rs.stop_id AS StopId,
                   s.name AS StopName,
                   s.lat AS StopLat,
                   s.lng AS StopLng,
                   rs.direction_id AS DirectionId,
                   rs.stop_sequence AS StopSequence
            FROM route_stops rs
            JOIN routes r ON r.id = rs.route_id
            JOIN stops s ON s.id = rs.stop_id
            WHERE rs.stop_id IN @StopIds
            """,
            new { StopIds = allStopIds }).ToList();

        var groups = rows.GroupBy(r => (r.RouteId, r.DirectionId));

        var originStopMap = originStops.ToDictionary(s => s.Id);
        var destStopMap = destStops.ToDictionary(s => s.Id);

        var results = new List<RouteOption>();

        foreach (var group in groups)
        {
            var stopsInGroup = group.OrderBy(s => s.StopSequence).ToList();

            // Find origin candidates (stops in both the route and the origin set)
            var originCandidates = stopsInGroup
                .Where(s => originStopIds.Contains(s.StopId))
                .OrderBy(s => originStopMap[s.StopId].Distance)
                .ToList();

            if (originCandidates.Count == 0) continue;

            // Pick the closest origin stop to the user
            var bestOrigin = originCandidates[0];

            // Find dest candidates that come AFTER the origin stop in sequence
            var destCandidates = stopsInGroup
                .Where(s => destStopIds.Contains(s.StopId) && s.StopSequence > bestOrigin.StopSequence)
                .OrderBy(s => destStopMap[s.StopId].Distance)
                .ToList();

            if (destCandidates.Count == 0) continue;

            var bestDest = destCandidates[0];

            var originDistance = originStopMap[bestOrigin.StopId].Distance;
            var destDistance = destStopMap[bestDest.StopId].Distance;
            var lastMileDistance = GeoUtils.HaversineMeters(bestDest.StopLat, bestDest.StopLng, toLat, toLng);
            var stopCount = (int)(bestDest.StopSequence - bestOrigin.StopSequence);
            var direction = bestOrigin.DirectionId == 0 ? "outbound" : "inbound";

            var eta = EstimateEta(db, group.Key.RouteId, (int)group.Key.DirectionId, (int)bestOrigin.StopSequence);
            var shapeCoords = GetShapeCoords(db, group.Key.RouteId, (int)group.Key.DirectionId);

            results.Add(new RouteOption(
                RouteId: group.Key.RouteId,
                ShortName: bestOrigin.ShortName,
                RouteType: (int)bestOrigin.RouteType,
                Direction: direction,
                DirectionId: (int)bestOrigin.DirectionId,
                OriginStopId: bestOrigin.StopId,
                OriginStopName: bestOrigin.StopName,
                OriginStopDistance: Math.Round(originDistance, 1),
                DestStopId: bestDest.StopId,
                DestStopName: bestDest.StopName,
                DestStopDistance: Math.Round(destDistance, 1),
                LastMileDistance: Math.Round(lastMileDistance, 1),
                StopCount: stopCount,
                EstimatedMinutes: eta,
                ShapeCoords: shapeCoords
            ));
        }

        return results
            .OrderBy(r => r.EstimatedMinutes ?? int.MaxValue)
            .ThenBy(r => r.OriginStopDistance)
            .ToList();
    }

    private List<NearbyStop> FindNearbyStops(IDbConnection db, double lat, double lng, double radiusMeters)
    {
        var bbox = GeoUtils.BoundingBox(lat, lng, radiusMeters);

        var candidates = db.Query<NearbyStop>(
            """
            SELECT id AS Id, name AS Name, lat AS Lat, lng AS Lng, 0.0 AS Distance
            FROM stops
            WHERE lat BETWEEN @MinLat AND @MaxLat
              AND lng BETWEEN @MinLng AND @MaxLng
            """,
            new { MinLat = bbox.MinLat, MaxLat = bbox.MaxLat, MinLng = bbox.MinLng, MaxLng = bbox.MaxLng })
            .ToList();

        return candidates
            .Select(s => s with { Distance = GeoUtils.HaversineMeters(lat, lng, s.Lat, s.Lng) })
            .Where(s => s.Distance <= radiusMeters)
            .OrderBy(s => s.Distance)
            .ToList();
    }

    private static int? EstimateEta(IDbConnection db, string routeId, int directionId, int originSequence)
    {
        // Placeholder: return 5 minutes. Real ETA from vehicle positions is a future refinement.
        return 5;
    }

    private static List<double[]>? GetShapeCoords(IDbConnection db, string routeId, int directionId)
    {
        var shapeId = db.QueryFirstOrDefault<string>(
            """
            SELECT shape_id FROM route_shapes
            WHERE route_id = @RouteId AND direction_id = @DirectionId
            """,
            new { RouteId = routeId, DirectionId = directionId });

        if (shapeId is null) return null;

        var points = db.Query<(double Lat, double Lng)>(
            """
            SELECT lat AS Lat, lng AS Lng FROM shape_points
            WHERE shape_id = @ShapeId
            ORDER BY sequence
            """,
            new { ShapeId = shapeId }).ToList();

        return points.Count == 0 ? null : points.Select(p => new[] { p.Lat, p.Lng }).ToList();
    }
}
