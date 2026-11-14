namespace MyStb.Api.Services;

public enum Freshness { Live, Stale, Expired }

public static class VehicleFreshness
{
    public const int LiveSeconds = 120;
    public const int HideSeconds = 600;

    // SQL twin of ReportedAt; timestamp = 0 means the feed gave no report time.
    public const string ReportedAtSql = "(CASE WHEN timestamp > 0 THEN timestamp ELSE updated_at END)";

    public static Freshness Of(long reportedUnix, long nowUnix) =>
        (nowUnix - reportedUnix) switch
        {
            <= LiveSeconds => Freshness.Live,
            <= HideSeconds => Freshness.Stale,
            _ => Freshness.Expired,
        };

    public static long ReportedAt(long timestamp, long updatedAt) => timestamp > 0 ? timestamp : updatedAt;

    public static int AgeSeconds(long reportedUnix, long nowUnix) => (int)Math.Max(0, nowUnix - reportedUnix);

    /// <summary>Oldest report time still visible at <paramref name="nowUnix"/>.</summary>
    public static long VisibleSince(long nowUnix) => nowUnix - HideSeconds;

    public static long NormalizeFeedTimestamp(long raw) => raw switch
    {
        <= 0 => 0,
        > 1_000_000_000_000 => raw / 1000,
        _ => raw,
    };

    public static string ToWire(Freshness f) => f switch
    {
        Freshness.Live => "live",
        Freshness.Stale => "stale",
        _ => "expired",
    };
}

public record FeedStatus(string Status, DateTimeOffset? LastSuccessAt);

/// <summary>Poller health and user-activity state. Thread-safe.</summary>
public sealed class FeedHealth
{
    public static readonly TimeSpan IdleAfter = TimeSpan.FromMinutes(2);
    public static readonly TimeSpan WakeGrace = TimeSpan.FromMinutes(10);
    private const int DownAfterIntervals = 3;

    private readonly TimeSpan _interval;
    private readonly object _gate = new();
    private DateTimeOffset _lastActivity = DateTimeOffset.MinValue;
    private DateTimeOffset? _lastSuccess;
    private DateTimeOffset? _lastAttempt;
    private int _consecutiveFailures;
    private bool _wakePending;

    public FeedHealth(TimeSpan pollInterval) => _interval = pollInterval;

    public DateTimeOffset? LastSuccessUtc { get { lock (_gate) return _lastSuccess; } }
    public DateTimeOffset? LastAttemptUtc { get { lock (_gate) return _lastAttempt; } }
    public int ConsecutiveFailures { get { lock (_gate) return _consecutiveFailures; } }

    public bool IsActive(DateTimeOffset now)
    {
        lock (_gate) return now - _lastActivity < IdleAfter;
    }

    /// <summary>Records activity; true when this wakes the poller from idle.</summary>
    public bool Touch(DateTimeOffset now)
    {
        lock (_gate)
        {
            var woke = now - _lastActivity >= IdleAfter;
            _lastActivity = now;
            if (woke) _wakePending = true;
            return woke;
        }
    }

    public void RecordSuccess(DateTimeOffset now)
    {
        lock (_gate)
        {
            _lastAttempt = now;
            _lastSuccess = now;
            _consecutiveFailures = 0;
            _wakePending = false;
        }
    }

    public void RecordFailure(DateTimeOffset now)
    {
        lock (_gate)
        {
            _lastAttempt = now;
            _consecutiveFailures++;
            _wakePending = false;
        }
    }

    public FeedStatus Snapshot(DateTimeOffset now)
    {
        lock (_gate)
        {
            // While the wake-up poll is in flight, never report "down": the UI would flash the banner.
            if (_lastSuccess is not { } success) return new FeedStatus(_wakePending ? "degraded" : "down", null);
            var age = now - success;
            var status = _wakePending
                ? (age < WakeGrace ? "ok" : "degraded")
                : age > _interval * DownAfterIntervals ? "down"
                : _consecutiveFailures > 0 ? "degraded"
                : "ok";
            return new FeedStatus(status, success);
        }
    }
}
