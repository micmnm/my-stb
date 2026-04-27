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
            if (string.IsNullOrWhiteSpace(q)) return Results.BadRequest("Query required");

            var requested = (types ?? "stops,routes,addresses")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => s.ToLowerInvariant())
                .ToHashSet();

            var cap = limit is > 0 and <= 100 ? limit.Value : 30;
            var svc = new SearchService();

            var stops = requested.Contains("stops") ? svc.SearchStops(db, q, lat, lng, cap) : [];
            var routes = requested.Contains("routes") ? svc.SearchRoutes(db, q, cap) : [];

            var addresses = new List<SearchService.AddressHit>();
            if (requested.Contains("addresses") && q.Trim().Length >= 3)
            {
                try
                {
                    var geo = await geocoding.SearchAsync(q, ct);
                    addresses = geo.Select(g => new SearchService.AddressHit(g.DisplayName, g.Lat, g.Lng, g.Type)).ToList();
                }
                catch
                {
                    // Geocoder failure is non-fatal; addresses come back empty.
                }
            }

            var response = new SearchService.SearchResponse(stops, routes, addresses);
            return Results.Ok(response);
        });
    }
}
