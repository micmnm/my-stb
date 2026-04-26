using System.Data;
using Dapper;

namespace MyStb.Api.Database;

public static class DbInitializer
{
    public static void Initialize(IDbConnection db)
    {
        db.Execute("""
            CREATE TABLE IF NOT EXISTS stops (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS routes (
                id TEXT PRIMARY KEY,
                short_name TEXT NOT NULL,
                long_name TEXT NOT NULL,
                type INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS route_stops (
                route_id TEXT NOT NULL,
                stop_id TEXT NOT NULL,
                direction_id INTEGER NOT NULL,
                stop_sequence INTEGER NOT NULL,
                PRIMARY KEY (route_id, stop_id, direction_id),
                FOREIGN KEY (route_id) REFERENCES routes(id),
                FOREIGN KEY (stop_id) REFERENCES stops(id)
            );
            CREATE TABLE IF NOT EXISTS schedules (
                route_id TEXT NOT NULL,
                stop_id TEXT NOT NULL,
                arrival_time TEXT NOT NULL,
                departure_time TEXT NOT NULL,
                service_id TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS vehicles (
                id TEXT PRIMARY KEY,
                route_id TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                direction_id INTEGER NOT NULL,
                license_plate TEXT,
                timestamp INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS route_shapes (
                route_id TEXT NOT NULL,
                direction_id INTEGER NOT NULL,
                shape_id TEXT NOT NULL,
                PRIMARY KEY (route_id, direction_id)
            );
            CREATE TABLE IF NOT EXISTS shape_points (
                shape_id TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL,
                sequence INTEGER NOT NULL,
                PRIMARY KEY (shape_id, sequence)
            );
            CREATE INDEX IF NOT EXISTS idx_stops_lat_lng ON stops(lat, lng);
            CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
            CREATE INDEX IF NOT EXISTS idx_route_stops_stop ON route_stops(stop_id);
            CREATE INDEX IF NOT EXISTS idx_vehicles_route ON vehicles(route_id);
            CREATE INDEX IF NOT EXISTS idx_schedules_route_stop ON schedules(route_id, stop_id);
            """);
    }
}
