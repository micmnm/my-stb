namespace MyStb.Api.Models;

public record ServiceAlert(
    string Id,
    string Severity,
    string Title,
    string Body,
    List<string>? AffectedRouteIds,
    List<string>? AffectedStopIds,
    DateTimeOffset? StartsAt,
    DateTimeOffset? EndsAt,
    string? Url);
