using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class FeedHealthTests
{
    private static readonly DateTimeOffset T0 = new(2026, 11, 14, 8, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    [Fact]
    public void NeverSucceeded_IsDown()
    {
        var health = new FeedHealth(Interval);
        health.Touch(T0);
        health.RecordFailure(T0.AddSeconds(1));

        var feed = health.Snapshot(T0.AddSeconds(1));

        Assert.Equal("down", feed.Status);
        Assert.Null(feed.LastSuccessAt);
    }

    [Fact]
    public void ColdStart_FirstPollPending_IsDegradedNotDown()
    {
        var health = new FeedHealth(Interval);
        health.Touch(T0);

        Assert.Equal("degraded", health.Snapshot(T0).Status);
    }

    [Fact]
    public void RecentSuccess_IsOk()
    {
        var health = new FeedHealth(Interval);
        health.Touch(T0);
        health.RecordSuccess(T0);

        var feed = health.Snapshot(T0.AddSeconds(20));

        Assert.Equal("ok", feed.Status);
        Assert.Equal(T0, feed.LastSuccessAt);
    }

    [Fact]
    public void FailureAfterRecentSuccess_IsDegraded()
    {
        var health = new FeedHealth(Interval);
        health.Touch(T0);
        health.RecordSuccess(T0);
        health.RecordFailure(T0.AddSeconds(30));

        Assert.Equal("degraded", health.Snapshot(T0.AddSeconds(31)).Status);
        Assert.Equal(1, health.ConsecutiveFailures);
        Assert.Equal(T0.AddSeconds(30), health.LastAttemptUtc);
    }

    [Fact]
    public void FailingForFourIntervals_IsDown()
    {
        var health = new FeedHealth(Interval);
        health.Touch(T0);
        health.RecordSuccess(T0);
        for (var i = 1; i <= 4; i++)
        {
            health.Touch(T0.AddSeconds(30 * i));
            health.RecordFailure(T0.AddSeconds(30 * i));
        }

        var feed = health.Snapshot(T0.AddSeconds(121));

        Assert.Equal("down", feed.Status);
        Assert.Equal(T0, feed.LastSuccessAt);
        Assert.Equal(4, health.ConsecutiveFailures);
    }

    [Fact]
    public void SuccessResetsConsecutiveFailures()
    {
        var health = new FeedHealth(Interval);
        health.RecordFailure(T0);
        health.RecordFailure(T0.AddSeconds(30));
        health.RecordSuccess(T0.AddSeconds(60));

        Assert.Equal(0, health.ConsecutiveFailures);
        Assert.Equal("ok", health.Snapshot(T0.AddSeconds(61)).Status);
    }

    [Fact]
    public void Touch_AfterIdle_WakesAndReportsOkWhenLastSuccessUnderTenMinutes()
    {
        var health = new FeedHealth(Interval);
        health.Touch(T0);
        health.RecordSuccess(T0);

        var later = T0.AddMinutes(8);
        Assert.False(health.IsActive(later));
        var woke = health.Touch(later);

        Assert.True(woke);
        Assert.True(health.IsActive(later));
        Assert.Equal("ok", health.Snapshot(later).Status);
    }

    [Fact]
    public void Touch_AfterIdle_ReportsDegradedWhileWakePollPendingWhenLastSuccessOverTenMinutes()
    {
        var health = new FeedHealth(Interval);
        health.Touch(T0);
        health.RecordSuccess(T0);

        var later = T0.AddMinutes(11);
        health.Touch(later);

        Assert.Equal("degraded", health.Snapshot(later).Status);
    }

    [Fact]
    public void Touch_WhileActive_DoesNotWake()
    {
        var health = new FeedHealth(Interval);
        Assert.True(health.Touch(T0));
        Assert.False(health.Touch(T0.AddSeconds(10)));
    }

    [Fact]
    public void WakeGrace_EndsWithTheNextAttempt()
    {
        var health = new FeedHealth(Interval);
        health.Touch(T0);
        health.RecordSuccess(T0);

        var later = T0.AddMinutes(8);
        health.Touch(later);
        health.RecordFailure(later.AddSeconds(1));

        Assert.Equal("down", health.Snapshot(later.AddSeconds(2)).Status);
    }
}
