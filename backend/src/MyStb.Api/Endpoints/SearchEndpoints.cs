using System.Data;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this WebApplication app)
    {
        app.MapGet("/api/search", async (
            string q,
            string? types,
            double? lat,
            double? lng,
            int? limit,
            IDbConnection db,
            IGeocodingProvider geocoding,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q)) return InputBounds.Problem("Query required.");
            if (q.Length > 200) return InputBounds.Problem("Query too long.");
            if (lat.HasValue != lng.HasValue) return InputBounds.Problem("lat and lng must be given together.");
            var error = (lat.HasValue ? InputBounds.LatLng("lat/lng", lat.Value, lng!.Value) : null)
                        ?? InputBounds.Limit(limit);
            if (error is not null) return InputBounds.Problem(error);

            // Addresses hit a rate-limited upstream, so they are opt-in.
            var requested = (types ?? "stops,routes")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToLowerInvariant())
                .ToHashSet();

            var cap = limit ?? 30;
            var svc = new SearchService();

            var stops = requested.Contains("stops") ? svc.SearchStops(db, q, lat, lng, cap) : [];
            var routes = requested.Contains("routes") ? svc.SearchRoutes(db, q, cap) : [];

            var addresses = new List<SearchService.AddressHit>();
            if (requested.Contains("addresses") && q.Trim().Length >= 3)
            {
                // The provider swallows and logs upstream failures; addresses come back empty.
                var geo = await geocoding.SearchAsync(q, ct);
                addresses = geo.Select(g => new SearchService.AddressHit(g.DisplayName, g.Lat, g.Lng, g.Type)).ToList();
            }

            var response = new SearchService.SearchResponse(stops, routes, addresses);
            return Results.Ok(response);
        }).RequireRateLimiting(RateLimiting.ExpensivePolicy);
    }
}
