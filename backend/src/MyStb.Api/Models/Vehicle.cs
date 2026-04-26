namespace MyStb.Api.Models;
public record Vehicle(string Id, string RouteId, double Lat, double Lng, int DirectionId, string? LicensePlate, long Timestamp, long UpdatedAt);
