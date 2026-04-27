# Phase 4 — Home

**Goal:** The default screen with greeting, optional service-alert banner, saved stops with peek arrivals, and nearby stops.

**Depends on:** Phase 1 (atoms/molecules), Phase 2 (`useStopArrivals` and the underlying arrivals endpoint), Phase 3 (`AlertBanner` already wired). The existing `useFavourites` and `useGeolocation` hooks stay.

**Test it:** open `/` — see "Bună / Hello" greeting, current time, your saved stops with their next 1–2 ETAs, and a list of stops nearby (when location is granted). Tap a saved stop → Stop detail. Deny location → see the "Turn on location" prompt card with no nag.

**Handoff references:** [`screens/home.md`](../handoff/screens/home.md), [`copy.md`](../handoff/copy.md) `home.*` keys.

---

## Scope

- **Backend** — `/api/stops/nearby?lat=&lng=&limit=5&maxMeters=2000` returning `StopRow`-friendly stops sorted by walking distance.
- **Frontend** — `<HomePage/>` consuming favourites + nearby + arrival peeks.
- **Frontend** — `useNearbyStops(lat, lng, opts)` hook.
- **Frontend** — `useStopArrivalPeek(stopIds[])` — a batched, lighter-weight version of `useStopArrivals` for showing 1–2 ETAs per saved stop on Home (30 s cadence, only the soonest A and B per route).
- **Frontend** — saved-stops empty card with `Adaugă` CTA → `/search?intent=save`.
- **Frontend** — location-denied prompt card replacing the Nearby section (no global nag).
- **Frontend** — top-of-Home `AlertBanner` only when alerts affect a saved line/stop.

## Out of scope

- Editing nicknames (Phase 6).
- Service-alert ingestion across multiple sources (Phase 8 if extended).

## Tasks

### 1. Backend — nearby stops endpoint

`GET /api/stops/nearby?lat={n}&lng={n}&limit=5&maxMeters=2000`. Use the existing GTFS stop list + `GeoUtils` haversine. Return:

```ts
[{ id, name, street?, lat, lng, distanceMeters, walkSeconds, routes: ['41', 'M2', ...] }]
```

`walkSeconds = Math.round(distanceMeters / 1.3)` (1.3 m/s average walk; matches Q5 minutes-not-distance framing). Sort ascending by `distanceMeters`. If `routes` would exceed 8 entries, cap and add a `truncated: true` flag.

### 2. Backend — peek arrivals endpoint

`POST /api/stops/arrivals/peek` body `{ stopIds: string[] }` — returns `Record<stopId, { soonest: Arrival[] }>` with at most 2 arrivals per stop (one per direction, soonest each). Cheaper than calling the full `/arrivals` once per saved stop.

### 3. Frontend hooks

- `frontend/src/hooks/useNearbyStops.ts` — wraps `api.getNearbyStops`. Re-fetches when `position` changes by >100 m. No polling.
- `frontend/src/hooks/useStopArrivalPeek.ts` — takes `stopIds: string[]`, polls `POST /api/stops/arrivals/peek` every 30 s while screen visible. Returns a `Map<stopId, Arrival[]>`.

### 4. `<HomePage/>` page

File: `frontend/src/pages/home/index.tsx`. Layout per `screens/home.md`:

```
[ScreenShell]
├─ Greeting row (32 px tall): "{t('home.greeting')}" + current HH:MM (mono)
├─ AlertBanner (only if alerts intersect saved lines/stops)
├─ SectionHeader "{t('home.saved_section')}"
│   └─ Saved-stops list (StopRow variant with peek arrivals OR empty card)
├─ SectionHeader "{t('home.nearby_section')}"
│   └─ Nearby stops (StopRow with WalkChip) OR location-denied card
└─ BottomNav
```

Saved-stops row variant:
- Nickname (display 17 px bold) + stop name (caption neutral) on the left.
- Right side: 2 most imminent peeks rendered as `RouteBadge` + ETA pairs. Use the same ETA formatting from Phase 2.
- Tap → `/stop/:id`.

Nearby row:
- Use the standard `StopRow` from Phase 1 with the `walkChip` filled in.

### 5. Empty + permission states

- **No saved stops yet:** card with `t('home.empty_saved')` + `<button>` `t('saved.add')` → `/search?intent=save`. Don't reserve space if there are saved stops.
- **No location permission:** replace the *entire* Nearby section with a single card: `t('permissions.location_denied')` + button to re-prompt the browser geolocation API. No banner above; no nag.
- **Loading:** skeleton bars (3 rows in each section), per `_states.md`.
- **Stale peek:** if a saved stop's peek arrivals are stale (>60 s), show its ETAs in `--fg-3`, no LiveDot pulse.

### 6. Service-alert intersection

For Home's top banner, check whether any active alert from `/api/alerts` (no `routeId` filter — fetch all) has at least one `affectedRouteIds` in the user's saved-routes set OR `affectedStopIds` in saved-stops set. If yes, show one `AlertBanner` with the highest-severity alert. Tap → expand banner inline (no separate screen). Show "Affected line" link → `/route/{id}` (per `flows.md`).

If no saved items intersect any alert, render nothing — don't reserve space.

### 7. Pull-to-refresh + auto refresh

- Auto-refresh every 30 s while visible (driven by the peek hook).
- Pull-to-refresh: simple touch gesture handler on the `<main>` scroll container that calls `refetch()` on both peek + nearby. Skip on desktop.

### 8. Migrate the existing favourites store

The current `useFavourites` stores `{ id, name, lat, lng }`. Phase 6 will extend it to `{ kind, id, nickname, order, addedAt }`. For Phase 4, just consume the existing shape — render `name` as the display label, no nickname yet. Phase 6 will replace this with proper `SavedItem` reading.

### 9. Verify

- Open `/` → greeting, current time updates each minute, saved (or empty card), nearby (or permission card), bottom nav highlights `Home`.
- Save a stop via the existing `/legacy` route → reload `/` → it appears with peek arrivals within ~30 s.
- Tap a saved stop → `/stop/:id`.
- Deny location in browser settings → Nearby section becomes the prompt card; no banner.
- Add an alert in `alerts.json` with `affectedRouteIds: ['<route-on-saved-stop>']` → top banner appears on Home.

## Done when

- [ ] `/api/stops/nearby` and `/api/stops/arrivals/peek` are implemented and tested.
- [ ] `/` renders greeting, optional alert banner, saved + nearby sections, bottom nav.
- [ ] Saved-stops list shows peek arrivals refreshing every 30 s.
- [ ] Nearby uses real walking distance/time per stop.
- [ ] Location-denied state replaces only the Nearby section, no global nag.
- [ ] Empty saved state shows the prompt card with a working `Adaugă` CTA.
- [ ] Top alert banner only appears when an alert intersects saved items.
- [ ] All copy via `t()`.
