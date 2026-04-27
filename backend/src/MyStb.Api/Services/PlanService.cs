using System.Data;
using Dapper;
using MyStb.Api.Models;

namespace MyStb.Api.Services;

public class PlanService
{
    private const double WalkSpeedMps = 1.3;
    private const int LiveThresholdSeconds = 90;

    public record PlanLocation(string Kind, string? StopId, double? Lat, double? Lng, string? Label);
    public record PlanWhen(string Type, string? Time);
    public record PlanRequest(
        PlanLocation From,
        PlanLocation To,
        PlanWhen? When,
        List<string>? Modes,
        double? MaxWalkMeters,
        bool? Accessible);

    public record WalkLeg(
        string Kind,
        string FromName,
        string ToName,
        int DurationSeconds,
        int Meters);

    public record TransitLeg(
        string Kind,
        string RouteId,
        string Mode,
        string FromStopId,
        string FromStopName,
        string ToStopId,
        string ToStopName,
        string Headsign,
        string DepartsAt,
        string ArrivesAt,
        bool IsLive,
        int Stops);

    public record Trip(
        string Id,
        string StartsAt,
        string EndsAt,
        int DurationSeconds,
        int WalkSecondsTotal,
        List<object> Legs);

    public record PlanResponse(List<Trip> Trips);

    private record StopRow(string Id, string Name, double Lat, double Lng);

    public PlanResponse Plan(IDbConnection db, PlanRequest req, DateTimeOffset now, double defaultWalkRadius = 800)
    {
        var (fromLat, fromLng) = Resolve(db, req.From);
        var (toLat, toLng) = Resolve(db, req.To);
        if (fromLat is null || fromLng is null || toLat is null || toLng is null)
            return new PlanResponse([]);

        var maxWalk = req.MaxWalkMeters ?? defaultWalkRadius;
        var calc = new RouteCalculatorService();
        var options = calc.FindDirectRoutes(db, fromLat.Value, fromLng.Value, toLat.Value, toLng.Value, maxWalk);

        // Anchor the start time per `when`.
        var when = req.When ?? new PlanWhen("now", null);
        var baseStart = when.Type == "leaveAt" && when.Time is not null && DateTimeOffset.TryParse(when.Time, out var leaveAt)
            ? leaveAt
            : now;

        // Live vehicle map per route + direction so we can flag live trips.
        var liveByRouteDir = LookupLiveVehicleSet(db, options, now.ToUnixTimeSeconds());

        var trips = new List<Trip>();
        foreach (var opt in options)
        {
            // Filter by modes if specified.
            if (req.Modes is { Count: > 0 } && !req.Modes.Contains(ModeForRouteType(opt.RouteType, opt.ShortName)))
                continue;

            var built = BuildLegs(opt, baseStart, liveByRouteDir.Contains((opt.RouteId, opt.DirectionId)));
            var legs = built.Legs;
            var startsAt = built.StartsAt;
            var endsAt = built.EndsAt;
            var walkSeconds = legs.OfType<WalkLeg>().Sum(w => w.DurationSeconds);
            var durationSeconds = (int)(endsAt - startsAt).TotalSeconds;

            // For "arriveBy" we anchor end-time and back-shift start by duration.
            if (when.Type == "arriveBy" && when.Time is not null && DateTimeOffset.TryParse(when.Time, out var arriveBy))
            {
                var shift = arriveBy - endsAt;
                if (shift != TimeSpan.Zero)
                {
                    legs = ShiftLegs(legs, shift);
                    startsAt += shift;
                    endsAt = arriveBy;
                }
            }

            trips.Add(new Trip(
                Id: $"{opt.RouteId}-{opt.DirectionId}-{opt.OriginStopId}",
                StartsAt: startsAt.ToString("yyyy-MM-ddTHH:mm:sszzz"),
                EndsAt: endsAt.ToString("yyyy-MM-ddTHH:mm:sszzz"),
                DurationSeconds: durationSeconds,
                WalkSecondsTotal: walkSeconds,
                Legs: legs));
        }

        return new PlanResponse(trips
            .OrderBy(t => DateTimeOffset.Parse(t.EndsAt))
            .ToList());
    }

    private (double? Lat, double? Lng) Resolve(IDbConnection db, PlanLocation loc)
    {
        if (loc.Kind == "stop" && !string.IsNullOrWhiteSpace(loc.StopId))
        {
            var stop = db.QueryFirstOrDefault<StopRow>(
                "SELECT id AS Id, name AS Name, lat AS Lat, lng AS Lng FROM stops WHERE id = @Id",
                new { Id = loc.StopId });
            if (stop is null) return (null, null);
            return (stop.Lat, stop.Lng);
        }
        if (loc.Lat.HasValue && loc.Lng.HasValue) return (loc.Lat, loc.Lng);
        return (null, null);
    }

    private HashSet<(string RouteId, int DirectionId)> LookupLiveVehicleSet(
        IDbConnection db,
        List<RouteOption> options,
        long nowUnix)
    {
        if (options.Count == 0) return [];
        var routeIds = options.Select(o => o.RouteId).Distinct().ToList();
        var rows = db.Query<(string RouteId, long DirectionId, long UpdatedAt)>(
            """
            SELECT route_id AS RouteId, direction_id AS DirectionId, MAX(updated_at) AS UpdatedAt
            FROM vehicles
            WHERE route_id IN @RouteIds
            GROUP BY route_id, direction_id
            """,
            new { RouteIds = routeIds }).ToList();
        return rows
            .Where(r => nowUnix - r.UpdatedAt <= LiveThresholdSeconds)
            .Select(r => (r.RouteId, (int)r.DirectionId))
            .ToHashSet();
    }

    private record BuiltTrip(List<object> Legs, DateTimeOffset StartsAt, DateTimeOffset EndsAt);

    private BuiltTrip BuildLegs(RouteOption opt, DateTimeOffset baseStart, bool isLive)
    {
        var firstWalkSeconds = (int)Math.Round(opt.OriginStopDistance / WalkSpeedMps);
        var transitSeconds = (opt.EstimatedMinutes ?? 5) * 60;
        var lastWalkSeconds = (int)Math.Round(opt.LastMileDistance / WalkSpeedMps);

        var transitDeparts = baseStart.AddSeconds(firstWalkSeconds);
        var transitArrives = transitDeparts.AddSeconds(transitSeconds);
        var endsAt = opt.LastMileDistance > 0
            ? transitArrives.AddSeconds(lastWalkSeconds)
            : transitArrives;

        var legs = new List<object>
        {
            new WalkLeg(
                Kind: "walk",
                FromName: "Origin",
                ToName: opt.OriginStopName,
                DurationSeconds: firstWalkSeconds,
                Meters: (int)Math.Round(opt.OriginStopDistance)),
            new TransitLeg(
                Kind: "transit",
                RouteId: opt.RouteId,
                Mode: ModeForRouteType(opt.RouteType, opt.ShortName),
                FromStopId: opt.OriginStopId,
                FromStopName: opt.OriginStopName,
                ToStopId: opt.DestStopId,
                ToStopName: opt.DestStopName,
                Headsign: opt.DestStopName,
                DepartsAt: transitDeparts.ToString("yyyy-MM-ddTHH:mm:sszzz"),
                ArrivesAt: transitArrives.ToString("yyyy-MM-ddTHH:mm:sszzz"),
                IsLive: isLive,
                Stops: opt.StopCount),
        };

        if (opt.LastMileDistance > 0)
        {
            legs.Add(new WalkLeg(
                Kind: "walk",
                FromName: opt.DestStopName,
                ToName: "Destination",
                DurationSeconds: lastWalkSeconds,
                Meters: (int)Math.Round(opt.LastMileDistance)));
        }

        return new BuiltTrip(legs, baseStart, endsAt);
    }

    private List<object> ShiftLegs(List<object> legs, TimeSpan shift)
    {
        var shifted = new List<object>(legs.Count);
        foreach (var leg in legs)
        {
            shifted.Add(leg switch
            {
                TransitLeg t => t with
                {
                    DepartsAt = DateTimeOffset.Parse(t.DepartsAt).Add(shift).ToString("yyyy-MM-ddTHH:mm:sszzz"),
                    ArrivesAt = DateTimeOffset.Parse(t.ArrivesAt).Add(shift).ToString("yyyy-MM-ddTHH:mm:sszzz"),
                },
                _ => leg,
            });
        }
        return shifted;
    }

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
