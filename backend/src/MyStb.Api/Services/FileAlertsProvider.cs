using System.Text.Json;
using System.Text.Json.Serialization;
using MyStb.Api.Models;

namespace MyStb.Api.Services;

public class FileAlertsProvider : IAlertsProvider, IDisposable
{
    private readonly string _path;
    private readonly ILogger<FileAlertsProvider> _logger;
    private readonly FileSystemWatcher? _watcher;
    private List<ServiceAlert> _alerts = [];
    private readonly object _gate = new();

    public FileAlertsProvider(string path, ILogger<FileAlertsProvider> logger)
    {
        _path = path;
        _logger = logger;
        Reload();

        var dir = Path.GetDirectoryName(_path);
        var name = Path.GetFileName(_path);
        if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
        {
            _watcher = new FileSystemWatcher(dir, name)
            {
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size | NotifyFilters.CreationTime,
                EnableRaisingEvents = true,
            };
            _watcher.Changed += (_, _) => SafeReload();
            _watcher.Created += (_, _) => SafeReload();
        }
    }

    private void SafeReload()
    {
        try
        {
            // Debounce: file writes can fire multiple events.
            Thread.Sleep(50);
            Reload();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reload alerts from {Path}", _path);
        }
    }

    private void Reload()
    {
        if (!File.Exists(_path))
        {
            lock (_gate) _alerts = [];
            return;
        }

        var json = File.ReadAllText(_path);
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
            AllowTrailingCommas = true,
            Converters = { new JsonStringEnumConverter() },
        };
        var parsed = JsonSerializer.Deserialize<List<ServiceAlert>>(json, options) ?? [];
        lock (_gate) _alerts = parsed;
        _logger.LogInformation("Reloaded {Count} alerts from {Path}", parsed.Count, _path);
    }

    public IReadOnlyList<ServiceAlert> GetActiveForRoute(string routeId, DateTimeOffset now)
    {
        return Snapshot()
            .Where(a => IsActive(a, now)
                        && (a.AffectedRouteIds?.Contains(routeId) ?? false))
            .ToList();
    }

    public IReadOnlyList<ServiceAlert> GetActiveForStop(string stopId, DateTimeOffset now)
    {
        return Snapshot()
            .Where(a => IsActive(a, now)
                        && (a.AffectedStopIds?.Contains(stopId) ?? false))
            .ToList();
    }

    public IReadOnlyList<ServiceAlert> GetAllActive(DateTimeOffset now)
    {
        return Snapshot().Where(a => IsActive(a, now)).ToList();
    }

    private List<ServiceAlert> Snapshot()
    {
        lock (_gate) return [.. _alerts];
    }

    private static bool IsActive(ServiceAlert a, DateTimeOffset now)
    {
        if (a.StartsAt is { } start && now < start) return false;
        if (a.EndsAt is { } end && now > end) return false;
        return true;
    }

    public void Dispose() => _watcher?.Dispose();
}
