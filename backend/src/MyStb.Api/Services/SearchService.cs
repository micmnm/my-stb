using System.Data;
using Dapper;

namespace MyStb.Api.Services;

public class SearchService
{
    public record StopHit(string Id, string Name, double Lat, double Lng, List<string> Routes, double DistanceMeters);
    public record RouteHit(string Id, string ShortName, string LongName, int RouteType);
    public record AddressHit(string Label, double Lat, double Lng, string? Type);

    public record SearchResponse(List<StopHit> Stops, List<RouteHit> Routes, List<AddressHit> Addresses);

    private record StopRow(string Id, string Name, double Lat, double Lng);
    private record RouteRow(string Id, string ShortName, string LongName, long RouteType);

    /// <summary>
    /// Score a hit: prefix match (case-insensitive) ranks far higher than substring.
    /// Returns null when no match.
    /// </summary>
    public static int? Score(string haystack, string needle)
    {
        if (string.IsNullOrEmpty(needle)) return null;
        var hi = haystack.ToLowerInvariant();
        var ni = needle.ToLowerInvariant();
        if (hi.StartsWith(ni)) return 1000 - haystack.Length;
        var idx = hi.IndexOf(ni, StringComparison.Ordinal);
        if (idx < 0) return null;
        return 100 - idx - haystack.Length / 4;
    }

    public List<StopHit> SearchStops(IDbConnection db, string q, double? lat, double? lng, int limit)
    {
        if (string.IsNullOrWhiteSpace(q)) return [];
        var like = $"%{q}%";
        var rows = db.Query<StopRow>(
            """
            SELECT id AS Id, name AS Name, lat AS Lat, lng AS Lng
            FROM stops
            WHERE LOWER(name) LIKE LOWER(@Like)
            LIMIT 80
            """,
            new { Like = like }).ToList();

        var lookupRoutes = rows.Count == 0 ? new Dictionary<string, List<string>>() : LookupRoutesByStop(db, rows.Select(r => r.Id).ToList());

        return rows
            .Select(s =>
            {
                var score = Score(s.Name, q) ?? 0;
                var distance = lat.HasValue && lng.HasValue
                    ? GeoUtils.HaversineMeters(lat.Value, lng.Value, s.Lat, s.Lng)
                    : 0;
                if (lat.HasValue && distance > 0)
                {
                    // Each 100 m = 1 score point off (closer wins ties).
                    score -= (int)(distance / 100);
                }
                var routes = lookupRoutes.GetValueOrDefault(s.Id) ?? [];
                return (Hit: new StopHit(s.Id, s.Name, s.Lat, s.Lng, routes, Math.Round(distance, 0)), Score: score);
            })
            .OrderByDescending(x => x.Score)
            .Take(limit)
            .Select(x => x.Hit)
            .ToList();
    }

    public List<RouteHit> SearchRoutes(IDbConnection db, string q, int limit)
    {
        if (string.IsNullOrWhiteSpace(q)) return [];
        var like = $"%{q}%";
        var rows = db.Query<RouteRow>(
            """
            SELECT id AS Id, short_name AS ShortName, long_name AS LongName, type AS RouteType
            FROM routes
            WHERE LOWER(short_name) LIKE LOWER(@Like) OR LOWER(long_name) LIKE LOWER(@Like)
            LIMIT 80
            """,
            new { Like = like }).ToList();

        return rows
            .Select(r =>
            {
                var sShort = Score(r.ShortName, q) ?? 0;
                var sLong = Score(r.LongName, q) ?? 0;
                var score = Math.Max(sShort, sLong);
                // Boost short-name prefix matches above any long-name match.
                if (r.ShortName.ToLowerInvariant().StartsWith(q.ToLowerInvariant())) score += 500;
                return (Hit: new RouteHit(r.Id, r.ShortName, r.LongName, (int)r.RouteType), Score: score);
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(limit)
            .Select(x => x.Hit)
            .ToList();
    }

    private Dictionary<string, List<string>> LookupRoutesByStop(IDbConnection db, List<string> stopIds)
    {
        var rows = db.Query<(string StopId, string ShortName)>(
            """
            SELECT DISTINCT rs.stop_id AS StopId, r.short_name AS ShortName
            FROM route_stops rs
            JOIN routes r ON r.id = rs.route_id
            WHERE rs.stop_id IN @StopIds
            """,
            new { StopIds = stopIds }).ToList();

        return rows.GroupBy(x => x.StopId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.ShortName).Distinct().ToList());
    }
}
