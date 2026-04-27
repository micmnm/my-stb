# Phase 8 — Polish

**Goal:** Bring the app to ship-ready: full bilingual parity, AA accessibility, dark theme refinements, offline + service-worker behavior, motion + reduced-motion correctness, PWA assets, and a final cross-screen design QA pass.

**Depends on:** Phases 0–7 all functional.

**Test it:** every screen passes the checklist below — language switch flips every visible string with no leftover keys; dark mode is consistent everywhere; all interactive elements have ≥44 px hit targets and visible focus rings; running Lighthouse on the deployed PWA scores ≥90 on Accessibility and PWA categories; screen-reader (VoiceOver / TalkBack) can navigate every flow.

**Handoff references:** [`copy.md`](../handoff/copy.md), [`scope.md`](../handoff/scope.md) cross-cutting requirements, [`screens/_states.md`](../handoff/screens/_states.md), [`decisions.md`](../handoff/decisions.md) cross-cutting principles.

---

## Tasks

### 1. Bilingual completion

- Walk every page (`Home`, `Search`, `Plan`, `Saved`, `StopDetail`, `RouteDetail`) and grep for string literals (`/['"][A-Za-zĂÂÎȘȚăâîșț]/`) inside `.tsx` files. Move any survivor into `ro.json` + `en.json`.
- Add the missing keys flagged in earlier phases (`route_detail.no_active_vehicles`, `route_detail.next_eta`, `saved.remove_undo`, `saved.unavailable`, `search.geocoder_error`, `plan.changes`, plural variants, etc.).
- Replace the throwaway plural fallback from Phase 0 with a real ICU formatter — install `intl-messageformat` (small, tree-shakable) and route ICU keys through it. Verify Romanian's three-form plurals on `route_detail.vehicles_count` (1 vehicul, 2 vehicule, 21 de vehicule).
- Verify long-Romanian wrapping on every screen — Romanian sentences are ~10–15 % longer than English (per `copy.md`). Watch buttons, chips, and the BottomNav labels especially.

### 2. Accessibility — AA

- Run axe-core (via `@axe-core/react` in dev) and fix every violation.
- Color contrast: verify all token combinations actually pairs to AA — rerun on dark theme too. Most likely problem area: `--fg-3` on `--bg-elev`.
- Hit targets: audit every interactive element to ≥44 px. The TwoWayArrivalRow's expand-tap area in particular; the BottomNav tabs; the Saved drag handles.
- Focus rings: add a global `:focus-visible` style using `outline: 2px solid var(--stb-red); outline-offset: 2px;` on all interactive elements. Verify keyboard tab through every screen.
- Screen reader labels: every icon-only button has `aria-label` driven by `t()`. The `LiveDot` has `aria-hidden="true"` (it's decorative — the freshness is also stated in the `Live · HH:MM` caption).
- Banners: `role="status"` for info/warning, `role="alert"` for critical (already specified in Phase 1 — verify here).
- Skeletons: `aria-busy="true"` on their container.
- Empty-state CTAs: real `<button>`/`<a>`, never `<div onClick>`.
- Form fields (Search, Plan input, nickname rename): visible label or `aria-label`, error states announced.

### 3. Dark theme pass

- Walk `/dev/components` in dark mode — fix any contrast or border issues.
- Verify the `AlertBanner` warning/critical variants — yellow on tunnel can look muddy. Use `--tram-yellow-soft` at lower opacity per `decisions.md` Q9.
- Verify map tiles: Leaflet OSM tiles look harsh on dark. Either swap to a dark tile provider (still free — e.g., CartoDB Voyager Dark) or apply a 60 % darken filter via CSS on the map container in dark mode.
- Verify schematic rail contrast — the 2 px rail and 14 px stop dots must remain visible against `--bg-dark`.

### 4. Motion + reduced-motion

- Audit all animations to use `var(--ease-*)` and `var(--dur-*)` tokens.
- The `prefers-reduced-motion` media query already disables animations globally via `tokens.css`. Verify by simulating in browser devtools.
- Specific motion to validate: `LiveDot` pulse, expand/collapse on `TwoWayArrivalRow`, schematic direction-flip cross-fade, Saved row reorder, Toast slide-in, page transitions (none expected — keep it that way).

### 5. Offline + cache

- Service worker via `vite-plugin-pwa` is already in the deps. Configure it (`vite.config.ts`) to:
  - Pre-cache the app shell.
  - Stale-while-revalidate for `/api/stops/*` and `/api/routes/*` static endpoints.
  - Network-first with 3 s timeout on `/api/stops/{id}/arrivals`, `/api/routes/{id}/detail`, `/api/alerts` — fall back to last cached body if the network is down.
- Surface a persistent offline banner per `_states.md` once `navigator.onLine` flips false.
- Last-known data cached for 5 minutes after going offline; render empty + "Offline" banner past that window.
- Saved stops always render even offline (read from `localStorage` — already true via `useSaved`).
- Route schematics render their static structure offline; vehicles hidden — verify in `<RouteDetailPage/>`'s render branch when `error && hasCachedRoute`.

### 6. Deep links + share

- Implement the URL shapes from `flows.md`:
  - `mystb://stop/{stopId}` → `/stop/:id`
  - `mystb://route/{routeId}?dir=a|b` → `/route/:id?dir=…`
  - `mystb://plan?from=…&to=…` → `/plan?step=results&…`
- For web, the same routes already work as `https://<host>/stop/:id`, etc.
- The Stop detail share button (Phase 2 stub) opens `navigator.share` with `{ title: stop.name, url: window.location.href }`. Fallback for browsers without Web Share API: copy URL to clipboard + toast.

### 7. PWA assets

- Update `frontend/public/` icons to the brand:
  - `logo-mark.svg` → `pwa-192x192.png` and `pwa-512x512.png` (rasterized via your tool of choice).
  - `apple-touch-icon.png` (180×180).
  - `favicon.ico` from `logo-mark.svg`.
- Update `manifest` block in `vite.config.ts` (or the PWA plugin config):
  - `name`: "My STB"
  - `short_name`: "STB"
  - `theme_color`: "#E63027" (`--stb-red`)
  - `background_color`: "#F4ECE0" (`--cream`)
  - `display`: "standalone"
  - `start_url`: "/"
  - `lang`: "ro"
- Add the install-prompt UI as an unobtrusive banner that appears once after first session, dismissible.

### 8. Performance

- `npm run build` and inspect bundle sizes. Anything pulling in unexpected dependencies?
- Lazy-load route components: each `pages/*/index.tsx` exported as a `React.lazy` import wrapped in `<Suspense fallback={<ScreenShellSkeleton/>}/>`. The route shell (BottomNav + tokens) loads eagerly.
- Lazy-load Leaflet only on screens that need a map (Stop detail expanded card, optionally the legacy view). Wrap the map import in `React.lazy(() => import('react-leaflet'))`.
- Verify Lighthouse Performance score ≥80 on the home page on a throttled mobile profile.

### 9. Cross-screen design QA

Walk every screen against its handoff spec one more time:

- [ ] Home — `screens/home.md`
- [ ] Search — `screens/search.md`
- [ ] Stop detail — `screens/stop-detail.md`
- [ ] Route detail — `screens/route-detail.md`
- [ ] Plan input / results / step-by-step — `screens/plan.md`
- [ ] Saved — `screens/saved.md`
- [ ] All states from `screens/_states.md` reachable on each.

If a deviation is found, either fix it or open a follow-up note in the relevant phase doc with the design call.

### 10. Verify

- Lighthouse ≥90 PWA, ≥90 Accessibility, ≥80 Performance on home in mobile profile.
- VoiceOver (Mac/iOS) or TalkBack (Android) can complete: open Home → tap saved stop → expand a row → navigate to Route detail → reverse direction → back to Home. No silent regions, no untitled buttons.
- Disable network in DevTools → all screens render last-known data with a persistent offline banner; saved stops still load instantly.
- Simulate `prefers-reduced-motion` → no animations anywhere (LiveDot static, expand cards snap, no shimmers).
- `npm run build` produces a versioned service worker; visiting after a deploy shows an "Update available" prompt (vite-plugin-pwa default UX).

## Done when

- [ ] No string literals visible to the user are missing from `ro.json`/`en.json`.
- [ ] axe-core reports 0 violations across all routes in dev.
- [ ] All interactive elements ≥44 px and have visible focus rings.
- [ ] Dark theme is consistent on every screen and on the map.
- [ ] PWA installable from a desktop and mobile browser; offline experience matches `_states.md`.
- [ ] Lighthouse PWA + Accessibility ≥90; Performance ≥80.
- [ ] Every screen reviewed against its handoff spec; deviations either fixed or filed.
- [ ] `npm run build` clean; no TypeScript errors.
