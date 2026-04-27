using System.Data;
using Dapper;

namespace MyStb.Api.Services;

public class NearbyService
{
    private const double WalkSpeedMps = 1.3;

    public record NearbyStop(
        string Id,
        string Name,
        double Lat,
        double Lng,
        int DistanceMeters,
        int WalkSeconds,
        List<NearbyStopRoute> Routes);

    public record NearbyStopRoute(string ShortName, int RouteType);

    private record StopRow(string Id, string Name, double Lat, double Lng);

    public List<NearbyStop> Find(IDbConnection db, double lat, double lng, double maxMeters, int limit)
    {
        if (maxMeters <= 0 || maxMeters > 5000) maxMeters = 500;
        if (limit <= 0 || limit > 50) limit = 5;

        var bbox = GeoUtils.BoundingBox(lat, lng, maxMeters);
        var candidates = db.Query<StopRow>(
            "SELECT id AS Id, name AS Name, lat AS Lat, lng AS Lng FROM stops WHERE lat BETWEEN @MinLat AND @MaxLat AND lng BETWEEN @MinLng AND @MaxLng",
            new { bbox.MinLat, bbox.MaxLat, bbox.MinLng, bbox.MaxLng }).ToList();

        var withDist = candidates
            .Select(s => new { Stop = s, Distance = GeoUtils.HaversineMeters(lat, lng, s.Lat, s.Lng) })
            .Where(x => x.Distance <= maxMeters)
            .OrderBy(x => x.Distance)
            .Take(limit)
            .ToList();

        if (withDist.Count == 0) return [];

        var ids = withDist.Select(x => x.Stop.Id).ToList();
        var routesRows = db.Query<(string StopId, string ShortName, long RouteType)>(
            """
            SELECT DISTINCT rs.stop_id AS StopId, r.short_name AS ShortName, r.type AS RouteType
            FROM route_stops rs
            JOIN routes r ON r.id = rs.route_id
            WHERE rs.stop_id IN @StopIds
            """,
            new { StopIds = ids }).ToList();

        var routesByStop = routesRows
            .GroupBy(r => r.StopId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(r => new NearbyStopRoute(r.ShortName, (int)r.RouteType)).ToList());

        return withDist.Select(x => new NearbyStop(
            Id: x.Stop.Id,
            Name: x.Stop.Name,
            Lat: x.Stop.Lat,
            Lng: x.Stop.Lng,
            DistanceMeters: (int)Math.Round(x.Distance),
            WalkSeconds: (int)Math.Round(x.Distance / WalkSpeedMps),
            Routes: routesByStop.GetValueOrDefault(x.Stop.Id) ?? []
        )).ToList();
    }
}
