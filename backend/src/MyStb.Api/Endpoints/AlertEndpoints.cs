using MyStb.Api.Services;

namespace MyStb.Api.Endpoints;

public static class AlertEndpoints
{
    public static void MapAlertEndpoints(this WebApplication app)
    {
        app.MapGet("/api/alerts", (string? routeId, string? stopId, IAlertsProvider alerts) =>
        {
            var now = DateTimeOffset.UtcNow;
            var list = !string.IsNullOrWhiteSpace(routeId) ? alerts.GetActiveForRoute(routeId, now)
                     : !string.IsNullOrWhiteSpace(stopId)  ? alerts.GetActiveForStop(stopId, now)
                     : alerts.GetAllActive(now);
            // Sort: severity desc (critical > warning > info), then startsAt desc.
            var ordered = list
                .OrderByDescending(a => SeverityRank(a.Severity))
                .ThenByDescending(a => a.StartsAt ?? DateTimeOffset.MinValue)
                .ToList();
            return Results.Ok(ordered);
        });
    }

    private static int SeverityRank(string severity) => severity?.ToLowerInvariant() switch
    {
        "critical" => 3,
        "warning" => 2,
        "info" => 1,
        _ => 0,
    };
}
