# Backlog — post-v1

Everything that survived the 9-phase v1 plan. Pulled from `handoff/scope.md` v1.5,
`handoff/decisions.md` parked items, `phases/08-polish.md` deferrals, and the open
engineering questions in each phase doc.

Each item lists: **why it's deferred**, **rough size**, **where it would land**.
T-shirt sizes assume a single experienced engineer.

---

## Tier 1 — most likely next pulls

These are the items whose absence is most visible to a user touching the app today.

### Multi-leg trip planning with transfers

- **Why deferred:** Phase 7 wraps `RouteCalculatorService.FindDirectRoutes` for v1 — one
  transit leg per trip, no transfers. The `Plan input` already says "Direct routes
  only · v1" so users see the limit.
- **Why pull next:** any cross-town trip in Bucharest needs a transfer (M2 → tram, bus
  → M3, etc.). Without it, Plan is honest but barely useful past close pairs.
- **Size:** L — needs a real planner. Two paths:
  1. **Wire OpenTripPlanner** as a sidecar service. Frontend stays the same; backend
     `PlanService` swaps to call OTP and project its `Itinerary` → `Trip`.
  2. **Hand-roll a 1-transfer version.** Compute direct routes for `from→X` and `X→to`
     intersected at any shared stop; pick the best pair. Cheaper but caps at 1 transfer.
- **Lands in:** `backend/src/MyStb.Api/Services/PlanService.cs`, optionally a new
  `OtpClient.cs`. Frontend untouched.

### Real STB service-alerts feed

- **Why deferred:** Phase 3 used a checked-in `Data/alerts.json` with a
  FileSystemWatcher hot-reload because STB has no public alerts feed.
- **Why pull next:** alerts are the most stale-prone part of the app — any
  meaningful incident response requires them to be live.
- **Size:** M — depends entirely on the source. Options:
  1. Scrape STB's alerts page (fragile; sub-hourly poll).
  2. Wire to whatever Bucharest's GTFS-RT trip-update or alerts feed exposes (if any).
  3. Crowdsource via a small admin form on a separate domain.
- **Lands in:** `backend/src/MyStb.Api/Services/IAlertsProvider.cs` already abstracts
  the source — add a new implementation alongside `FileAlertsProvider`.

### Onboarding flow

- **Why deferred:** v1 ships with a cold-start that relies on the dev toggles for
  language and theme. A first-launch user gets dropped at `/` with no greeting state
  beyond "Bună".
- **Why pull next:** location permission is the single biggest cliff — Home's Nearby
  section is empty until granted, and the prompt card replaces only that section.
  An onboarding screen would request location, pick language, and offer "set home stop".
- **Size:** M — one new route, three steps, persisted to `localStorage`.
- **Lands in:** `frontend/src/pages/onboarding/`, gated by a `mystb.onboarded` flag.

### Settings screen

- **Why deferred:** The dev-only toggles in `DevToggles.tsx` only show in dev builds.
  Production has no language switcher.
- **Why pull next:** users will want to override theme and language without rebuilding.
- **Size:** S/M — the underlying state (`useTheme`, `setLang`) already exists. This is
  mostly UI: language radio, theme radio, "About" footer, "Clear saved" button.
- **Lands in:** `frontend/src/pages/settings/`. Either a fifth tab or a header button
  on Home — I'd argue header button to keep the four-tab discipline.

---

## Tier 2 — polish + accessibility

Deferred from Phase 8 because they're tedious, not because they don't matter.

### Real PNG icons (192 / 512 / 180)

- **Why deferred:** Phase 8 reused `logo-mark.svg` for every icon slot. Most browsers
  handle SVG icons fine, but iOS home-screen install still wants a 180×180 PNG.
- **Size:** XS once you have a tool to rasterize SVG → PNG (Inkscape, sharp, or
  Figma export).
- **Lands in:** `frontend/public/pwa-192x192.png`, `pwa-512x512.png`,
  `apple-touch-icon.png`. Update `manifest.json` icons array.

### Install-prompt banner

- **Why deferred:** vite-plugin-pwa already registers the SW; what's missing is the
  in-app affordance that captures the `beforeinstallprompt` event and surfaces a
  dismissible banner once.
- **Size:** S — one component, one event listener, one localStorage flag.
- **Lands in:** new `components/molecules/InstallPrompt.tsx` mounted in `ScreenShell`.

### axe-core in dev

- **Why deferred:** Phase 8 didn't get to it. Without it, AA regressions slip in.
- **Size:** XS — install `@axe-core/react`, init in `main.tsx` behind
  `import.meta.env.DEV`.
- **Lands in:** `frontend/src/main.tsx`.

### Dark map tiles

- **Why deferred:** Phase 8 noted the OSM tiles look harsh on dark theme. Two paths:
  swap to CartoDB Voyager Dark (still free, no key), or apply a 60 % CSS darken
  filter on the map container in dark mode.
- **Size:** XS — one tile-URL switch keyed off `useTheme()`.
- **Lands in:** `frontend/src/components/molecules/MiniMap.tsx`,
  `frontend/src/components/Map.tsx` (legacy).

### Lighthouse audit + fixes

- **Why deferred:** Phase 8 set targets (≥90 PWA / A11y, ≥80 Perf) but didn't run a
  pass on the deployed app.
- **Size:** S/M depending on what it surfaces. Common fixes: image dimensions, ARIA
  warnings, render-blocking, compression.
- **Lands wherever it points.**

### prefers-reduced-motion full audit

- **Why deferred:** the global `tokens.css` rule disables animations, but specific
  components (LiveDot pulse, Toast slide-in, banner-in) all have their own keyframes.
- **Size:** XS — already mostly done; just verify each `.module.css` has a
  `@media (prefers-reduced-motion: reduce)` clause.

### Retire `/legacy`

- **Why kept:** Phase 0 preserved the legacy map UX as a fallback during the rebuild.
  Now that the new screens cover everything, `LegacyApp.tsx` and the components it
  imports (`Map.tsx`, `BottomSheet.tsx`, `FavouritesManager.tsx`, etc.) are dead
  weight — they ship in the bundle even though no production link points there.
- **Size:** XS — delete the route, the page, the seven components under
  `frontend/src/components/` that only `LegacyApp` imports, and the
  `frontend/src/hooks/useFavourites.ts` (Phase 6's migration is the last consumer).
- **Effect:** initial bundle shrinks; code search stops hitting two implementations
  of the same idea.

---

## Tier 3 — v1.5 from `scope.md`

These were called out in the original handoff scope as "first follow-up release".

### Trip-in-progress

- **Why deferred:** v1 ends at the Plan step-by-step screen. Once the user is on the
  vehicle, the app has nothing to say.
- **What to build:** "next stop" card that updates from the user's GPS against the
  route's stop sequence; alight reminder N stops out; total time-to-destination.
- **Size:** M — needs ongoing geolocation watching and a route-progress hook.
- **Lands in:** `frontend/src/pages/trip-in-progress/`, plus a `useTripProgress` hook.

### Push notifications for saved-line alerts

- **Why deferred:** scope.md says explicitly NOT for per-arrival alerts (Q4) — only
  for service alerts on saved lines.
- **Size:** L — needs a server-side push service (web-push or Firebase), VAPID keys,
  a per-user subscription store, and a worker that watches alerts.json/feed for
  new items intersecting saved-routes/stops.
- **Lands in:** new `backend/src/MyStb.Api/Services/PushService.cs` + the existing
  `IAlertsProvider`. Frontend gets a `Notification.requestPermission()` flow inside
  Settings.

### Live leg updates on Plan step-by-step

- **Why deferred:** Phase 7's recommendation was "live for the next leg, frozen for
  later legs"; the v1 implementation freezes everything at request time.
- **Size:** S — the next transit leg can re-fetch arrivals for its `fromStopId` on a
  30 s cadence and update `departsAt` only.
- **Lands in:** `frontend/src/pages/plan/index.tsx` `PlanStepByStep`.

### Cross-device sync for saved stops

- **Why deferred:** v1 store is local-only.
- **Size:** L — needs an account system. Either Supabase / Firebase / a tiny
  custom auth backend. Probably wait for a real demand signal before building.

### Widgets (home screen)

- **Why deferred:** great future feature; out of v1.
- **Size:** XL per platform. Native-only; the React PWA can't do this without going
  Capacitor / native-shell.

---

## Tier 4 — explicitly punted forever (from scope.md)

Listed for completeness; **don't build these** unless something in the world
changes.

- Schedule view (printed timetable) — Q8: live ETAs cover 95 % of need.
- Ticket / pass purchase — STB partnership question, not a design call.
- In-app problem report — webview link to STB's site is enough.
- Multi-modal beyond STB (taxi, scooter, bike) — brand: My STB is STB-first.
- Walking-only trip plans — users have Maps for that.

---

## Suggested pull order

If you ask me where to start, I'd go:

1. **Retire `/legacy`** (XS, removes confusion in the codebase).
2. **Settings screen** (S/M, unblocks every user who wants EN or dark override).
3. **Real STB alerts feed** (M, biggest correctness improvement).
4. **Multi-leg planner** (L, biggest feature gap).
5. **Onboarding** (M, smooths the first-launch cliff).

Everything else can wait for a real user signal.
