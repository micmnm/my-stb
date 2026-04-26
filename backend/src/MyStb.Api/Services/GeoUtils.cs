namespace MyStb.Api.Services;

public static class GeoUtils
{
    private const double EarthRadiusMeters = 6_371_000;

    public static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusMeters * c;
    }

    public static (double MinLat, double MaxLat, double MinLng, double MaxLng) BoundingBox(double lat, double lng, double radiusMeters)
    {
        var dLat = radiusMeters / EarthRadiusMeters * (180.0 / Math.PI);
        var dLng = dLat / Math.Cos(ToRad(lat));
        return (lat - dLat, lat + dLat, lng - dLng, lng + dLng);
    }

    private static double ToRad(double deg) => deg * Math.PI / 180.0;
}
