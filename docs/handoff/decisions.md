# Decision log — Stop & Route detail

Every decision below was a real choice between viable options, made during the design phase. The file `reference/Stop decisions.html` shows the rejected variants visually.

**Rule for engineering:** if you're tempted to deviate from a decision below, talk to design first. These are not arbitrary aesthetic calls — each one was weighed and chosen.

---

## Q1 — Sort order for arrivals on a stop

**Decision: A — ETA order, flat list.**

Arrivals are sorted by minutes-to-arrival, ascending. No grouping by mode (tram/bus/metro), no grouping by line.

**Rejected:**
- *B — Group by mode.* Looks tidy but forces users to scan multiple sections to find the soonest vehicle. Wrong for the dominant "what's coming next" job.
- *C — Group by line.* Same problem amplified.

**Why it matters:** the user's question is almost always "what's the next vehicle that will get me where I'm going?" — that's an ETA question, not a taxonomy question.

---

## Q2 — Direction handling per row

**Decision: B — both directions on one row.**

Each route appears once per stop. The row shows both directions side-by-side with `←` and `→` markers, each with its own destination + ETA.

**Rejected:**
- *A — One direction per row, two rows per route.* Doubles list length. Forces user to mentally pair them.

**Why it matters:** a stop typically serves one route in *both* directions. Showing them on one row halves the list and makes the relationship obvious.

**Edge case:** at terminus stops, only one direction exists — render the row with one side and a `—` placeholder on the other.

---

## Q3 — Tap behavior on an arrival row

**Decision: B — inline expand.**

Tapping a row expands it in-place to show: a mini-map with the next vehicle's position, following departure times for that direction, and a "See full line ↗" button to navigate to Route detail.

**Rejected:**
- *A — Navigate immediately to Route detail.* Too aggressive; loses context of the stop.
- *C — Bottom sheet.* Adds modal chrome for what's essentially a row detail.

**Constraints:**
- Only one row expanded at a time. Tapping another collapses the previous.
- Expanded state should animate (height transition, ~200 ms, ease-out).
- The mini-map is decoration + reassurance; tapping it goes to Route detail (same as the explicit button).

---

## Q4 — Notification affordance

**Decision: skipped for v1.**

No "notify me when this is X minutes away" affordance.

**Rejected:**
- *A — Bell icon per row.* Clutters the list with a feature most users won't use.
- *B — Long-press menu.* Hidden affordance; discoverability is bad.

**Why it matters:** real-time data is good enough that users can just check the app. Notifications are a v1.5 feature and only for *service alerts on saved lines*, not per-arrival pings.

---

## Q5 — Walk time / distance to stop

**Decision: B — "2 min walk · 120 m" in the stop header.**

Both walk time and meters are shown. Walk time is the primary signal (humans think in minutes); distance is the secondary fallback (useful when GPS is fuzzy or for visitors).

**Rejected:**
- *A — Distance only.* Forces user to estimate walking pace.

**Format:**
- `<1 min walk · 50 m` for very close
- `2 min walk · 120 m` typical
- `12 min walk · 950 m` upper bound (anything more, hide entirely)

---

## Q6 — Direction switcher on Route detail

**Decision: B — compact "Reverse" pill in the section label row.**

A small pill labeled "Reverse" with a swap icon, inline with the "Stops · 3 vehicles en route" header. Tapping flips the schematic direction.

**Rejected:**
- *A — Full-width segmented control with both terminus names.* Visually heavy. Eats vertical space at the top of every visit.

**Behavior:** flipping reverses both stop order AND vehicle positions in the schematic. The header `→ Pipera` flips to `→ Drumul Taberei`.

---

## Q7 — Multi-vehicle display on Route detail

**Decision: B — show all vehicles inline on the schematic, each with an ETA label.**

Every active vehicle appears as a marker pinned next to its current stop. The marker carries an ETA label like `3m · next` for the soonest one and `8m`, `14m` for following vehicles.

**Rejected:**
- *A — Show only the next vehicle, with a counter "+ 2 more".* Loses spatial information; users can't see vehicle bunching.

**Why it matters:** transit users care about bunching. Three buses arriving back-to-back is a real pattern, and seeing it on the schematic helps users decide whether to wait or walk.

---

## Q8 — Schedule view (printed timetable)

**Decision: A — drop. Live arrivals only.**

No tabs for "Live / Schedule." No printed timetable view.

**Rejected:**
- *B — Live + Schedule tabs.* Schedule data from STB is fragile; planning ahead by minute-level departures is uncommon for the dominant audience.

**Caveat:** this is the most likely v1.5 reversal candidate. If user research shows commuters want week-ahead planning, add it then with a Tabs treatment.

---

## Q9 — Service alerts placement on Route detail

**Decision: A — top banner.**

Yellow alert bar pinned at the top of Route detail, above the schematic. Always visible until the alert clears.

**Rejected:**
- *B — Inline in schematic, callout between affected stops.* Spatially elegant but easy to miss; clutters when multiple alerts.
- *C — Badge on route number + bottom toast.* Two affordances for one alert; spatial information lost.

**Visual:** yellow background (`--tram-yellow-soft` light, semi-transparent dark), `!` icon, bold headline "Service alert", body line with cause + duration. See `components.md → AlertBanner`.

**Multi-alert behavior:** stack vertically. If more than 3, show first 2 + "+ N more" expander.

---

## Cross-cutting principles

These didn't get a Q number but came up repeatedly:

1. **Live data is the product.** Numbers must be tabular (`font-variant-numeric: tabular-nums`), large, and use brand red when fresh. Stale data must visibly degrade (greyed, with a "last seen" timestamp).
2. **No filler.** Don't add icons, stats, or pills unless they help the user decide.
3. **Bilingual from day one.** Every string from `copy.md`. Don't hardcode English.
4. **Tap targets ≥44 px.** Even on dense list rows.
