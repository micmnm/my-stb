# Phase 1 — Design system (atoms + molecules)

**Goal:** Build every reusable component listed in `handoff/components.md` once, with light + dark variants, and prove them on a `/dev/components` playground page.

**Depends on:** Phase 0 (tokens, router).

**Test it:** visit `/dev/components`, see every atom and molecule rendered in both themes, all states (default/stale/loading/empty/error). Resize the window — nothing breaks under 360 px.

**Handoff references:** [`components.md`](../handoff/components.md), [`tokens.css`](../handoff/tokens.css), [`screens/_states.md`](../handoff/screens/_states.md).

---

## Scope

Build these in this order (each depends on the prior):

**Atoms**
- `Icon` set: `IconArrow`, `IconBookmark`, `IconShare`, `IconWalk`, `IconSwap`, `IconLocationDot`, `Chevron`. Inline SVGs, `currentColor`, sizes 18 / 22.
- `RouteBadge` — pill, mode-tinted, sizes sm/md/lg.
- `LiveDot` — 8 px green pulsing dot; neutral when stale.
- `WalkChip` — "{n} min walk · {m} m" with i18n.
- `AlertBanner` — yellow/orange/red severities, optional `onDismiss`.

**Molecules**
- `SearchInput` — leading icon, placeholder, clear button.
- `StopRow` — generic stop list item with optional walk chip and lines preview.
- `TwoWayArrivalRow` (collapsed only — expanded card lives in Phase 2).
- `SchematicStop`, `SchematicRail` (basic versions — vehicle markers in Phase 3).
- `Skeleton` primitive (used by every loading state).
- `BottomNav` polish (replace placeholder icons from Phase 0 with the real `Icon` set).

**Patterns**
- `Section` (header label + LiveDot + timestamp pattern used on Stop/Route detail).

## Out of scope

- `ExpandedArrivalCard` (built with Stop detail in Phase 2 — needs the mini-map and following-departures wiring).
- Schematic vehicle markers and reverse pill (Phase 3).
- Hooking components into real data (every later phase).

## Tasks

### 1. Component file structure

```
frontend/src/components/
├── icons/
│   ├── index.ts        // re-exports
│   ├── IconArrow.tsx
│   ├── IconBookmark.tsx
│   ├── IconShare.tsx
│   ├── IconWalk.tsx
│   ├── IconSwap.tsx
│   ├── IconLocationDot.tsx
│   └── Chevron.tsx
├── atoms/
│   ├── RouteBadge.tsx
│   ├── LiveDot.tsx
│   ├── WalkChip.tsx
│   ├── AlertBanner.tsx
│   └── Skeleton.tsx
├── molecules/
│   ├── SearchInput.tsx
│   ├── StopRow.tsx
│   ├── TwoWayArrivalRow.tsx
│   ├── SchematicStop.tsx
│   └── SchematicRail.tsx
├── patterns/
│   └── SectionHeader.tsx
└── layout/
    ├── BottomNav.tsx          // existed from Phase 0, polish here
    └── ScreenShell.tsx        // existed from Phase 0
```

One component per file. Co-locate component-specific CSS modules (`RouteBadge.module.css`) — global classes only for typography that already lives in `tokens.css`.

### 2. Icons

Each icon is a 22-px viewBox SVG with a `c?: string` and `size?: number` prop, defaulting to `currentColor` and 22. Stroke icons use `stroke-width: 1.75`. Source the shapes from the handoff `assets/` if present (vehicle marks); otherwise hand-roll simple Material/Phosphor-style strokes.

### 3. RouteBadge

Props (matches `handoff/components.md`):

```ts
type Mode = 'tram' | 'bus' | 'trolley' | 'm1' | 'm2' | 'm3' | 'm4' | 'm5';
interface RouteBadgeProps {
  num: string;
  mode: Mode;
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;       // optional override; defaults to current theme
}
```

Visual:
- Background: `var(--line-{mode})` (mode `tram` → `--line-tram`; metro modes → `--line-metro-mN`).
- Foreground: white on red/blue/green/purple; `--tunnel` on yellow (`m1`).
- Use `class="route-tag"` from `tokens.css` for typography.
- Heights: sm 22, md 28, lg 36 px. Horizontal padding: 8 / 10 / 12 px. Border radius: `--r-sm` for sm/md, `--r-md` for lg.

### 4. LiveDot

Props: `live: boolean`. Render an 8 px circle: green (`--success`) when live, neutral (`--neutral-400`) when stale. CSS pulse animation, 1.6 s loop, `box-shadow` ripple. Skip animation when `live === false` or `prefers-reduced-motion`.

### 5. WalkChip

Props: `minutes: number; meters: number;`. Render the walk icon + i18n string `t('stop_detail.walk_chip', { m: minutes, d: meters })`. Use `class="caption"` for the text. Hide entirely when `minutes > 12` (per Q5).

### 6. AlertBanner

Props from `components.md`: `title`, `body`, `severity` ('info'|'warning'|'critical'), optional `onDismiss`, optional `actionHref` for "Affected line".

Visual:
- info: `--info-soft` bg, `--info` chip.
- warning (default for service alerts per Q9): `--tram-yellow-soft` bg, `--warning` chip.
- critical: `--danger-soft` bg, `--danger` chip.
- "!" chip on the left, bold title, body line below, optional chevron-right when `actionHref` set.
- `role="status"` for info/warning; `role="alert"` for critical.

### 7. Skeleton primitive

Props: `w?: string; h?: string; r?: string;`. Plain div with a shimmer keyframe (≤1.4 s loop). Skip animation under `prefers-reduced-motion`. Light: `--neutral-100` → `--neutral-50`. Dark: `--tunnel-2` → `--tunnel-3`. Used by every loading state — no spinners over numbers.

### 8. SearchInput

Props: `placeholder, value, onChange, leadingIcon?, autoFocus?, onClear?`. 44 px tall minimum, `--r-pill` rounded, `--bg-elev` background, `--border` stroke. Clear button (`×`) appears when `value !== ''`.

### 9. StopRow

Props per `components.md`:

```ts
interface StopRowProps {
  stop: { id: string; name: string; street?: string };
  walkChip?: { minutes: number; meters: number };
  lines: { num: string; mode: Mode }[];   // max 5 + "+N"
  onTap?: () => void;
}
```

Layout: pin icon (left) → name + street stack (flex-1) → row of up-to-5 RouteBadges + "+N" pill if more. Tap target ≥44 px.

### 10. TwoWayArrivalRow (collapsed)

Props:

```ts
interface TwoWayArrivalRowProps {
  route: { num: string; mode: Mode };
  directionA: { to: string; etaSeconds: number; isLive: boolean } | null;   // null = terminus side
  directionB: { to: string; etaSeconds: number; isLive: boolean } | null;
  onTap?: () => void;
  expanded?: boolean;
}
```

Layout: `[Badge] | ← {to} / {ETA}  | divider | →  {to} / {ETA}`.

ETA formatting (per `data.md`):
- `< 60 s` → `"<1 min"` / `t('stop_detail.now')` if `=== 0`
- `60 ≤ s < 3600` → `"{m} min"`
- `>= 3600` → `"HH:MM"` clock time

Live ETAs in `--stb-red` with `numeric-display` class. Non-live in `--fg-1`. Stale (driven by parent prop in Phase 2) in `--fg-3`. Terminus side: render `—`.

When `expanded: true`, render a 2 px `--stb-red` border and don't render the inline divider differently — the expanded card body is a Phase-2 sibling.

### 11. SchematicStop + SchematicRail (basic)

Skeleton for Phase 3. Build the rail (vertical 2 px line + 14 px stop dots) and a basic `SchematicStop` row (dot + name + sub-label + optional ETA). Vehicle markers and reverse direction handled in Phase 3 — leave a `vehicles?: VehicleMarker[]` prop placeholder but don't render them yet.

### 12. SectionHeader pattern

Props: `title: string; live?: boolean; serverTime?: string; rightSlot?: ReactNode`. Renders `<h4>` + optional `LiveDot` + `Live · HH:MM` caption + right-aligned slot (used for the Reverse pill in Phase 3, the Edit toggle in Saved).

### 13. /dev/components playground

Add a hidden route `/dev/components` that's only mounted when `import.meta.env.DEV`. Render every atom + molecule in light and dark side-by-side, plus their states (default / stale / loading / empty). This is your manual visual regression bench through Phase 8.

### 14. Replace BottomNav placeholder icons

Swap Phase 0's quick SVGs for the proper `Icon` set. Active tab: filled or `--stb-red`-tinted; inactive: outlined `--fg-2`.

### 15. Verify

- `/dev/components` renders without console errors in both themes.
- Every component handles `prefers-reduced-motion` (no animation).
- Tab through with the keyboard — focus rings visible, no skipped interactive elements.
- `npm run build` passes.

## Done when

- [ ] Every component in `handoff/components.md` (except `ExpandedArrivalCard` and full Schematic) exists with a real implementation.
- [ ] Each component reads colors only from `tokens.css` — no hex literals.
- [ ] Light + dark both look correct on `/dev/components`.
- [ ] All component text routes through `t()`.
- [ ] Every interactive component has ≥44 px hit target.
- [ ] BottomNav uses the real Icon set, not placeholder text/SVGs.
