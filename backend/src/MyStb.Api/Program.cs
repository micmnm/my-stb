using System.Data;
using Microsoft.Data.Sqlite;
using MyStb.Api.Database;
using MyStb.Api.Endpoints;
using MyStb.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IDbConnection>(_ =>
{
    var conn = new SqliteConnection(builder.Configuration.GetConnectionString("Sqlite"));
    conn.Open();
    return conn;
});

builder.Services.AddHttpClient();
builder.Services.AddSingleton<GtfsLoaderService>();
builder.Services.AddSingleton<VehiclePollerService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<VehiclePollerService>());

builder.Services.AddSingleton<IGeocodingProvider>(sp =>
{
    var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient();
    var baseUrl = builder.Configuration["Geocoding:NominatimBaseUrl"]!;
    return new NominatimProvider(http, baseUrl);
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

app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api"))
    {
        var expectedKey = app.Configuration["ApiKey"];
        if (!string.IsNullOrEmpty(expectedKey))
        {
            var providedKey = ctx.Request.Headers["X-Api-Key"].FirstOrDefault();
            if (providedKey != expectedKey)
            {
                ctx.Response.StatusCode = 401;
                await ctx.Response.WriteAsync("Unauthorized");
                return;
            }
        }
    }
    await next();
});

app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api"))
    {
        ctx.RequestServices.GetRequiredService<VehiclePollerService>().Touch();
        await ctx.RequestServices.GetRequiredService<GtfsLoaderService>().EnsureLoadedAsync(ctx.RequestAborted);
    }
    await next();
});

app.UseCors();

app.MapGet("/health", () => "ok");
app.MapStopEndpoints();
app.MapRouteEndpoints();
app.MapVehicleEndpoints();
app.MapSearchEndpoints();

app.Run();
