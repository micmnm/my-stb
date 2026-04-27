using MyStb.Api.Models;

namespace MyStb.Api.Services;

public interface IAlertsProvider
{
    IReadOnlyList<ServiceAlert> GetActiveForRoute(string routeId, DateTimeOffset now);
    IReadOnlyList<ServiceAlert> GetActiveForStop(string stopId, DateTimeOffset now);
    IReadOnlyList<ServiceAlert> GetAllActive(DateTimeOffset now);
}
