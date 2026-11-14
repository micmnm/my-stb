using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;

namespace MyStb.Api.Services;

public class NominatimProvider : IGeocodingProvider
{
    public const string UserAgent = "MyStb/1.0 (+https://mystb.mltru.com)";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    private readonly HttpClient _http;
    private readonly string _baseUrl;
    private readonly IMemoryCache _cache;
    private readonly ILogger<NominatimProvider> _log;
    private readonly TimeSpan _spacing;
    private readonly TimeSpan _maxWait;
    private readonly TimeSpan _timeout;

    // Nominatim's usage policy allows at most 1 request/second, so the gate is process-wide.
    private readonly SemaphoreSlim _gate = new(1, 1);
    private long _lastCallTicks;

    public NominatimProvider(HttpClient http, string baseUrl, IMemoryCache cache, ILogger<NominatimProvider> log,
        TimeSpan? spacing = null, TimeSpan? maxWait = null, TimeSpan? timeout = null)
    {
        _http = http;
        _baseUrl = baseUrl;
        _cache = cache;
        _log = log;
        _spacing = spacing ?? TimeSpan.FromSeconds(1);
        _maxWait = maxWait ?? TimeSpan.FromSeconds(3);
        _timeout = timeout ?? TimeSpan.FromSeconds(5);
    }

    public async Task<List<GeocodingResult>> SearchAsync(string query, CancellationToken ct = default)
    {
        var key = "nominatim:" + string.Join(' ', query.ToLowerInvariant().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        if (_cache.TryGetValue(key, out List<GeocodingResult>? cached) && cached is not null) return cached;

        var started = Stopwatch.GetTimestamp();
        if (!await _gate.WaitAsync(_maxWait, ct)) return [];
        try
        {
            // Another caller may have filled the cache while we queued.
            if (_cache.TryGetValue(key, out cached) && cached is not null) return cached;

            var wait = _spacing - Stopwatch.GetElapsedTime(Interlocked.Read(ref _lastCallTicks));
            if (_lastCallTicks != 0 && wait > TimeSpan.Zero)
            {
                if (Stopwatch.GetElapsedTime(started) + wait > _maxWait) return [];
                await Task.Delay(wait, ct);
            }
            Interlocked.Exchange(ref _lastCallTicks, Stopwatch.GetTimestamp());

            var results = await FetchAsync(query, ct);
            if (results is not null) _cache.Set(key, results, CacheTtl);
            return results ?? [];
        }
        finally
        {
            _gate.Release();
        }
    }

    // Returns null on any upstream failure so the caller does not cache it.
    private async Task<List<GeocodingResult>?> FetchAsync(string query, CancellationToken ct)
    {
        var url = $"{_baseUrl}/search?q={Uri.EscapeDataString(query)}&format=json&limit=10&viewbox=25.9,44.55,26.3,44.33&bounded=1";
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.UserAgent.ParseAdd(UserAgent);

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(_timeout);
        try
        {
            using var resp = await _http.SendAsync(req, timeoutCts.Token);
            if (!resp.IsSuccessStatusCode)
            {
                _log.LogWarning("Nominatim returned {StatusCode} for geocoding request", (int)resp.StatusCode);
                return null;
            }

            var json = await resp.Content.ReadAsStringAsync(timeoutCts.Token);
            var rows = JsonSerializer.Deserialize<JsonElement[]>(json) ?? [];
            return rows.Select(r => new GeocodingResult(
                r.GetProperty("display_name").GetString()!,
                double.Parse(r.GetProperty("lat").GetString()!, System.Globalization.CultureInfo.InvariantCulture),
                double.Parse(r.GetProperty("lon").GetString()!, System.Globalization.CultureInfo.InvariantCulture),
                r.TryGetProperty("type", out var t) ? t.GetString() : null)).ToList();
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            _log.LogWarning("Nominatim request timed out after {Timeout}", _timeout);
            return null;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or FormatException or KeyNotFoundException or InvalidOperationException)
        {
            _log.LogWarning(ex, "Nominatim request failed");
            return null;
        }
    }
}
