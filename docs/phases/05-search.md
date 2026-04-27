# Phase 5 — Search

**Goal:** Universal search across stops, routes, and addresses, with recents, debounce, and filter chips.

**Depends on:** Phase 1 (`SearchInput`, `StopRow`, `RouteBadge`), Phase 2 (`/stop/:id`), Phase 3 (`/route/:id`), and the existing geocoding (`NominatimProvider`) backend wiring.

**Test it:** open `/search` — input is autofocused, recents render. Type "Pia" — see stop matches and route matches debounced after 200 ms. Tap a stop → Stop detail. Tap a route → Route detail. Tap an address → `/plan?to={geocoded}` with the field pre-filled (Plan-page pre-fill plumbing arrives in Phase 7; for now, navigate to `/plan?toLat=&toLng=&toLabel=` and Phase 7 reads it).

**Handoff references:** [`screens/search.md`](../handoff/screens/search.md), [`copy.md`](../handoff/copy.md) `search.*`.

---

## Scope

- **Backend** — `/api/search?q=&types=stops,routes,addresses` returning a unified, ranked result list.
- **Frontend** — `<SearchPage/>` with input, optional filter chips, recents, results.
- **Frontend** — local "recents" store (`localStorage`), updated on tap.
- **Frontend** — `?intent=save` query param (when navigated from Home's empty-saved card or Saved tab's "+") changes the tap behavior: tapping a stop/route adds it to favourites instead of navigating, then bounces back to the prior tab.

## Out of scope

- Geocoding fallback / partial outages beyond a "geocoder down → hide Addresses with quiet note" inline banner.
- Voice search / scan affordances on `SearchInput` (handoff lists them as optional — skip for v1).

## Tasks

### 1. Backend — unified search

`GET /api/search?q={q}&types={csv}&limit=30`. Default `types=stops,routes,addresses`.

- **Stops:** prefix and substring match against the GTFS-loaded stop names. Boost: prefix match >> substring; if user passes `?lat=&lng=`, additionally boost by inverse distance (closer = higher).
- **Routes:** match `shortName` and `longName`. Prefix match on `shortName` ranks first.
- **Addresses:** delegate to `NominatimProvider.SearchAsync(q)` only when `types` includes `addresses`. Bias the request to a Bucharest viewbox in the existing provider config.
- **Min query length:** 1 char on stops/routes (the existing dataset is small enough); 3 chars on addresses to avoid hammering Nominatim.
- **Response shape:**

```jsonc
{
  "stops":     [{ "id", "name", "street?", "lat", "lng", "routes": ["41","M2"] }],
  "routes":    [{ "id", "shortName", "longName", "mode" }],
  "addresses": [{ "label", "lat", "lng", "type" }]
}
```

Add a unit test for ranking: query `"pia"` should rank `"Piața Romană"` ahead of `"Apărătorii Patriei"` (substring lower than prefix).

### 2. Frontend types + API client

Extend types and add `api.search(q, opts?)`.

### 3. `<SearchPage/>`

File: `frontend/src/pages/search/index.tsx`.

Layout:

```
[ScreenShell]
├─ SearchInput (autofocus)
├─ Filter chips: All | Stops | Lines | Addresses (default All)
├─ if !query: Recent section (last 8 tapped items, see Task 5)
├─ if query: Results, segmented by type (Stops, Lines, Addresses each with a SectionHeader)
└─ BottomNav
```

State:
- `query` (controlled).
- `filter: 'all' | 'stops' | 'routes' | 'addresses'` (default `'all'`).
- `intent: 'navigate' | 'save'` derived from `?intent=save`.

Behavior:
- Debounce `query` by 200 ms before firing `api.search`.
- Cancel in-flight requests via `AbortController` when query changes.
- On Stops segment, render `<StopRow/>` from Phase 1 with `walkChip` if user position known.
- On Routes segment, render a custom row: `<RouteBadge size="lg"/>` + "Tram 41" + `caption` line "Drumul Taberei – Pipera".
- On Addresses segment, render a `<button>` with `IconLocationDot` + label + neighborhood caption.

Tap behavior:
- `intent === 'navigate'` (default):
  - Stop → `/stop/:id`
  - Route → `/route/:id`
  - Address → `/plan?toLat=…&toLng=…&toLabel=…`
- `intent === 'save'`:
  - Stop or Route → call `useFavourites().add(...)` then `navigate(-1)` (return to Home or Saved).
  - Address → ignore (addresses aren't saveable).

### 4. Filter chips

Inline pill row of 4 chips. Active chip uses `--stb-red` background + white text; inactive uses `--bg-elev` + `--fg-1`. Tapping limits the visible segments to the chosen type but still calls the same backend endpoint (which already filters via `types`).

### 5. Recents store

`frontend/src/stores/recents.ts`:

```ts
type RecentKind = 'stop' | 'route' | 'address';
interface Recent { kind: RecentKind; refId: string; visitedAt: string; label: string; meta?: any; }
```

- Stored in `localStorage` under `mystb.recents`, capped at 20.
- Push on every tap from Search results.
- Expose `useRecents()` hook returning `{ recents, push, clear }`.

Render up to 8 most recent on the empty-input view, grouped by kind under a `t('search.recent')` header.

### 6. States

- **Empty (no input):** show recents if any; otherwise nothing (no nag).
- **Empty (input, no matches):** centered `t('search.no_results')` line + caption "Try a stop ID."
- **Loading:** small inline spinner inside `SearchInput` (right side). No skeleton — search results are too dynamic.
- **Geocoder error:** quiet inline note above the Addresses segment "Adresele nu sunt disponibile momentan" / "Addresses unavailable right now." — Stops/Lines still rendered. Add the keys to `copy.md` translations.

### 7. Verify

- `/search` opens with autofocus, recents (or empty) visible.
- Type "41" — Tram 41 appears in Lines section; nearby stops with route 41 appear in Stops; addresses don't trigger until 3+ chars.
- Type "magheru" — Address results appear (assuming Nominatim wired and online).
- Tap a stop → Stop detail; tap back → Search query and scroll preserved (per `flows.md` "search query + scroll position: preserved while session active" — handle via `useSearchParams` or state in a router-level provider).
- Visit `/search?intent=save` — tap a stop, navigate back to where you came from, verify the stop is now in favourites.
- Disconnect network → addresses show the quiet note; stops/routes still searchable (data is in backend memory).

## Done when

- [ ] `/api/search` returns ranked stops + routes + addresses, and prefix-vs-substring ranking is tested.
- [ ] `/search` debounces input by 200 ms and cancels stale requests.
- [ ] Filter chips correctly subset visible segments.
- [ ] Recents persist across reloads.
- [ ] `?intent=save` flow adds to favourites and returns the user to the previous tab.
- [ ] Geocoder failure degrades gracefully — Stops + Lines still work.
- [ ] All copy via `t()`.
