# Phase 0 — Foundation

**Goal:** Wire up design tokens, theme, routing, i18n, and an empty 4-tab bottom-nav shell so every later phase has a home to land in.

**Depends on:** nothing.

**Test it:** in a browser, you can switch between four (mostly empty) tabs, the theme follows the OS light/dark setting, and a language toggle (or `?lang=en` query) flips visible labels between RO and EN.

**Handoff references:** [`tokens.css`](../handoff/tokens.css), [`flows.md`](../handoff/flows.md), [`copy.md`](../handoff/copy.md), [`README.md`](../handoff/README.md).

---

## Scope

- Import the handoff tokens as the single CSS variable source.
- Add light + dark via `prefers-color-scheme`, with manual override stored in `localStorage`.
- Add `react-router-dom` with four routes: `/`, `/search`, `/plan`, `/saved` (plus `/stop/:id`, `/route/:id` for later phases).
- Add a tiny i18n module (no library needed — see Task 5) that loads strings from `copy.md` and exposes `t(key, vars?)` plus a `<Lang>` switcher.
- Replace the current `App.tsx` map-first layout with a `ScreenShell` + `BottomNav` shell. Each tab renders a placeholder.
- **Preserve** the existing `Map`, `BottomSheet`, `SearchBar`, `FavouriteChips`, `FavouritesManager`, `RouteResults` work behind a `/legacy` route so we can still demo arrivals while the new screens are being built.

## Out of scope (later phases)

- Real screen content for any tab (Phases 2–7).
- Atom/molecule components beyond `BottomNav` and `ScreenShell` (Phase 1).
- Service alerts, polling, accessibility audit (Phases 4 / 8).

## Tasks

### 1. Install dependencies

```bash
cd frontend
npm install react-router-dom
```

No i18n library — we'll write a 30-line `t()` helper.

### 2. Wire tokens.css into the app

- Copy `docs/handoff/tokens.css` to `frontend/src/styles/tokens.css`.
- Copy the `assets/` folder fonts (if any) to `frontend/public/fonts/` so the `BricolageGrotesque` `@font-face` URL resolves. If no font files exist in handoff, drop the `@font-face` block and rely on Google Fonts only.
- In `frontend/src/main.tsx`, import `./styles/tokens.css` **before** `./index.css`.
- In `frontend/src/index.css`, replace any hardcoded colors with `var(--…)` tokens. Set `body { background: var(--bg); color: var(--fg); font-family: var(--font-sans); }`.

### 3. Dark theme

- In `frontend/src/styles/tokens.css`, add a `:root[data-theme="dark"]` block that re-maps `--bg`, `--bg-elev`, `--fg`, `--fg-1`, `--fg-2`, `--border` to the tunnel/cream-on-dark equivalents already in the file.
- Also support `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }` so OS-driven dark works without an explicit override.
- Create `frontend/src/hooks/useTheme.ts` exporting `{ theme, setTheme }` where `theme: "auto" | "light" | "dark"` is persisted to `localStorage` under key `mystb.theme`. On mount, set `document.documentElement.dataset.theme` accordingly (or remove it for `auto`).

### 4. Router scaffolding

- Create `frontend/src/routes/index.tsx` with a `BrowserRouter` and the routes:
  - `/` → `<HomePage/>`
  - `/search` → `<SearchPage/>`
  - `/plan` → `<PlanPage/>`
  - `/saved` → `<SavedPage/>`
  - `/stop/:id` → `<StopDetailPage/>`
  - `/route/:id` → `<RouteDetailPage/>`
  - `/legacy` → the current `App.tsx` content (renamed to `<LegacyApp/>`).
  - `*` → redirect to `/`.
- Each new page is a one-line stub: `export default function HomePage() { return <h1>Home</h1>; }`. Files live in `frontend/src/pages/<name>/index.tsx`.
- Update `frontend/src/main.tsx` to render `<Routes/>` instead of `<App/>`.

### 5. Tiny i18n module

Create `frontend/src/i18n/index.ts`:

```ts
import ro from './ro.json';
import en from './en.json';

type Lang = 'ro' | 'en';
const dict: Record<Lang, Record<string, string>> = { ro, en };

let current: Lang = (localStorage.getItem('mystb.lang') as Lang)
  ?? (navigator.language.startsWith('ro') ? 'ro' : 'en');

const listeners = new Set<() => void>();

export function getLang(): Lang { return current; }
export function setLang(l: Lang) {
  current = l;
  localStorage.setItem('mystb.lang', l);
  document.documentElement.lang = l;
  listeners.forEach(fn => fn());
}
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dict[current][key] ?? dict.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
export function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
```

Add `frontend/src/i18n/useT.ts`:

```ts
import { useSyncExternalStore } from 'react';
import { subscribe, getLang, t } from './index';
export function useT() {
  useSyncExternalStore(subscribe, getLang, getLang);
  return t;
}
```

Seed `ro.json` and `en.json` from the YAML in `docs/handoff/copy.md` — flatten keys with dots (`nav.home`, `home.greeting`, etc.). Initial coverage: `nav.*`, `home.greeting`, plus enough strings for the placeholder tabs. Phases 2–7 will add more keys as they go.

ICU plural keys (`{n,plural,…}`) can be left as-is for now — only `route_detail.vehicles_count` and `alert.more` use them, and they're not rendered until Phases 3/4. Phase 8 (polish) adds a real ICU formatter.

### 6. BottomNav + ScreenShell

Create `frontend/src/components/layout/BottomNav.tsx`:

- Fixed bottom, 56 px + safe-area inset.
- Four tabs as `<NavLink>` with `to="/"`, `/search`, `/plan`, `/saved`.
- Icons: simple inline SVGs (replace in Phase 1). Active tab uses `--stb-red`; inactive uses `--fg-2`.
- Labels via `t('nav.home')`, etc. Tap target ≥44 px.

Create `frontend/src/components/layout/ScreenShell.tsx`:

- Top safe-area inset.
- `--bg` background.
- `<main>` scroll container.
- Renders `<BottomNav active={…}/>` at the bottom; pass active via context or via `<Outlet/>`'s route match.

Use `ScreenShell` in each page stub.

### 7. Header language + theme toggles (dev affordance)

For developer testing only (not in handoff scope yet — Phase 8 surfaces them properly in Settings, which is v1.5):

- Add a tiny floating button group in `ScreenShell` (top-right, only when `import.meta.env.DEV`) with `RO/EN` and `Auto/Light/Dark` toggles wired to `setLang` and `setTheme`.

### 8. Verify

- `npm run dev` and visit `http://localhost:5173`.
- Tap each of the four bottom-nav tabs — URL changes, label highlights, no console errors.
- Toggle the dev language switcher — `Acasă/Caută/Plan/Salvate` ↔ `Home/Search/Plan/Saved`.
- Toggle the dev theme switcher — background flips between cream and tunnel ink.
- Visit `/legacy` — the old map-with-favourites still works.
- Run `npm run build` — no type errors.

## Done when

- [ ] `tokens.css` is the only color/spacing source; no hex literals in `*.css` outside it.
- [ ] OS dark mode flips the app without code changes.
- [ ] Manual theme override in `localStorage` survives reloads.
- [ ] All four bottom-nav tabs are reachable and stack independently.
- [ ] `t('nav.home')` returns "Acasă" or "Home" depending on current lang.
- [ ] `/legacy` still renders the old map UX.
- [ ] `npm run build` passes.
