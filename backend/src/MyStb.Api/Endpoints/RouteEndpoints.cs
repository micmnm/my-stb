using System.Data;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class RouteEndpoints
{
    public static void MapRouteEndpoints(this WebApplication app)
    {
        app.MapGet("/api/routes", (double fromLat, double fromLng, double toLat, double toLng, double? radius, IDbConnection db) =>
        {
            var calc = new RouteCalculatorService();
            var results = calc.FindDirectRoutes(db, fromLat, fromLng, toLat, toLng, radius ?? 500);
            return Results.Ok(results);
        });

        app.MapGet("/api/routes/{id}/detail", (string id, string? direction, IDbConnection db, IAlertsProvider alerts) =>
        {
            var dir = direction == "b" ? "b" : "a";
            var svc = new RouteDetailService();
            var resp = svc.Get(db, id, dir, alerts, DateTimeOffset.UtcNow);
            return resp is null ? Results.NotFound() : Results.Ok(resp);
        });
    }
}
