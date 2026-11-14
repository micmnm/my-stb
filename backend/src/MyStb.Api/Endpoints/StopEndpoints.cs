using System.Data;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public record PeekRequest(List<string>? StopIds, List<string>? RouteIds);
public record PeekResponse(FeedStatus Feed, Dictionary<string, ArrivalsService.PeekStop> Stops);

public static class StopEndpoints
{
    public const int MaxPeekStops = 20;
    public const int MaxPeekRoutes = 50;

    public static void MapStopEndpoints(this WebApplication app)
    {
        app.MapGet("/api/stops/nearby", (double lat, double lng, double? radius, double? maxMeters, int? limit, IDbConnection db) =>
        {
            if (ValidateNearby(lat, lng, radius, maxMeters, limit) is { } error)
                return InputBounds.Problem(error);

            var max = maxMeters ?? radius ?? 500;
            var cap = limit ?? 5;
            var svc = new NearbyService();
            var results = svc.Find(db, lat, lng, max, cap);
            return Results.Ok(results);
        });

        app.MapPost("/api/stops/arrivals/peek", (PeekRequest body, IDbConnection db, VehiclePollerService poller) =>
            HandlePeek(body, db, poller.GetFeedStatus(), DateTimeOffset.UtcNow.ToUnixTimeSeconds()));

        app.MapGet("/api/stops/{id}", (string id, IDbConnection db) =>
        {
            var svc = new ArrivalsService();
            var stop = svc.GetStop(db, id);
            return stop is null ? Results.NotFound() : Results.Ok(stop);
        });

        app.MapGet("/api/stops/{id}/arrivals", (string id, IDbConnection db, VehiclePollerService poller) =>
        {
            var svc = new ArrivalsService();
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var resp = svc.GetArrivals(db, id, now);
            return resp is null ? Results.NotFound() : Results.Ok(resp with { Feed = poller.GetFeedStatus() });
        });
    }

    public static IResult HandlePeek(PeekRequest body, IDbConnection db, FeedStatus feed, long nowUnix)
    {
        var stopIds = body.StopIds ?? [];
        var routeIds = body.RouteIds ?? [];
        var errors = new Dictionary<string, string[]>();
        if (stopIds.Count > MaxPeekStops)
            errors["stopIds"] = [$"At most {MaxPeekStops} stop ids."];
        if (routeIds.Count > MaxPeekRoutes)
            errors["routeIds"] = [$"At most {MaxPeekRoutes} route ids."];
        if (errors.Count > 0) return TypedResults.ValidationProblem(errors);

        var stops = new ArrivalsService().Peek(db, stopIds, routeIds, nowUnix);
        return TypedResults.Ok(new PeekResponse(feed, stops));
    }

    public static string? ValidateNearby(double lat, double lng, double? radius, double? maxMeters, int? limit) =>
        InputBounds.LatLng("", lat, lng)?.TrimStart()
        ?? InputBounds.Radius("radius", radius)
        ?? InputBounds.Radius("maxMeters", maxMeters)
        ?? InputBounds.Limit(limit);
}
