# Stop detail

The single most important screen in the app. Live arrivals at one stop.

## Purpose

Show the user every line that serves this stop, both directions, sorted by next arrival.

## Layout (top to bottom)

1. **Header** (compact, no map hero):
   - Back button, share, bookmark
   - Label "Stop · {id}" (mono)
   - Stop name (display, 30 px)
   - **WalkChip:** "2 min walk · 120 m · 5 lines" (Q5)
2. **Section label row:** "Arrivals · both directions" + LiveDot + "Live · HH:MM"
3. **Arrivals list** — `TwoWayArrivalRow`s sorted by ETA ascending (Q1, Q2)
4. **Bottom nav**

## TwoWayArrivalRow anatomy

```
[Badge]  ←  Drumul Taberei      |  →  Pipera
            3 min                    9 min
```

- One row per route. Both directions (Q2).
- Live ETAs in brand red; non-live in ink.
- Tap → expand inline (Q3).

## Expanded card

- Top: same row content, brand-red 2 px border.
- Mid: mini-map (120 px tall) showing the next vehicle's position.
- Following departures for this direction (next 3 ETAs).
- "See full line ↗" → Route detail.

Constraint: only one row expanded at a time. Tapping another collapses the previous.

## Components used

`ScreenShell`, `WalkChip`, `LiveDot`, `TwoWayArrivalRow`, `ExpandedArrivalCard`, `RouteBadge`, `BottomNav`.

## States

- **Loading:** 4 skeleton rows.
- **Empty:** "Nicio sosire în ora următoare."
- **Stale:** all ETAs in neutral-500, header LiveDot off, banner "Date vechi" with retry.
- **No live data, only schedule:** ETAs shown but in ink (not red), label "estimat" near them.

## Edge cases

- Terminus stop (only one direction): row renders with `—` on the missing side.
- Single-line stop: list is one row tall; vertically center it.
- Vehicle disappears between polls: smooth collapse, no jarring re-sort.

## Refresh

15 s polling while active. Pull-to-refresh available.

## Decisions referenced

Q1 (sort), Q2 (two-way), Q3 (tap), Q4 (no notify), Q5 (walk chip).
