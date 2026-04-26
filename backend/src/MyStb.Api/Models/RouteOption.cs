namespace MyStb.Api.Models;

public record RouteOption(
    string RouteId,
    string ShortName,
    int RouteType,
    string Direction,
    int DirectionId,
    string OriginStopId,
    string OriginStopName,
    double OriginStopDistance,
    string DestStopId,
    string DestStopName,
    double DestStopDistance,
    double LastMileDistance,
    int StopCount,
    int? EstimatedMinutes,
    List<double[]>? ShapeCoords
);
