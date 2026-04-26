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
        ctx.RequestServices.GetRequiredService<VehiclePollerService>().Touch();
        await ctx.RequestServices.GetRequiredService<GtfsLoaderService>().EnsureLoadedAsync(ctx.RequestAborted);
    }
    await next();
});

app.MapGet("/health", () => "ok");
app.MapStopEndpoints();
app.MapRouteEndpoints();
app.MapVehicleEndpoints();

app.Run();
