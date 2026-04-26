# Bucharest STB Real-Time Navigation App — Design Spec

## Overview

A personal web app (PWA) for real-time public transit navigation in Bucharest. Uses STB/Metrorex public data to find the best direct bus/tram/trolleybus route from your current location to a destination, with live vehicle tracking.

## Architecture

### Components

**C# Backend** (ASP.NET minimal API + hosted worker service)
- Deployed on user's Kubernetes cluster via Woodpecker CI
- SQLite database for all persistent storage
- Vehicle poller polls mo-bi.ro every 30 seconds, only while users are active (demand-driven)
- GTFS loader downloads and parses TPBI static data on demand (when stale + user active)
- Route calculator finds direct routes between two points
- Geocoding proxy abstracts Nominatim (swappable provider layer)

**React Frontend** (Vite, PWA)
- Deployed on user's Kubernetes cluster via Woodpecker CI (static build in nginx container)
- Leaflet map with OpenStreetMap tiles
- Browser Geolocation API for current position
- All data fetched from C# backend REST API
- Mobile-first bottom-sheet UI pattern

### Data Sources

| Source | Data | Format | Refresh |
|---|---|---|---|
| `maps.mo-bi.ro/api/busData` | Real-time vehicle positions (STB surface transport) | JSON | Every 10s |
| `maps.mo-bi.ro/api/nextArrivals/{stationId}` | Predicted arrivals at a stop | JSON | On demand (v1: used for ETA refinement) |
| `maps.mo-bi.ro/api/dataset` | Vehicle data + passenger counts | JSON | Not used in v1 (deferred) |
| `gtfs.tpbi.ro/regional/BUCHAREST-REGION.zip` | Static schedules, routes, stops (all modes incl. Metrorex) | GTFS | Weekly |
| Nominatim (OSM) | POI and address search | JSON | On demand |

**Rate limit on mo-bi.ro**: 1 request per 10 seconds per IP. No authentication required.

**Metrorex**: Static schedule data only (from GTFS). No real-time vehicle positions available.

### Data Flow

1. C# vehicle poller polls `mo-bi.ro/api/busData` every 30s (only while users are active), upserts vehicle positions into SQLite
2. GTFS loader downloads and parses `BUCHAREST-REGION.zip` on demand (first request or when data > 7 days stale), populates routes/stops/schedules tables
3. User opens app, browser gets GPS position
4. User selects destination (search or favourite), frontend sends origin + destination to backend
5. Backend finds nearby stops, identifies direct routes serving both, estimates ETAs from real-time data, returns ranked options
6. Frontend renders chosen route on map with live vehicle markers (polls backend every 10s)

## Backend API

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/routes?fromLat=&fromLng=&toLat=&toLng=` | Find direct routes between two points, ranked by real-time ETA |
| `GET` | `/api/vehicles?routeId=` | Live vehicle positions for a specific route |
| `GET` | `/api/stops/nearby?lat=&lng=&radius=500` | Stops within radius of a point |
| `GET` | `/api/search?q=` | POI/address search (proxied to Nominatim) |


*Favourites are stored in browser localStorage — no backend endpoints needed.*

### Route Calculation Logic

1. Find all stops within configurable radius (default 500m) of origin point
2. Find all stops within configurable radius of destination point
3. Find routes that have both an origin-area stop and a destination-area stop (respecting direction)
4. For each matching route, get real-time vehicle positions from the vehicles table
5. Estimate ETA based on vehicle position relative to the origin stop
6. Return results ranked by estimated total travel time

## Database Schema (SQLite)

### Tables

**stops**
- `id` TEXT PRIMARY KEY — GTFS stop_id
- `name` TEXT
- `lat` REAL
- `lng` REAL

**routes**
- `id` TEXT PRIMARY KEY — GTFS route_id
- `short_name` TEXT — e.g. "381", "1" (tram)
- `long_name` TEXT
- `type` INTEGER — GTFS route_type (0=tram, 3=bus, 11=trolleybus, 1=metro)

**route_stops**
- `route_id` TEXT
- `stop_id` TEXT
- `direction_id` INTEGER
- `stop_sequence` INTEGER
- PRIMARY KEY (route_id, stop_id, direction_id)

**schedules**
- `route_id` TEXT
- `stop_id` TEXT
- `arrival_time` TEXT
- `departure_time` TEXT
- `service_id` TEXT — links to GTFS calendar for day-of-week

**vehicles**
- `id` TEXT PRIMARY KEY
- `route_id` TEXT
- `lat` REAL
- `lng` REAL
- `direction_id` INTEGER
- `license_plate` TEXT
- `timestamp` INTEGER
- `updated_at` INTEGER

*Favourites are stored in browser localStorage, not in the backend database.*

## Frontend

### Tech Stack

- React 18+ with Vite
- Leaflet + react-leaflet for maps
- OpenStreetMap tiles (free)
- PWA with service worker (basic shell caching)
- Mobile-first responsive design

### UX Flow

1. **App opens** — full-screen map centered on current location (blue dot)
2. **Set destination** — tap search bar at top of bottom sheet, either:
   - Type to search POIs/addresses via Nominatim
   - Tap a favourite from the chips/list below the search bar
3. **View route options** — bottom sheet shows route cards:
   - Line number and type icon (bus/tram/trolley)
   - Direction name
   - ETA to origin stop
   - Number of stops to destination
   - Walking distance from destination stop to actual POI ("last mile")
4. **Select a route** — map draws:
   - Route polyline (the bus/tram path)
   - Vehicle markers (real-time, animated between positions)
   - Origin stop marker
   - Destination stop marker
   - Dotted line from destination stop to POI with distance label
5. **Live tracking** — vehicle positions refresh every 10s while viewing a route

### Map Layers

- **Base**: OpenStreetMap tiles
- **User position**: Blue pulsing dot (browser geolocation)
- **Vehicle markers**: Colored by transport type, show line number, animate between position updates
- **Route polyline**: Drawn from GTFS shape data
- **Stop markers**: Shown for origin and destination stops
- **Last mile**: Dotted line from destination stop to POI, with distance badge

### Favourites Management

- Accessible from menu/settings icon
- Simple list with name and address
- Add: search for a place, tap "save as favourite"
- Edit: tap to rename
- Delete: swipe or tap delete

### Polling Strategy

- Frontend polls `GET /api/vehicles?routeId=X` every 10 seconds while tracking a route
- Vehicle markers animate smoothly between old and new positions (CSS transition or Leaflet animation)
- When not tracking, no polling (save battery/bandwidth)

## Deployment

### Infrastructure

- **Backend**: Dockerfile → `dotnet publish` → minimal container → K8s deployment
- **Frontend**: `vite build` → static files → nginx container → K8s deployment
- **CI/CD**: Woodpecker pipelines for both (build → test → push image → deploy)
- **Domain**: User's own domain, K8s ingress
- **Repo**: https://github.com/micmnm/my-stb (application code only)
- **Note**: K8s manifests, Woodpecker pipelines, and infra configs are local-only — not pushed to the public repo

### Cost

| Component | Cost |
|---|---|
| mo-bi.ro API | $0 |
| GTFS data | $0 |
| Nominatim (OSM) | $0 |
| Leaflet + OSM tiles | $0 |
| K8s hosting | Existing infra |
| **Total** | **$0 incremental** |

## Scope — v1

### In scope

- Real-time vehicle position tracking (STB surface transport: bus, tram, trolleybus)
- Direct route finding (single vehicle, no transfers)
- Route ranking by real-time ETA
- Live vehicle tracking on selected route
- Last-mile distance indicator (stop → POI)
- Favourites management (CRUD)
- POI/address search via Nominatim
- Static metro schedule display (from GTFS, no real-time)
- PWA (add to home screen)
- Mobile-first UI

### Out of scope (v1)

- Multi-modal transfers (bus → metro → bus)
- Walking time calculations (distance only for last mile)
- User accounts / authentication (single user)
- Metrorex real-time data (not available from any source)
- Push notifications
- Offline mode beyond basic PWA shell caching
- Passenger count display (available in API but deferred)

### Future considerations (v2+)

- Multi-modal route planning with transfers
- Walking time estimates for first/last mile
- Passenger load indicators (data available from `mo-bi.ro/api/dataset`)
- Multiple geocoding providers (Google Places as upgrade from Nominatim)
- Service alerts display

## Geocoding Abstraction

The geocoding layer is designed as a provider interface:

```
IGeocodingProvider
  ├── NominatimProvider (v1)
  └── GooglePlacesProvider (future)
```

Backend proxies all search requests through this interface. Swapping providers requires implementing the interface and changing configuration — no frontend changes needed.
