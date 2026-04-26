using System.Data;
using Microsoft.Data.Sqlite;
using MyStb.Api.Database;
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

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IDbConnection>();
    DbInitializer.Initialize(db);
}

app.MapGet("/health", () => "ok");

app.Run();
