# Data shapes

TypeScript-flavored interfaces for everything My STB consumes or stores. Backend should target these. If using GTFS-RT or STB's AVL feed, map them at the API edge — don't leak transit-protocol shapes into the app.

---

## Core entities

```ts
type StopId = string;       // STB internal stop ID, e.g. "1180"
type RouteId = string;      // e.g. "41", "M2", "178"
type VehicleId = string;    // unique per active vehicle
type ISOTime = string;      // "2025-04-27T18:42:00+03:00"

interface Stop {
  id: StopId;
  name: string;             // "Piața Romană"
  street?: string;          // "Bd. Magheru"
  lat: number;
  lng: number;
  routes: RouteId[];        // routes serving this stop
  zones?: string[];         // fare zones, if applicable
}

interface Route {
  id: RouteId;
  shortName: string;        // "41", "M2"
  longName?: string;        // "Drumul Taberei – Pipera"
  mode: VehicleMode;
  color?: string;           // hex; if absent, derive from mode
  terminusA: { stopId: StopId; name: string };
  terminusB: { stopId: StopId; name: string };
}

type VehicleMode = "tram" | "bus" | "trolley" | "metro";

interface Vehicle {
  id: VehicleId;
  routeId: RouteId;
  direction: "a" | "b";     // a = toward terminusA, b = toward terminusB
  lat: number;
  lng: number;
  bearing?: number;         // degrees, if available
  nextStopId: StopId;
  nextStopEtaSeconds: number;
  occupancy?: "low" | "medium" | "high";
  updatedAt: ISOTime;
}
```

---

## Live arrivals at a stop

```ts
interface ArrivalsResponse {
  stopId: StopId;
  serverTime: ISOTime;
  arrivals: Arrival[];
}

interface Arrival {
  routeId: RouteId;
  vehicleId: VehicleId;
  direction: "a" | "b";
  destinationStopId: StopId;
  destinationName: string;  // for display, denormalized
  etaSeconds: number;       // 0 means at-stop
  isLive: boolean;          // false = scheduled, no live AVL
  isCancelled?: boolean;
}
```

**Display rules** (engineering):
- `etaSeconds < 60` → display "<1 min"
- `60 ≤ etaSeconds < 60*60` → display "Math.round(etaSeconds / 60) min"
- `etaSeconds >= 60*60` → display "HH:MM" (departure clock time)

**Sort order** (Q1): ascending by `etaSeconds`. Two-way row is constructed by grouping arrivals where `routeId` matches and one is direction `"a"`, the other `"b"`. Keep the soonest of the two as the row's primary sort key.

---

## Route detail

```ts
interface RouteDetailResponse {
  route: Route;
  direction: "a" | "b";     // current view direction
  stops: SchematicStop[];   // ordered along the line in chosen direction
  vehicles: Vehicle[];      // active on this route, this direction
  alerts: ServiceAlert[];   // active alerts for this route
  serverTime: ISOTime;
}

interface SchematicStop extends Stop {
  etaSecondsFromUser?: number;  // optional; if user is on the line
  isUserStop?: boolean;          // the stop the user came from
}
```

---

## Service alerts

```ts
interface ServiceAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;            // "Reroute via Drumul Sării"
  body: string;             // "Overhead works · until Fri, 22:00"
  affectedRouteIds: RouteId[];
  affectedStopIds?: StopId[];
  startsAt: ISOTime;
  endsAt?: ISOTime;
  url?: string;             // STB official link
}
```

Display rule (Q9): always render in the top-banner pattern on Route detail. Stack vertically if multiple. Sort by severity (critical → warning → info), then `startsAt` desc.

---

## Trip planning

```ts
interface PlanRequest {
  from: PlanLocation;
  to: PlanLocation;
  when: { type: "now" } | { type: "leaveAt"; time: ISOTime } | { type: "arriveBy"; time: ISOTime };
  modes?: VehicleMode[];    // default: all
  maxWalkMeters?: number;   // default: 1000
  accessible?: boolean;
}

type PlanLocation =
  | { kind: "stop";    stopId: StopId }
  | { kind: "address"; lat: number; lng: number; label: string };

interface PlanResponse {
  trips: Trip[];
}

interface Trip {
  id: string;
  startsAt: ISOTime;
  endsAt: ISOTime;
  durationSeconds: number;
  walkSecondsTotal: number;
  legs: Leg[];
}

type Leg =
  | { kind: "walk";    fromName: string; toName: string; durationSeconds: number; meters: number }
  | { kind: "transit"; routeId: RouteId; mode: VehicleMode;
      fromStopId: StopId; fromStopName: string;
      toStopId: StopId;   toStopName: string;
      headsign: string;
      departsAt: ISOTime; arrivesAt: ISOTime;
      isLive: boolean;
      stops?: number;      // intermediate stop count
    };
```

---

## Local storage (no backend)

```ts
interface LocalStore {
  saved: SavedItem[];       // user's saved stops + lines
  recents: RecentItem[];    // last viewed
  prefs: Prefs;
}

interface SavedItem {
  kind: "stop" | "route";
  id: string;
  nickname?: string;        // e.g. "Home"
  order: number;
  addedAt: ISOTime;
}

interface RecentItem {
  kind: "stop" | "route" | "address" | "trip";
  refId: string;
  visitedAt: ISOTime;
}

interface Prefs {
  language: "ro" | "en";    // default: system
  theme: "auto" | "light" | "dark";  // default: auto
  units: "metric";          // future: imperial
}
```

---

## Refresh cadence

- **Stop detail (live arrivals):** 15 s polling while screen active. Stop polling on background. On return, refresh immediately.
- **Route detail:** 15 s polling while active.
- **Home:** 30 s polling for the saved stops' next arrivals.
- **Service alerts:** 60 s polling, or push (v1.5).
- **Stale threshold:** if `now - serverTime > 60 s`, mark UI as stale (see `_states.md`).

---

## Errors the UI must handle

| Error | UX |
|---|---|
| Network down | Persistent banner "Offline. Showing last known data." Disable refresh. |
| 5xx from feed | Same as offline. |
| Empty arrivals | Empty state with "No arrivals in the next hour" copy. |
| Vehicle disappears mid-trip (was 3 min, now gone) | Smooth transition: row collapses, no jumpy re-sort. Toast: "Tram 41 was delayed or removed." |
| GPS denied | Home shows "Search for a stop" instead of "Stops nearby". No nag. |
