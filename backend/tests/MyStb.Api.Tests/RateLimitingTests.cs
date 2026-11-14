using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using MyStb.Api;

namespace MyStb.Api.Tests;

public class RateLimitingTests
{
    private static DefaultHttpContext Ctx(string path, string ip)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Path = path;
        ctx.Connection.RemoteIpAddress = IPAddress.Parse(ip);
        return ctx;
    }

    private static int CountAllowed(PartitionedRateLimiter<HttpContext> limiter, HttpContext ctx, int attempts)
    {
        var ok = 0;
        for (var i = 0; i < attempts; i++)
        {
            using var lease = limiter.AttemptAcquire(ctx);
            if (lease.IsAcquired) ok++;
        }
        return ok;
    }

    [Fact]
    public void General_Allows120ThenRejects_PerIp()
    {
        using var limiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimiting.General(c, 120));

        Assert.Equal(120, CountAllowed(limiter, Ctx("/api/stops/1/arrivals", "10.0.0.1"), 130));
        Assert.Equal(120, CountAllowed(limiter, Ctx("/api/stops/1/arrivals", "10.0.0.2"), 130));
    }

    [Fact]
    public void General_ExemptsHealthzAndNonApiPaths()
    {
        using var limiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimiting.General(c, 1));

        Assert.Equal(50, CountAllowed(limiter, Ctx("/healthz", "10.0.0.1"), 50));
    }

    [Fact]
    public void Expensive_UsesItsOwnLimit()
    {
        using var limiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimiting.Expensive(c, 20));

        Assert.Equal(20, CountAllowed(limiter, Ctx("/api/plan", "10.0.0.1"), 30));
    }

    [Fact]
    public void RejectedLease_CarriesRetryAfter()
    {
        using var limiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimiting.General(c, 1));
        var ctx = Ctx("/api/x", "10.0.0.1");
        using var first = limiter.AttemptAcquire(ctx);
        using var second = limiter.AttemptAcquire(ctx);

        Assert.False(second.IsAcquired);
        Assert.True(second.TryGetMetadata(MetadataName.RetryAfter, out var retry));
        Assert.InRange(retry, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(60));
    }

    [Fact]
    public void Limits_ReadFromConfig_WithDefaults()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["RateLimit:GeneralPerMinute"] = "5",
        }).Build();

        Assert.Equal((5, 20), RateLimiting.ReadLimits(cfg));
    }

    [Fact]
    public void Expensive_TypeAheadSearchWithoutAddresses_IsNotLimited()
    {
        using var limiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimiting.Expensive(c, 20));
        var ctx = Ctx("/api/search", "10.0.0.5");
        ctx.Request.QueryString = new QueryString("?q=unirii&types=stops,routes");

        Assert.Equal(50, CountAllowed(limiter, ctx, 50));
    }

    [Fact]
    public void Expensive_AddressSearch_IsLimited()
    {
        using var limiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimiting.Expensive(c, 20));
        var ctx = Ctx("/api/search", "10.0.0.6");
        ctx.Request.QueryString = new QueryString("?q=unirii&types=addresses");

        Assert.Equal(20, CountAllowed(limiter, ctx, 50));
    }

    [Fact]
    public void ForwardedHeaders_NoConfiguredNetworks_TrustsAnyProxy()
    {
        var o = new Microsoft.AspNetCore.Builder.ForwardedHeadersOptions();
        RateLimiting.ConfigureForwardedHeaders(o, []);

        Assert.Empty(o.KnownIPNetworks);
        Assert.Empty(o.KnownProxies);
    }

    [Fact]
    public void ForwardedHeaders_ConfiguredNetworks_TrustsOnlyThose()
    {
        var o = new Microsoft.AspNetCore.Builder.ForwardedHeadersOptions();
        RateLimiting.ConfigureForwardedHeaders(o, ["10.2.0.0/16"]);

        Assert.Contains(o.KnownIPNetworks, n => n.ToString() == "10.2.0.0/16");
    }
}
