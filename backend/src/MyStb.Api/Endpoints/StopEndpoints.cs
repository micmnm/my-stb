using System.Data;
using Dapper;
using MyStb.Api.Models;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public record PeekRequest(List<string> StopIds);

public static class StopEndpoints
{
    public static void MapStopEndpoints(this WebApplication app)
    {
        app.MapGet("/api/stops/nearby", (double lat, double lng, double? radius, double? maxMeters, int? limit, IDbConnection db) =>
        {
            var max = maxMeters ?? radius ?? 500;
            var cap = limit ?? 5;
            var svc = new NearbyService();
            var results = svc.Find(db, lat, lng, max, cap);
            return Results.Ok(results);
        });

        app.MapPost("/api/stops/arrivals/peek", async (HttpRequest req, IDbConnection db) =>
        {
            var body = await System.Text.Json.JsonSerializer.DeserializeAsync<PeekRequest>(req.Body, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            var ids = body?.StopIds ?? [];
            if (ids.Count == 0) return Results.Ok(new Dictionary<string, object>());

            var svc = new ArrivalsService();
            var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var result = new Dictionary<string, object>();

            foreach (var id in ids.Distinct())
            {
                var resp = svc.GetArrivals(db, id, nowUnix);
                if (resp is null)
                {
                    result[id] = new { soonest = Array.Empty<object>() };
                    continue;
                }
                // Soonest 1 per (route, direction).
                var soonest = resp.Arrivals
                    .GroupBy(a => (a.RouteId, a.Direction))
                    .Select(g => g.OrderBy(a => a.EtaSeconds).First())
                    .OrderBy(a => a.EtaSeconds)
                    .Take(2)
                    .ToList();
                result[id] = new { soonest };
            }
            return Results.Ok(result);
        });

        app.MapGet("/api/stops/{id}", (string id, IDbConnection db) =>
        {
            var svc = new ArrivalsService();
            var stop = svc.GetStop(db, id);
            return stop is null ? Results.NotFound() : Results.Ok(stop);
        });

        app.MapGet("/api/stops/{id}/arrivals", (string id, IDbConnection db) =>
        {
            var svc = new ArrivalsService();
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var resp = svc.GetArrivals(db, id, now);
            return resp is null ? Results.NotFound() : Results.Ok(resp);
        });
    }
}
