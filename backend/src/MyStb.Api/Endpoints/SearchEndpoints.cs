using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this WebApplication app)
    {
        app.MapGet("/api/search", async (string q, IGeocodingProvider geocoding, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(q)) return Results.BadRequest("Query required");
            var results = await geocoding.SearchAsync(q, ct);
            return Results.Ok(results);
        });
    }
}
