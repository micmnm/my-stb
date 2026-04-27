using Microsoft.Extensions.Logging.Abstractions;
using MyStb.Api.Services;

namespace MyStb.Api.Tests.Services;

public class AlertsProviderTests
{
    private static string WriteTempJson(string content)
    {
        var path = Path.Combine(Path.GetTempPath(), $"alerts-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, content);
        return path;
    }

    [Fact]
    public void Provider_LoadsFromFile()
    {
        var json = """
            [
              {
                "id": "a1",
                "severity": "warning",
                "title": "Test",
                "body": "Body",
                "affectedRouteIds": ["41"],
                "affectedStopIds": [],
                "startsAt": "2026-01-01T00:00:00+00:00",
                "endsAt": "2026-12-31T23:59:59+00:00",
                "url": null
              }
            ]
            """;
        var path = WriteTempJson(json);
        try
        {
            var provider = new FileAlertsProvider(path, NullLogger<FileAlertsProvider>.Instance);
            var now = new DateTimeOffset(2026, 6, 1, 0, 0, 0, TimeSpan.Zero);

            var forRoute = provider.GetActiveForRoute("41", now);
            Assert.Single(forRoute);
            Assert.Equal("a1", forRoute[0].Id);

            var forOtherRoute = provider.GetActiveForRoute("99", now);
            Assert.Empty(forOtherRoute);

            provider.Dispose();
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void Provider_RespectsActiveWindow()
    {
        var json = """
            [
              {
                "id": "a1",
                "severity": "info",
                "title": "Future",
                "body": "Body",
                "affectedRouteIds": ["41"],
                "affectedStopIds": [],
                "startsAt": "2030-01-01T00:00:00+00:00",
                "endsAt": "2030-12-31T23:59:59+00:00",
                "url": null
              }
            ]
            """;
        var path = WriteTempJson(json);
        try
        {
            var provider = new FileAlertsProvider(path, NullLogger<FileAlertsProvider>.Instance);
            var now = new DateTimeOffset(2026, 6, 1, 0, 0, 0, TimeSpan.Zero);

            var active = provider.GetActiveForRoute("41", now);
            Assert.Empty(active);

            provider.Dispose();
        }
        finally
        {
            File.Delete(path);
        }
    }

    [Fact]
    public void Provider_HandlesMissingFile()
    {
        var path = Path.Combine(Path.GetTempPath(), $"missing-{Guid.NewGuid():N}.json");
        var provider = new FileAlertsProvider(path, NullLogger<FileAlertsProvider>.Instance);
        Assert.Empty(provider.GetAllActive(DateTimeOffset.UtcNow));
        provider.Dispose();
    }
}
