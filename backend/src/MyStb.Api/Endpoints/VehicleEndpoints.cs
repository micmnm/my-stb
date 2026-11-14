using System.Data;
using Dapper;
using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class VehicleEndpoints
{
    public static void MapVehicleEndpoints(this WebApplication app)
    {
        app.MapGet("/api/vehicles", (string routeId, IDbConnection db) =>
            Results.Ok(Query(db, routeId, DateTimeOffset.UtcNow.ToUnixTimeSeconds())));
    }

    public static IEnumerable<dynamic> Query(IDbConnection db, string routeId, long nowUnix) =>
        db.Query(
            $"SELECT id, route_id as routeId, lat, lng, direction_id as directionId, license_plate as licensePlate, timestamp, updated_at as updatedAt FROM vehicles WHERE route_id = @routeId AND {VehicleFreshness.ReportedAtSql} >= @Since",
            new { routeId, Since = VehicleFreshness.VisibleSince(nowUnix) });
}
