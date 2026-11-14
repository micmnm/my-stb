using MyStb.Api.Services;

namespace MyStb.Api.Tests;

public class InputBoundsTests
{
    [Theory]
    [InlineData(44.4, 26.1)]
    [InlineData(-90, -180)]
    [InlineData(90, 180)]
    public void LatLng_InRange_IsValid(double lat, double lng) =>
        Assert.Null(InputBounds.LatLng("from", lat, lng));

    [Theory]
    [InlineData(90.01, 0)]
    [InlineData(-91, 0)]
    [InlineData(0, 180.5)]
    [InlineData(0, -181)]
    [InlineData(double.NaN, 0)]
    [InlineData(0, double.PositiveInfinity)]
    public void LatLng_OutOfRangeOrNonFinite_ReturnsError(double lat, double lng) =>
        Assert.NotNull(InputBounds.LatLng("from", lat, lng));

    [Fact]
    public void Radius_NullIsValid() => Assert.Null(InputBounds.Radius("radius", null));

    [Fact]
    public void Radius_AtMaxIsValid() => Assert.Null(InputBounds.Radius("radius", 3000));

    [Theory]
    [InlineData(3000.1)]
    [InlineData(1_000_000_000)]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(double.NaN)]
    public void Radius_OutOfRange_ReturnsError(double r) =>
        Assert.NotNull(InputBounds.Radius("radius", r));

    [Theory]
    [InlineData(null, true)]
    [InlineData(1, true)]
    [InlineData(50, true)]
    [InlineData(51, false)]
    [InlineData(0, false)]
    [InlineData(-1, false)]
    public void Limit_Bounds(int? limit, bool ok) =>
        Assert.Equal(ok, InputBounds.Limit(limit) is null);
}
