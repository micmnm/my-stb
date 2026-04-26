using System.Data;
using Dapper;

namespace MyStb.Api.Endpoints;

public static class VehicleEndpoints
{
    public static void MapVehicleEndpoints(this WebApplication app)
    {
        app.MapGet("/api/vehicles", (string routeId, IDbConnection db) =>
        {
            var vehicles = db.Query(
                "SELECT id, route_id as routeId, lat, lng, direction_id as directionId, license_plate as licensePlate, timestamp, updated_at as updatedAt FROM vehicles WHERE route_id = @routeId",
                new { routeId });
            return Results.Ok(vehicles);
        });
    }
}
