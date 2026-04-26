using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class GeoUtilsTests
{
    [Fact]
    public void HaversineMeters_ReturnsCorrectDistance()
    {
        // Piata Unirii to Universitate (~900-1000m)
        var distance = GeoUtils.HaversineMeters(44.4268, 26.1025, 44.4352, 26.1004);

        Assert.InRange(distance, 900, 1000);
    }

    [Fact]
    public void HaversineMeters_SamePoint_ReturnsZero()
    {
        var distance = GeoUtils.HaversineMeters(44.4268, 26.1025, 44.4268, 26.1025);

        Assert.Equal(0, distance);
    }
}
