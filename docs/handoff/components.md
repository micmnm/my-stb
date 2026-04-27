# Component inventory

Every reusable piece of UI in My STB. Build these once, share across all screens.

Naming convention: PascalCase. All components support `dark` prop (boolean, defaults to system preference).

---

## Atoms

### `RouteBadge`
Pill showing a route number with a mode-tinted background.
- **Props:** `num` (string, e.g. `"41"`, `"M2"`, `"178"`), `mode` (`"tram" | "bus" | "trolley" | "m1" | "m2" | "m3" | "m4" | "m5"`), `size` (`"sm" | "md" | "lg"`), `dark`
- **Visual:** rounded rectangle, color from `--line-*` tokens. White or tunnel-ink text depending on contrast. Mono font.
- **Used in:** Stop detail rows, Route detail header, Saved list, Plan results legs
- **Heights:** sm 22 px, md 28 px, lg 36 px

### `LiveDot`
Pulsing dot indicating live data freshness.
- **Props:** `live` (boolean — green when true, neutral when stale)
- **Visual:** 8 px circle, subtle pulse animation (1.6 s loop). When stale, no pulse, neutral color.
- **Used in:** stop headers, route headers, anywhere ETA freshness matters

### `WalkChip`
Walk time + distance pill.
- **Props:** `minutes` (number), `meters` (number)
- **Format:** "2 min walk · 120 m" (RO: "2 min pe jos · 120 m")
- **Used in:** Stop detail header, Plan results

### `Chevron`, `IconArrow`, `IconBookmark`, `IconShare`, `IconWalk`, `IconSwap`, `IconLocationDot`
Icon set. 18–22 px stroke icons. Single color, inherits via `currentColor` or explicit `c` prop.

### `AlertBanner`
Yellow service-alert banner.
- **Props:** `title`, `body`, `severity` (`"info" | "warning" | "critical"`)
- **Visual:** translucent yellow background, `!` chip, bold title, body text. See decisions.md Q9.
- **Used in:** Route detail (top), Home (when alert affects saved line)

---

## Molecules

### `TwoWayArrivalRow`
The core row on Stop detail. One route, both directions, ETAs.
- **Props:** `route` (RouteBadge data), `directionA` ({ to, eta, live }), `directionB` (same), `expanded` (boolean), `onTap`
- **Layout:** [Badge] [← dest / ETA] [divider] [→ dest / ETA]
- **Tap:** triggers inline expand (see ExpandedArrivalCard)

### `ExpandedArrivalCard`
Inline expanded state of a TwoWayArrivalRow. See decisions.md Q3.
- Contains: row header (same as collapsed) + mini-map + following departures + "See full line ↗" button.
- Border: 2 px brand-red

### `StopRow`
Generic stop row used on Search results and the "Stops nearby" home section.
- **Props:** `stop` (Stop data), `walkChip` (boolean — show walk time), `lines` (RouteBadge array, max 5 visible + "+N")
- **Used in:** Home, Search, Saved

### `SchematicStop`
A single stop in the Route detail line schematic.
- **Props:** `name`, `sub` (e.g. "Terminus"), `you` (boolean, your stop), `eta`, `vehicle` ({ label, status }), `passed` (boolean, for "completed" stops in some treatments)
- **Visual:** dot on a vertical rail, name + sub-label right of dot, ETA right-aligned. Vehicle marker overlays when present.

### `SchematicRail`
The vertical rail that connects SchematicStops on Route detail.
- Renders all stops + vehicle markers. Handles direction reversal via Q6's reverse pill.

### `SearchInput`
The full-width search field with leading icon and optional voice/scan affordances.
- **Props:** `placeholder`, `value`, `onChange`, `leadingIcon`

### `BottomNav`
4-tab bar: Home, Search, Plan, Saved.
- **Props:** `active` (one of the four)
- **Heights:** 56 px content + safe-area inset

---

## Layouts

### `ScreenShell`
Outer wrapper for every screen. Provides:
- Safe-area top inset
- Cream background (light) / tunnel background (dark)
- BottomNav slot
- Scroll container for content

### `IOSFrame` / `AndroidFrame`
Device chrome for the design canvas only. **Do not ship.** Production app uses native shells.

---

## Patterns (composed of components)

### "Live arrivals list"
A vertical list of `TwoWayArrivalRow` ordered by ETA ascending (Q1). Header has a `LiveDot` + "Live · HH:MM" timestamp. Empty state: see `screens/_states.md`.

### "Line schematic"
Header (RouteBadge + name + bookmark) → AlertBanner (if any) → Reverse pill row → vertical SchematicRail of SchematicStops with vehicles inline.

### "Saved list"
Each item is a custom row with a user-given nickname (e.g. "Home", "School"), the stop name in smaller type, and a peek of next 1–2 arrivals.

---

## States — every component must handle

| State | When | Visual rule |
|---|---|---|
| Default | live data, fresh | Brand red for ETAs, full opacity |
| Stale | data > 60 s old | ETAs in neutral-500, "Last seen" timestamp surfaced |
| Loading | first paint | Skeleton bars; do NOT show spinners over numbers |
| Empty | no data for query | Use copy from `copy.md` empty-state strings |
| Error | feed unreachable | "Couldn't reach STB. Showing last known data." with retry |
| Offline | no network | Same as error; banner persists until network back |

See `screens/_states.md` for layouts.
