namespace MyStb.Api.Services;

/// <summary>Request-input validators; each returns an error message, or null when valid.</summary>
public static class InputBounds
{
    public const double MaxRadiusMeters = 3000;
    public const int MaxLimit = 50;

    public static string? LatLng(string name, double lat, double lng)
    {
        if (!double.IsFinite(lat) || lat is < -90 or > 90) return $"{name} latitude must be a number in [-90, 90].";
        if (!double.IsFinite(lng) || lng is < -180 or > 180) return $"{name} longitude must be a number in [-180, 180].";
        return null;
    }

    public static string? Radius(string name, double? value)
    {
        if (value is null) return null;
        if (!double.IsFinite(value.Value) || value <= 0 || value > MaxRadiusMeters)
            return $"{name} must be in (0, {MaxRadiusMeters:0}] meters.";
        return null;
    }

    public static string? Limit(int? value) =>
        value is null or (> 0 and <= MaxLimit) ? null : $"limit must be in [1, {MaxLimit}].";

    public static IResult Problem(string detail) =>
        Results.Problem(detail: detail, statusCode: StatusCodes.Status400BadRequest, title: "Invalid request");
}
