using System.Data;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class RouteEndpoints
{
    public static void MapRouteEndpoints(this WebApplication app)
    {
        app.MapGet("/api/routes", (double fromLat, double fromLng, double toLat, double toLng, double? radius, IDbConnection db) =>
        {
            var error = InputBounds.LatLng("from", fromLat, fromLng)
                        ?? InputBounds.LatLng("to", toLat, toLng)
                        ?? InputBounds.Radius("radius", radius);
            if (error is not null) return InputBounds.Problem(error);

            var calc = new RouteCalculatorService();
            var results = calc.FindDirectRoutes(db, fromLat, fromLng, toLat, toLng, radius ?? 500);
            return Results.Ok(results);
        });

        app.MapGet("/api/routes/{id}/detail", (string id, string? direction, IDbConnection db, IAlertsProvider alerts, VehiclePollerService poller) =>
        {
            var dir = direction == "b" ? "b" : "a";
            var svc = new RouteDetailService();
            var resp = svc.Get(db, id, dir, alerts, DateTimeOffset.UtcNow);
            return resp is null ? Results.NotFound() : Results.Ok(resp with { Feed = poller.GetFeedStatus() });
        });

        app.MapPost("/api/plan", (PlanService.PlanRequest body, IDbConnection db) =>
        {
            if (body?.From is null || body.To is null) return InputBounds.Problem("from and to are required.");
            var error = PlanLocationError("from", body.From)
                        ?? PlanLocationError("to", body.To)
                        ?? InputBounds.Radius("maxWalkMeters", body.MaxWalkMeters);
            if (error is not null) return InputBounds.Problem(error);

            var svc = new PlanService();
            var resp = svc.Plan(db, body, DateTimeOffset.UtcNow);
            return Results.Ok(resp);
        }).RequireRateLimiting(RateLimiting.ExpensivePolicy);
    }

    private static string? PlanLocationError(string name, PlanService.PlanLocation loc) =>
        loc.Lat.HasValue || loc.Lng.HasValue
            ? InputBounds.LatLng(name, loc.Lat ?? double.NaN, loc.Lng ?? double.NaN)
            : null;
}
