# Route detail

The line schematic. Shows every stop on a route plus all active vehicles' positions.

## Purpose

Answer two questions: "where's my vehicle right now?" and "what's the route from here?"

## Layout (top to bottom)

1. **Header** — back, RouteBadge (lg), "Tram 41" / "→ Pipera", bookmark
2. **AlertBanner** (Q9) — yellow; only if active alerts. Stack if multiple.
3. **Section label row** — "Stops · {n} vehicles en route" + Reverse pill (Q6)
4. **Schematic** — vertical rail with stops + inline vehicle markers (Q7)
5. **Bottom nav**

## Schematic anatomy

- Vertical 2 px rail down the left, stops as 14 px circles.
- "Your stop" rendered in brand red, with bold name and "Stația ta" label.
- Vehicles: 22 px red circle with tram glyph, attached to the stop they just left. ETA pill next to it ("3m · next", "8m", "14m").
- "Following" vehicles after the next one keep their own labels, no "next" suffix.
- Stop name + optional sub-label ("Terminus") + optional ETA on right (only for stops ahead of user).

## Reverse pill (Q6)

Compact `[swap-icon] Reverse` chip, inline in section label. Tap → reverse direction in place. Header text "→ Pipera" flips to "→ Drumul Taberei". Vehicles re-positioned along the reversed schematic.

## Multi-vehicle (Q7)

Render every active vehicle on the line in the chosen direction. Use the soonest-arrival vehicle's ETA as the "next" badge. Don't hide bunching.

## Service alerts (Q9)

Top banner pattern. Yellow background, `!` chip, bold title, body. Always above the schematic. If multiple, stack.

## Components used

`ScreenShell`, `AlertBanner`, `RouteBadge`, `SchematicRail`, `SchematicStop`, `BottomNav`.

## States

- **Loading:** header + skeleton rail with 8 placeholder stops.
- **No vehicles in service** (off-hours): schematic shown without vehicles, line in neutral, banner "Linia nu are vehicule active acum."
- **Stale:** vehicle markers fade, "Last update HH:MM" in section label.
- **Alert exists but no live data:** banner still shows (alerts are static-fetched); ETAs hidden.

## Decisions referenced

Q6 (reverse pill), Q7 (all vehicles inline), Q8 (no schedule tab), Q9 (top banner).
