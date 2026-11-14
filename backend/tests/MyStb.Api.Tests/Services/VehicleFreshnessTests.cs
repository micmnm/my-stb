using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class VehicleFreshnessTests
{
    private const long Now = 1_800_000_000;

    [Theory]
    [InlineData(119, Freshness.Live)]
    [InlineData(120, Freshness.Live)]
    [InlineData(121, Freshness.Stale)]
    [InlineData(599, Freshness.Stale)]
    [InlineData(600, Freshness.Stale)]
    [InlineData(601, Freshness.Expired)]
    public void Of_ClassifiesByAgeBoundaries(long ageSeconds, Freshness expected)
    {
        Assert.Equal(expected, VehicleFreshness.Of(Now - ageSeconds, Now));
    }

    [Fact]
    public void Of_ReportTimeInTheFutureIsLive()
    {
        Assert.Equal(Freshness.Live, VehicleFreshness.Of(Now + 30, Now));
    }

    [Fact]
    public void ReportedAt_UsesFeedTimestampWhenKnown()
    {
        Assert.Equal(Now - 300, VehicleFreshness.ReportedAt(timestamp: Now - 300, updatedAt: Now));
    }

    [Fact]
    public void ReportedAt_FallsBackToPollTimeWhenTimestampUnknown()
    {
        Assert.Equal(Now - 10, VehicleFreshness.ReportedAt(timestamp: 0, updatedAt: Now - 10));
    }

    [Fact]
    public void AgeSeconds_NeverNegative()
    {
        Assert.Equal(0, VehicleFreshness.AgeSeconds(Now + 5, Now));
        Assert.Equal(180, VehicleFreshness.AgeSeconds(Now - 180, Now));
    }

    [Theory]
    [InlineData(1_794_641_053L, 1_794_641_053L)]
    [InlineData(1_794_641_053_123L, 1_794_641_053L)]
    [InlineData(0L, 0L)]
    [InlineData(-5L, 0L)]
    public void NormalizeFeedTimestamp_HandlesSecondsMillisAndMissing(long raw, long expected)
    {
        Assert.Equal(expected, VehicleFreshness.NormalizeFeedTimestamp(raw));
    }

    [Fact]
    public void ToWire_IsLowercase()
    {
        Assert.Equal("live", VehicleFreshness.ToWire(Freshness.Live));
        Assert.Equal("stale", VehicleFreshness.ToWire(Freshness.Stale));
    }
}
