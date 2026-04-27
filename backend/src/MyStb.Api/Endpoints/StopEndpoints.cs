using System.Data;
using Dapper;
using MyStb.Api.Models;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class StopEndpoints
{
    public static void MapStopEndpoints(this WebApplication app)
    {
        app.MapGet("/api/stops/nearby", (double lat, double lng, double radius, IDbConnection db) =>
        {
            if (radius <= 0 || radius > 5000) radius = 500;
            var (minLat, maxLat, minLng, maxLng) = GeoUtils.BoundingBox(lat, lng, radius);
            var candidates = db.Query<Stop>(
                "SELECT id as Id, name as Name, lat as Lat, lng as Lng FROM stops WHERE lat BETWEEN @minLat AND @maxLat AND lng BETWEEN @minLng AND @maxLng",
                new { minLat, maxLat, minLng, maxLng });
            var results = candidates
                .Select(s => new { Stop = s, Distance = GeoUtils.HaversineMeters(lat, lng, s.Lat, s.Lng) })
                .Where(x => x.Distance <= radius)
                .OrderBy(x => x.Distance)
                .Select(x => new { x.Stop.Id, x.Stop.Name, x.Stop.Lat, x.Stop.Lng, Distance = Math.Round(x.Distance) });
            return Results.Ok(results);
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
