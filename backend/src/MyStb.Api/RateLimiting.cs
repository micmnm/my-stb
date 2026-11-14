using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;

namespace MyStb.Api;

public static class RateLimiting
{
    public const string ExpensivePolicy = "expensive";

    public static (int General, int Expensive) ReadLimits(IConfiguration cfg) =>
        (cfg.GetValue("RateLimit:GeneralPerMinute", 120), cfg.GetValue("RateLimit:ExpensivePerMinute", 20));

    // Global limiter: /api/* only, so /healthz and static paths are exempt.
    public static RateLimitPartition<string> General(HttpContext ctx, int perMinute) =>
        ctx.Request.Path.StartsWithSegments("/api")
            ? Fixed("general:" + ClientKey(ctx), perMinute)
            : RateLimitPartition.GetNoLimiter("exempt");

    // Type-ahead stop/route search stays on the general limit; only address lookups
    // (which reach Nominatim) and planning are strict.
    public static RateLimitPartition<string> Expensive(HttpContext ctx, int perMinute) =>
        ctx.Request.Path.StartsWithSegments("/api/search")
        && !ctx.Request.Query["types"].ToString().Contains("addresses", StringComparison.OrdinalIgnoreCase)
            ? RateLimitPartition.GetNoLimiter("typeahead")
            : Fixed("expensive:" + ClientKey(ctx), perMinute);

    // ForwardedHeadersOptions ships with loopback in KnownIPNetworks/KnownProxies, so clearing must key
    // off the configured list. Without it, every request keys on the ingress pod IP.
    public static void ConfigureForwardedHeaders(ForwardedHeadersOptions o, string[] networks)
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        var cidrs = networks.Where(n => !string.IsNullOrWhiteSpace(n)).ToArray();
        // With none configured, any proxy is trusted; a spoofed header only picks the client's own bucket.
        o.KnownIPNetworks.Clear();
        o.KnownProxies.Clear();
        foreach (var cidr in cidrs)
            o.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(cidr.Trim()));
    }

    // Runs after UseForwardedHeaders, so RemoteIpAddress is the real client.
    private static string ClientKey(HttpContext ctx) => ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private static RateLimitPartition<string> Fixed(string key, int perMinute) =>
        RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = perMinute,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        });
}
