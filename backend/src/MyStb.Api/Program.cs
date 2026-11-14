using System.Data;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Data.Sqlite;
using MyStb.Api;
using MyStb.Api.Database;
using MyStb.Api.Endpoints;
using MyStb.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Logs: ECS JSON on stdout. Traces: OTLP, only when OTEL_EXPORTER_OTLP_ENDPOINT is set.
builder.AddObservability("my-stb-api", "/healthz");

builder.Services.AddScoped<IDbConnection>(_ =>
{
    var conn = new SqliteConnection(builder.Configuration.GetConnectionString("Sqlite"));
    conn.Open();
    return conn;
});

builder.Services.AddHttpClient();

// TPBI's GTFS feed has shipped with an expired cert before with no ETA on renewal;
// tolerate TLS validation errors on this client only so the static feed can still refresh.
builder.Services.AddHttpClient("Gtfs")
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = (_, _, _, _) => true
    });

builder.Services.AddSingleton<GtfsLoaderService>();
builder.Services.AddSingleton<VehiclePollerService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<VehiclePollerService>());

builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IGeocodingProvider>(sp =>
{
    var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient();
    var baseUrl = builder.Configuration["Geocoding:NominatimBaseUrl"]!;
    return new NominatimProvider(http, baseUrl, sp.GetRequiredService<IMemoryCache>(),
        sp.GetRequiredService<ILogger<NominatimProvider>>());
});

builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 16 * 1024);
builder.Services.AddProblemDetails();

builder.Services.Configure<ForwardedHeadersOptions>(o => RateLimiting.ConfigureForwardedHeaders(
    o, builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? []));

var (generalLimit, expensiveLimit) = RateLimiting.ReadLimits(builder.Configuration);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(c => RateLimiting.General(c, generalLimit));
    o.AddPolicy(RateLimiting.ExpensivePolicy, c => RateLimiting.Expensive(c, expensiveLimit));
    o.OnRejected = (ctx, _) =>
    {
        var seconds = ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry)
            ? Math.Max(1, (int)Math.Ceiling(retry.TotalSeconds))
            : 60;
        ctx.HttpContext.Response.Headers.RetryAfter = seconds.ToString(System.Globalization.CultureInfo.InvariantCulture);
        return ValueTask.CompletedTask;
    };
});

builder.Services.AddSingleton<IAlertsProvider>(sp =>
{
    var logger = sp.GetRequiredService<ILogger<FileAlertsProvider>>();
    var path = builder.Configuration["Alerts:Path"]
               ?? Path.Combine(AppContext.BaseDirectory, "Data", "alerts.json");
    return new FileAlertsProvider(path, logger);
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
    DbInitializer.Initialize(db);
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseRouting();
app.UseCors();
app.UseRateLimiter();

// Runs only for requests that matched an endpoint and passed the limiter,
// so 404s and 429s don't keep the poller awake.
app.Use(async (ctx, next) =>
{
    if (ctx.GetEndpoint() is not null && ctx.Request.Path.StartsWithSegments("/api"))
    {
        ctx.RequestServices.GetRequiredService<VehiclePollerService>().Touch();
        await ctx.RequestServices.GetRequiredService<GtfsLoaderService>().EnsureLoadedAsync(ctx.RequestAborted);
    }
    await next();
});

app.MapGet("/healthz", () => "ok");
app.MapStopEndpoints();
app.MapRouteEndpoints();
app.MapVehicleEndpoints();
app.MapSearchEndpoints();
app.MapAlertEndpoints();

app.Run();
