namespace MyStb.Api.Services;

public interface IGeocodingProvider
{
    Task<List<GeocodingResult>> SearchAsync(string query, CancellationToken ct = default);
}

public record GeocodingResult(string DisplayName, double Lat, double Lng, string? Type);
