# Plan a trip

From → To multi-modal trip planner.

## Three sub-screens

1. **Plan input** — From/To, when chips, Search button
2. **Plan results** — list of trip options
3. **Plan step-by-step** — single trip, leg-by-leg detail

## Plan input

Layout:
1. Stacked **From / To** card with reverse-swap icon
2. **When chips:** "Now" / "Leave at" / "Arrive by" (default: Now)
3. **Modes filter** (collapsible): Tram / Bus / Trolley / Metro toggles. Default: all on.
4. CTA button "Find routes" appears once both From and To are set.

Behavior:
- Tap From or To → autocomplete picker (uses Search results).
- "Use my location" suggestion in From picker.
- Recent trips shown when both fields are empty.

## Plan results

Header: From → To, time range, edit button.

Body: list of trips. Each card shows:
- **Departure / arrival times** big, mono ("18:42 → 19:08")
- **Duration** + "{n} change(s)"
- **Leg strip:** mini bar with mode-colored segments + walk segments
- **Walk total** (small)

Sort: by arrival time ascending (default), or duration. No price; transit fare shown only if differs (zone change).

Tap a card → step-by-step.

## Plan step-by-step

Header: From → To, time, total duration.

Body: vertical timeline of legs:
- **Walk leg:** dotted line, walking-figure icon, "Walk to {stop}" + duration + meters
- **Transit leg:** RouteBadge, "Take {route} to {stop}", departs/arrives times, intermediate stops count, live indicator if vehicle is tracked

Tap a transit leg → Route detail (pre-positioned to the user's segment).

## States

- **Loading:** skeleton 3 result cards.
- **No routes:** "Nu am găsit rute. Încearcă o oră diferită." + button to switch time mode.
- **Plan stale (live ETAs changed):** banner "Times updated" + auto-refreshed cards.
- **Geocoder error:** banner; let user pick stops manually.

## Open questions for engineering

- Trip planning engine: STB-provided? OpenTripPlanner? Custom?
- Real-time leg updates: do we update times live, or freeze at request time? (Recommendation: live for the next leg, frozen for later legs.)
