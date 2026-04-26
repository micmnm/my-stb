using System.Text.Json;

namespace MyStb.Api.Services;

public class NominatimProvider : IGeocodingProvider
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;

    public NominatimProvider(HttpClient http, string baseUrl)
    {
        _http = http;
        _baseUrl = baseUrl;
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("MyStb/1.0");
    }

    public async Task<List<GeocodingResult>> SearchAsync(string query, CancellationToken ct = default)
    {
        var url = $"{_baseUrl}/search?q={Uri.EscapeDataString(query)}&format=json&limit=10&viewbox=25.9,44.55,26.3,44.33&bounded=1";
        var json = await _http.GetStringAsync(url, ct);
        var results = JsonSerializer.Deserialize<JsonElement[]>(json);
        if (results is null) return [];

        return results.Select(r => new GeocodingResult(
            r.GetProperty("display_name").GetString()!,
            double.Parse(r.GetProperty("lat").GetString()!),
            double.Parse(r.GetProperty("lon").GetString()!),
            r.TryGetProperty("type", out var t) ? t.GetString() : null
        )).ToList();
    }
}
