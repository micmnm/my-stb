using System.Data;
using Microsoft.Data.Sqlite;
using MyStb.Api.Database;

namespace MyStb.Api.Tests;

public static class TestDb
{
    public static IDbConnection Create()
    {
        var conn = new SqliteConnection("Data Source=:memory:");
        conn.Open();
        DbInitializer.Initialize(conn);
        return conn;
    }
}
