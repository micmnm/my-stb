# Phase 3 — Route detail

**Goal:** Build the line schematic — every stop on a route plus all active vehicles inline, with reverse-direction pill and service-alert banner.

**Depends on:** Phase 1 (`SchematicStop`, `SchematicRail`, `AlertBanner`, `RouteBadge`), Phase 2 (the arrivals hook pattern; navigation from Stop detail's "See full line ↗").

**Test it:** navigate to `/route/41?dir=a` — see the route header, an alert banner if any active alerts, the section label "{n} stops · {m} vehicles en route" + Reverse pill, then a vertical schematic with stops and vehicle markers carrying ETA labels. Tap Reverse — direction flips in place. Tap a stop — navigate to its Stop detail.

**Handoff references:** [`screens/route-detail.md`](../handoff/screens/route-detail.md), [`data.md`](../handoff/data.md), [`decisions.md`](../handoff/decisions.md) Q6–Q9.

---

## Scope

- **Backend** — `/api/routes/{id}/detail?direction=a|b` returning the `RouteDetailResponse` from `data.md` (route + ordered stops + active vehicles + alerts).
- **Backend** — `/api/alerts?routeId=…` (returns `ServiceAlert[]`, mocked from a static JSON file for v1 — STB doesn't expose this on the public feed).
- **Frontend** — `useRouteDetail(routeId, direction)` polling hook (15 s).
- **Frontend** — `<RouteDetailPage/>` page.
- **Frontend** — flesh out `SchematicRail` to render vehicle markers per Q7.
- **Frontend** — the Reverse pill (Q6) wired into the section header right slot.

## Out of scope

- Push notifications for alerts on saved lines (v1.5).
- Live alert ingestion from STB — alerts come from a JSON file checked into the repo (`backend/src/MyStb.Api/Data/alerts.json`). Phase 8 polish can wire a real alerts feed if one materializes.

## Tasks

### 1. Backend — alerts source

Create `backend/src/MyStb.Api/Data/alerts.json` with a shape like:

```json
[
  {
    "id": "alert-001",
    "severity": "warning",
    "title": "Reroute via Drumul Sării",
    "body": "Overhead works · until Fri, 22:00",
    "affectedRouteIds": ["41"],
    "startsAt": "2026-04-26T05:00:00+03:00",
    "endsAt": "2026-05-01T22:00:00+03:00",
    "url": "https://stbsa.ro/..."
  }
]
```

Add an `IAlertsProvider` service that loads the file on startup, watches it with `FileSystemWatcher` for hot-reload, and exposes `GetActiveForRoute(routeId, now)` filtered by start/end timestamps.

Endpoint: `GET /api/alerts?routeId={id}` returns the active list. Stack order per Q9: severity desc (critical → warning → info), then `startsAt` desc.

### 2. Backend — route detail endpoint

File: extend `backend/src/MyStb.Api/Endpoints/RouteEndpoints.cs`.

`GET /api/routes/{id}/detail?direction=a|b`. Returns:

```jsonc
{
  "route": { "id": "41", "shortName": "41", "longName": "...", "mode": "tram",
             "terminusA": { "stopId": "...", "name": "Drumul Taberei" },
             "terminusB": { "stopId": "...", "name": "Pipera" } },
  "direction": "a",
  "stops": [ /* SchematicStop[] in order along the line for this direction */ ],
  "vehicles": [ /* Vehicle[] active on this route in this direction */ ],
  "alerts": [ /* ServiceAlert[] */ ],
  "serverTime": "..."
}
```

Implementation:
- Pull route + ordered stops from the GTFS loader. Direction `a` = toward `terminusA`; `b` = reverse.
- For each stop, compute `etaSecondsFromUser` only if the request includes a `?fromStopId=...` (optional; not used until "navigate from a stop" flow); otherwise omit.
- Vehicles: filter the cached vehicle poll by `routeId` and direction. For each, set `nextStopId` and `nextStopEtaSeconds` using the route shape distance.
- Alerts: from the alerts provider above.

Test: hit `GET /api/routes/41/detail?direction=a` against the local backend and assert `stops.length > 0`, `vehicles[].direction === 'a'`.

### 3. Frontend types

Extend `frontend/src/types/index.ts` with `Route`, `RouteDetailResponse`, `SchematicStop`, `ServiceAlert` (the latter already added in Phase 2 if you got ahead).

### 4. Frontend API client

```ts
getRouteDetail(routeId: string, direction: 'a' | 'b'): Promise<RouteDetailResponse> {
  return get(`/api/routes/${encodeURIComponent(routeId)}/detail?direction=${direction}`);
},
getAlertsForRoute(routeId: string): Promise<ServiceAlert[]> {
  return get(`/api/alerts?routeId=${encodeURIComponent(routeId)}`);
},
```

### 5. `useRouteDetail` polling hook

`frontend/src/hooks/useRouteDetail.ts`. Same shape as `useStopArrivals` (15 s polling, pause on hidden, expose `isStale`, `lastUpdated`, `refetch`). Takes `(routeId, direction)`. When `direction` flips, call `refetch()` immediately rather than waiting for the next tick.

### 6. SchematicRail with vehicles (Q7)

Extend `SchematicRail` to accept `vehicles: Vehicle[]` and overlay them on the rail. Per Q7:

- Each vehicle is a 22 px red circle (use the appropriate `vehicle-{mode}.svg` from `handoff/assets/`) attached to the stop it just left (i.e., `nextStopId`'s previous entry on the schematic).
- An ETA pill next to each vehicle: the vehicle with the smallest `nextStopEtaSeconds` shows `"{m}m · next"` (i18n: `t('route_detail.next_eta', { m })`); others show `"{m}m"`.
- Vehicles for the *opposite* direction are excluded (they belong to the reversed view).

Add an `eta?: number` and `vehicle?: { label: string; status: 'next' | 'following' }` prop to `SchematicStop` for the right-side ETA column.

### 7. Reverse pill (Q6)

Build `<ReversePill/>` — small chip, `--bg-elev` background, swap icon + `t('route_detail.reverse')`. Tap flips local `direction` state on the page. Animation: 200 ms cross-fade on the schematic content (use `--ease-ui` / `--dur-fast`).

Mount it in the right slot of the `SectionHeader` — alongside `t('route_detail.vehicles_count', { n })` ICU plural.

### 8. `<RouteDetailPage/>` page

File: `frontend/src/pages/route-detail/index.tsx`.

Layout per `screens/route-detail.md`:

```
[ScreenShell]
├─ Header
│   ├─ Back · Bookmark
│   ├─ RouteBadge (lg) + "Tram 41"
│   └─ "→ Pipera" terminus headsign
├─ AlertBanner stack (only if alerts.length > 0)
├─ SectionHeader "Stops · {n} vehicles en route" + ReversePill (right)
├─ SchematicRail with stops + vehicle markers
└─ BottomNav
```

State:
- `direction` from `useSearchParams('dir')` defaulting to `'a'`. Update URL on flip.
- Read `routeId` from `useParams`.
- Tapping a `SchematicStop` → `navigate('/stop/' + stop.id)`.
- Bookmark icon: stub for Phase 6 (same TODO as Stop detail).

### 9. AlertBanner stack rules

Per Q9:
- Always at the top, above the schematic.
- Sort by severity desc, then `startsAt` desc.
- If more than 3, render first 2 + an expander row "+ {n} {t('alert.more', { n })}". Tap expands to show all.
- `role="alert"` on critical, `role="status"` otherwise.

### 10. States

- **Loading:** route header + skeleton schematic with 8 placeholder stops (use `<Skeleton/>` × 8 inside a `SchematicRail` shell).
- **No vehicles in service** (off-hours): schematic renders without vehicle markers, line tinted neutral, banner with copy `t('route_detail.no_active_vehicles')` (add the key to `copy.md` translations: RO "Linia nu are vehicule active acum.", EN "No vehicles in service right now.").
- **Stale:** vehicle markers fade to 60 % opacity; section label appends "· Last update HH:MM".
- **Alerts but no live data:** banner still shows; ETAs hidden across schematic.

### 11. Verify

- Visit `/route/41?dir=a` — header + schematic + vehicles.
- Tap Reverse — header headsign flips, vehicles re-position on the reversed rail. URL updates to `?dir=b`.
- Tap a stop in the schematic — navigates to `/stop/{id}`.
- Tap "Back" — returns to Stop detail (chain works per `flows.md`).
- Add a fake alert to `alerts.json` with `affectedRouteIds: ["41"]` and `severity: "warning"` — banner appears at the top within ~60 s (or restart backend).
- Add three more alerts — see "+ 2 more" expander.
- Stop the backend → vehicles fade, "Last update HH:MM" caption.

## Done when

- [ ] `GET /api/routes/{id}/detail?direction=a|b` returns the spec shape with vehicles filtered by direction.
- [ ] `/api/alerts?routeId=…` reads from `alerts.json` and respects start/end timestamps.
- [ ] `/route/:id` renders header, alert stack (when present), section header with Reverse pill, and the full schematic.
- [ ] Reverse pill flips direction in place — no full screen re-mount, no URL bounce.
- [ ] Multiple vehicles render inline per Q7; the soonest carries `· next`, others just the ETA.
- [ ] Tapping a stop navigates to its Stop detail; back chain unwinds correctly.
- [ ] Loading / off-hours / stale / multi-alert states all render correctly.
- [ ] All copy via `t()`.
