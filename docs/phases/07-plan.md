# Phase 7 — Plan a trip

**Goal:** From → To trip planner with input, results, and step-by-step legs. Reuses the existing `/api/routes` calculator as the v1 engine.

**Depends on:** Phases 0–5. Phase 6 nice-to-have (saved addresses are not in v1; saved stops can pre-populate From).

**Test it:** open `/plan` → input has From/To, swap icon, "Now / Leave at / Arrive by" chips, modes filter. Set From = current location, To = a saved stop. Tap "Find routes" → see ranked trip cards with departure/arrival, duration, leg strip. Tap a card → step-by-step timeline. Tap a transit leg → Route detail at the right segment.

**Handoff references:** [`screens/plan.md`](../handoff/screens/plan.md), [`data.md`](../handoff/data.md) `PlanRequest`/`Trip`/`Leg`.

---

## Decision: planning engine

Use the existing `RouteCalculatorService` (`/api/routes`) as the v1 engine. It already returns one transit option per direction with last-mile walk distance. For Plan v1 we wrap it into the `Trip[]` shape from `data.md` — one trip per `RouteOption`, with two `Leg`s (walk + transit) plus an optional final walk leg. Multi-leg with transfers is a v1.5 follow-up; surface it as such on the Plan input ("Direct routes only · v1").

If/when OpenTripPlanner is wired, swap the backend endpoint without changing the frontend page.

---

## Scope

- **Backend** — `/api/plan` accepting `PlanRequest` and returning `PlanResponse`. Internally calls `RouteCalculatorService` and shapes the result.
- **Frontend** — `<PlanPage/>` with three sub-views (Input, Results, Step-by-step) under one route, controlled by query params (`?step=input|results|trip&id=…`). Browser back works correctly across the three.
- **Frontend** — input pre-fill from `?fromLat=&fromLng=&fromLabel=` and `?toLat=&toLng=&toLabel=` so Search's address-tap (Phase 5) lands here pre-filled.
- **Frontend** — recents store extension: a `'trip'` recent kind capturing recent {from, to, when}.

## Out of scope

- Multi-leg transfer planning (v1.5).
- Walk-only trips (`scope.md` `Later`).
- Real-time leg updates after the request (recommendation captured in `screens/plan.md`: live for the next leg, frozen for later legs — leave a TODO and only refresh the *first* transit leg's `departsAt` on the Step-by-step view).

## Tasks

### 1. Backend — plan endpoint

`POST /api/plan` body:

```jsonc
{
  "from": { "kind": "stop"|"address", "stopId"?: "...", "lat"?: 0, "lng"?: 0, "label"?: "..." },
  "to":   { same },
  "when": { "type": "now"|"leaveAt"|"arriveBy", "time"?: "ISO" },
  "modes": ["tram","bus","trolley","metro"],
  "maxWalkMeters": 1000,
  "accessible": false
}
```

Response:

```jsonc
{
  "trips": [
    {
      "id": "...",
      "startsAt": "ISO",
      "endsAt": "ISO",
      "durationSeconds": 0,
      "walkSecondsTotal": 0,
      "legs": [
        { "kind": "walk",    "fromName": "...", "toName": "...", "durationSeconds": 0, "meters": 0 },
        { "kind": "transit", "routeId": "41", "mode": "tram",
          "fromStopId": "...", "fromStopName": "...",
          "toStopId":   "...", "toStopName":   "...",
          "headsign": "Pipera", "departsAt": "ISO", "arrivesAt": "ISO",
          "isLive": true, "stops": 7 }
      ]
    }
  ]
}
```

Implementation:
- Resolve `from` and `to` to lat/lng (stop lookup or pass-through).
- Call `RouteCalculatorService.SearchAsync(fromLat, fromLng, toLat, toLng, modes, maxWalkMeters)` (use the existing signature; extend if needed to accept modes filter).
- For each `RouteOption` returned, build a `Trip` with three legs: walk(from → originStop), transit(originStop → destStop), walk(destStop → to).
- `departsAt`: `now + originStopWalkSeconds` for `when.type === 'now'`. For `'leaveAt'`/`'arriveBy'` adjust accordingly.
- `arrivesAt`: `departsAt + estimatedMinutes*60`.
- `isLive: true` when the route has at least one live vehicle in the matching direction; else `false`.
- Sort: by `arrivesAt` ascending (default per `screens/plan.md`).

Add a unit test for trip-shape construction from a known `RouteOption`.

### 2. Frontend types

Add `PlanRequest`, `PlanResponse`, `Trip`, `Leg`, `PlanLocation` to `types/index.ts`.

### 3. `useTripPlan` hook

`frontend/src/hooks/useTripPlan.ts` — `(req: PlanRequest | null) => { data, isLoading, error, refetch }`. Doesn't auto-poll; `refetch` is exposed for the "Times updated" banner per `screens/plan.md`.

### 4. `<PlanPage/>` shell

File: `frontend/src/pages/plan/index.tsx`.

State derived from query params:
- `?step=input` (default) → render `<PlanInput/>`
- `?step=results` → render `<PlanResults/>`
- `?step=trip&id=<tripId>` → render `<PlanStepByStep/>`

Input persists across tabs via the recents store + last-used trip in `localStorage` (per `flows.md` "Plan inputs preserved").

### 5. `<PlanInput/>`

```
[Card]
├─ Stacked From / To rows (each tap → autocomplete picker)
│   └─ Reverse-swap icon between them (vertical center)
├─ When chips: Now | Leave at | Arrive by  (default Now)
│   └─ Time picker shown inline when not "Now"
├─ Modes filter (collapsible): tram / bus / trolley / metro toggles, default all
└─ CTA: "Find routes" — disabled until both From and To set
```

Autocomplete picker:
- Reuse the same `<SearchInput/>` + Search results layout from Phase 5.
- "Use my location" entry at the top of the From picker.
- Pick from saved stops first (collapsible section), then live results.

Read pre-fill from query params on mount.

### 6. `<PlanResults/>`

```
Header: From → To, time range (e.g. "18:42 → 19:08"), Edit button (back to Input)
Body: list of Trip cards
```

Trip card:
- Big mono "{HH:MM} → {HH:MM}" (numeric-display class).
- Caption: "{durationMin} min · {transitCount} {t('plan.changes', n)}".
- Leg strip: small horizontal bar segmented by leg — walk segments in `--neutral-300`, transit segments in `var(--line-{mode})`. Width proportional to leg duration.
- Walk total caption.
- Tap → `?step=trip&id={tripId}`.

Sort dropdown: `arrival` (default) | `duration`. No price.

States:
- **Loading:** 3 skeleton cards.
- **No routes:** centered `t('plan.no_routes')` + button "Try a different time" → bounces back to Input with the When chip pre-opened.
- **Stale (live ETAs changed):** small banner "Times updated" + auto-refreshed cards.
- **Geocoder error:** banner; let user pick stops manually.

### 7. `<PlanStepByStep/>`

Header: From → To, time, total duration.

Body: vertical timeline of legs:

- **Walk leg:** dotted vertical line on the left, `IconWalk` marker, "Walk to {toName}" + `{n} min · {m} m` caption.
- **Transit leg:** `RouteBadge` marker, "Take {route} to {toName}", "{HH:MM} → {HH:MM}", "{stops} stops" caption, `LiveDot` if `isLive`.
- Tap a transit leg → `/route/:routeId?dir={a|b}` (compute direction from `fromStopId` ordering on the route's stop list).

Tap "Edit" in header → back to Input.

### 8. Recents

When a `<PlanResults/>` view loads with non-empty trips, push a `'trip'` recent: `{ kind: 'trip', refId: encode({from,to,when}), visitedAt, label: '<from> → <to>' }`. On the Plan Input, render a "Recent trips" section above the modes filter when both From and To are empty.

Tap a recent trip → directly to `?step=results` with the same `from/to/when` (skip Input).

### 9. Verify

- `/plan` empty → input shows recents (or empty), CTA disabled until both fields set.
- Set From = "Use my location" → permission prompt → green dot indicator.
- Set To = a saved stop → CTA enabled.
- Tap Find routes → `?step=results` → 1+ trip cards with leg strips.
- Tap a card → `?step=trip&id=…` → step-by-step timeline.
- Tap a transit leg → Route detail at the matching direction.
- Browser back from step-by-step → results; back again → input.
- Visit `/plan?toLat=44.43&toLng=26.10&toLabel=Test` → input pre-fills To.
- Switch when chip to "Arrive by 09:00" → submit → results adjust accordingly.
- Disconnect backend → results show error banner with retry.

## Done when

- [ ] `POST /api/plan` returns `PlanResponse` for at least one canonical from/to pair, unit-tested.
- [ ] `/plan` supports the three sub-views via query params with correct browser back behavior.
- [ ] Pre-fill from query params works (Search → Plan flow).
- [ ] Modes filter narrows results.
- [ ] When chip switches between Now / Leave at / Arrive by produce different responses.
- [ ] Trip cards render with mono times, leg strip, walk total.
- [ ] Step-by-step renders dotted-line timeline with walk + transit markers.
- [ ] Recents stores trips and surfaces them on Input.
- [ ] All copy via `t()`.
