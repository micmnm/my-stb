# Phase 2 — Stop detail

**Goal:** Build the most important screen in the app: live arrivals at one stop, both directions, sorted by ETA, with inline-expand row containing a mini-map.

**Depends on:** Phase 0 (router, i18n, tokens), Phase 1 (`TwoWayArrivalRow`, `LiveDot`, `WalkChip`, `Skeleton`, `RouteBadge`, icons).

**Test it:** navigate to `/stop/1180` (or any valid STB stop ID) — see the stop name, walk chip, both-directions arrival list, freshness clock ticking. Tap a row — it expands inline with a mini-map and the next 3 ETAs. Tap "See full line ↗" — navigates to `/route/{routeId}` (a stub for now, fleshed out in Phase 3).

**Handoff references:** [`screens/stop-detail.md`](../handoff/screens/stop-detail.md), [`data.md`](../handoff/data.md), [`decisions.md`](../handoff/decisions.md) Q1–Q5, [`screens/_states.md`](../handoff/screens/_states.md).

---

## Scope

- **Backend** — new `/api/stops/{id}/arrivals` endpoint returning the `ArrivalsResponse` shape from `data.md`. The current backend has vehicles + routes; arrivals need to be assembled by joining route × vehicle × stop.
- **Backend** — `/api/stops/{id}` returns the `Stop` entity with routes serving it. Used for the header.
- **Frontend** — `useStopArrivals(stopId)` polling hook (15 s while screen active, pause on `document.hidden`).
- **Frontend** — `<StopDetailPage/>` page consuming the hook, rendering the arrivals list per Q1/Q2.
- **Frontend** — `<ExpandedArrivalCard/>` molecule (the only Phase-1 component deferred).
- **Frontend** — handle all states from `screens/_states.md`: loading, empty (no arrivals next hour), stale (>60 s), error, offline.

## Out of scope

- Bookmark toggle wiring to the saved store (Phase 6 owns that — but expose the button now and stub `onBookmark` for Phase 6).
- Share sheet (deep-link plumbing happens in Phase 8 polish).
- Any caching beyond in-memory.

## Tasks

### 1. Backend — Arrivals endpoint

File: `backend/src/MyStb.Api/Endpoints/StopEndpoints.cs` (extend) or new `ArrivalsEndpoints.cs`.

Route: `GET /api/stops/{id}/arrivals` returning:

```jsonc
{
  "stopId": "1180",
  "serverTime": "2026-04-27T18:42:00+03:00",
  "arrivals": [
    {
      "routeId": "41",
      "vehicleId": "v-417",
      "direction": "a",
      "destinationStopId": "...",
      "destinationName": "Drumul Taberei",
      "etaSeconds": 180,
      "isLive": true,
      "isCancelled": false
    }
  ]
}
```

Implementation steps:
- Look up the `Stop` from the GTFS loader.
- For each `routeId` serving the stop, find active `Vehicle`s on that route (via the existing vehicle poller).
- For each vehicle, compute ETA seconds to this stop using the existing `RouteCalculatorService` (or the route shape distance / average speed). If the vehicle has already passed the stop in its current direction, exclude it.
- Tag `isLive: true` when the vehicle's `updatedAt` is within 90 s; otherwise `false`.
- If a route serves the stop but has no live vehicles, optionally include a scheduled arrival from GTFS static (only if static schedule loading is already wired — otherwise leave empty for v1).
- Sort by `etaSeconds` ascending.

Add a unit/integration test under `backend/tests/` that hits a known stop and asserts non-empty arrivals when vehicles are present.

### 2. Backend — Stop-with-routes endpoint

`GET /api/stops/{id}` returning the `Stop` shape from `data.md`. The frontend needs `name`, `street?`, `lat`, `lng`, `routes` (route IDs) for the header. Reuse the existing GTFS-loaded stop record.

### 3. Frontend types

Extend `frontend/src/types/index.ts` with the `data.md` shapes — `Arrival`, `ArrivalsResponse`, `ServiceAlert` (used in Phase 3 too). Keep the existing `Stop`/`RouteOption`/`Vehicle` types — don't break the legacy app.

### 4. Frontend API client

Extend `frontend/src/api/client.ts`:

```ts
getStop(id: string): Promise<Stop & { routes: string[] }> {
  return get(`/api/stops/${encodeURIComponent(id)}`);
},
getArrivals(stopId: string): Promise<ArrivalsResponse> {
  return get(`/api/stops/${encodeURIComponent(stopId)}/arrivals`);
},
```

### 5. `useStopArrivals` polling hook

File: `frontend/src/hooks/useStopArrivals.ts`. Returns `{ data, error, isStale, lastUpdated, refetch }`.

Behavior:
- Initial fetch on mount.
- 15 s `setInterval` polling while screen visible.
- Pause polling on `visibilitychange` → hidden; resume + immediate refetch on visible.
- `isStale = (Date.now() - new Date(serverTime).getTime()) > 60_000`.
- On error, retain the last successful response and surface `error` so the page can show the offline banner without losing data.

### 6. `<ExpandedArrivalCard/>` molecule

File: `frontend/src/components/molecules/ExpandedArrivalCard.tsx`.

Per Q3:
- Re-renders the row header (RouteBadge + both-directions ETAs) but with the brand-red 2 px outline.
- Below: a 120 px tall mini-map showing the next vehicle for the tapped direction. Reuse Leaflet — center on the stop, render the vehicle marker. Disable interaction (`dragging={false}`, `scrollWheelZoom={false}`) — it's decoration.
- Below the map: "Următoarele / Following" caption + 3 next ETAs for the same direction (mono, tabular).
- Footer: `<button>` "Vezi linia / See full line ↗" → `navigate('/route/' + routeId + '?dir=' + direction)`.

Tapping the mini-map navigates the same way (per Q3).

Animation: height transition 200 ms ease-out (use `var(--ease-out)` and `var(--dur-fast)`). Skip under `prefers-reduced-motion`.

### 7. `<StopDetailPage/>` page

File: `frontend/src/pages/stop-detail/index.tsx`.

Layout per `screens/stop-detail.md`:

```
[ScreenShell]
├─ Header (compact, no map hero)
│   ├─ Back / Share / Bookmark icon row
│   ├─ Label "Stop · {id}" (mono, --fg-3, label class)
│   ├─ Stop name (h1 / display 30 px)
│   └─ WalkChip (if user position known) + line count caption
├─ SectionHeader "Sosiri · ambele direcții" + LiveDot + "Live · HH:MM"
├─ Arrivals list (scroll)
│   └─ TwoWayArrivalRow × N  (one expanded at a time)
└─ BottomNav
```

Implementation:
- Read `:id` from URL via `useParams`.
- Fetch stop meta (`api.getStop`) and arrivals (`useStopArrivals`).
- Group arrivals by `routeId` — pick the soonest A and the soonest B for each route (Q2). Sort the resulting groups by `min(A.eta, B.eta)` ascending (Q1).
- Maintain `expandedRouteId` local state — only one row open. Tapping the same row collapses it. Tapping another collapses the previous, then opens the new one.
- Pass `isStale` from the hook into row props so ETAs degrade to `--fg-3` and the LiveDot stops pulsing.

### 8. States

All states from `screens/_states.md`:

- **Loading:** 4 `<TwoWayArrivalRow>` skeletons (use the `Skeleton` primitive — three bars per row: badge + dirA stack + dirB stack).
- **Empty:** centered `t('stop_detail.no_arrivals')` line.
- **Stale (>60 s):** ETAs in `--fg-3`, no LiveDot pulse, an `AlertBanner severity="warning"` at the top reading `t('stop_detail.stale_label')` with a Retry button calling `refetch()`.
- **Error / offline:** persistent banner `t('errors.offline')` + Retry. Last-known data still rendered if present.
- **Terminus stop:** rows render `—` on the missing direction (already handled by `TwoWayArrivalRow` from Phase 1).

### 9. Wire bookmark stub

Bookmark icon toggles a local `useState` for now — the call to actually persist into the saved store happens in Phase 6. Leave a `// TODO(Phase 6): wire to favourites store` line.

### 10. Verify

- `npm run dev` and visit `/stop/1180` (or a valid stop ID for your local data).
- Header shows stop name, walk chip (if location granted), and routes count.
- Arrivals list paints within ~200 ms — no spinner over numbers, only skeletons.
- Wait 15 s — clock advances, ETAs decrement.
- Stop the backend → after one polling cycle, stale banner appears, ETAs go grey.
- Restart backend → tap Retry → fresh data, banner clears.
- Tap a row → expands inline with mini-map and 3 following ETAs.
- Tap a different row → previous collapses smoothly.
- Tap "See full line ↗" → `/route/41` route loads (Phase-3 stub for now).

## Done when

- [ ] `GET /api/stops/{id}/arrivals` returns the spec shape and is unit/integration tested.
- [ ] `/stop/:id` renders header, arrivals list, freshness clock with no console errors.
- [ ] Live ETAs in brand red; stale ETAs in neutral; LiveDot reflects freshness.
- [ ] Only one row expanded at a time; tapping the same row collapses; mini-map renders the next vehicle.
- [ ] All states from `_states.md` (loading, empty, stale, error, terminus) are reachable and visually correct.
- [ ] All copy comes from `t()` — no Romanian/English string literals in `.tsx`.
- [ ] Polling pauses on tab hide; resumes immediately on tab show.
