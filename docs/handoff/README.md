# My STB — Design Handoff Package

A bilingual (RO/EN) public-transit companion app for Bucharest. Real-time arrivals, line schematics, trip planning, and saved stops.

This package is the source of truth for engineers building the app. It contains:
- Tokens (colors, type, spacing) — `tokens.css` + `tokens.json`
- Component inventory — `components.md`
- Screen specs — `screens/*.md` (one per screen)
- Decision log — `decisions.md` (the *why* behind every Q1–Q9 choice)
- Navigation flows — `flows.md`
- Data shapes — `data.md`
- Copy + i18n rules — `copy.md`
- v1 scope vs later — `scope.md`
- Assets — `assets/` (logo, vehicle marks, map)
- Visual reference — `reference/` (static HTML screens)

## How to read this package

1. Start here.
2. Read `scope.md` to know what's in v1 and what's deferred.
3. Read `decisions.md` to understand *why* the screens look the way they do — these are not negotiable without a follow-up design pass.
4. Read `tokens.css` + `components.md` before writing any UI code.
5. For each screen you build, read its file in `screens/` end-to-end. Each spec lists components used, all states, copy, and edge cases.
6. `data.md` is your contract with the backend. Refresh cadence and what "live" means are defined there.

## Product summary

**Audience.** Locals (daily commuters, parents, students), occasional users (weekend trips), and visitors. Bilingual RO/EN; Romanian primary.

**Core jobs.**
1. *"When's my next bus/tram/metro?"* — see live arrivals at a stop in seconds.
2. *"Where's the vehicle now?"* — open a line and see all vehicles on it.
3. *"How do I get from A to B?"* — multi-modal trip plan.
4. *"My usual stops, fast"* — saved stops with personal nicknames.

**Tone.** Practical, calm, bilingual. Numbers and times are sacred — they're the product. Emoji rarely. No motivational copy. No exclamation marks.

**Brand DNA.** Bucharest tram-network red, cream paper background, deep tunnel ink. Bricolage Grotesque for display, Space Grotesk for text, JetBrains Mono for tabular numbers and codes (route numbers, stop IDs, ETAs).

## Tech assumptions (open for discussion)

- **Stack** — React Native or native iOS/Android. The web mockups in `reference/` are React-in-HTML for design speed; not the production architecture.
- **Data source** — STB live AVL feed (or compatible GTFS-RT). If unavailable at build time, mock against the shapes in `data.md`.
- **Languages** — RO (default), EN. Strings live in `copy.md` as a starting set.
- **Offline** — app should degrade gracefully when the feed is stale or absent (see `screens/_states.md`).

## Files in this package

```
handoff/
├── README.md            ← you are here
├── scope.md             ← v1 / v1.5 / later
├── decisions.md         ← Q1–Q9 design log
├── tokens.css           ← CSS variables (consume directly)
├── tokens.json          ← same tokens as JSON (for build pipelines)
├── components.md        ← reusable component inventory
├── flows.md             ← navigation map + back behavior
├── data.md              ← TypeScript-ish shapes for Stop, Arrival, Route…
├── copy.md              ← bilingual strings + tone rules
├── screens/
│   ├── home.md
│   ├── search.md
│   ├── stop-detail.md
│   ├── route-detail.md
│   ├── plan.md
│   ├── saved.md
│   └── _states.md       ← loading / empty / error / offline patterns
├── assets/              ← logo, vehicle marks, map
└── reference/           ← static HTML screens (visual targets)
```

## Out of scope for v1

Onboarding, settings, trip-in-progress, ticket purchase, lost-and-found, push notifications. See `scope.md` for the full list and rationale.

## Questions for engineering

These are the unresolved technical questions design needs answers on:

1. STB AVL feed — is there a stable public endpoint, or do we need a partnership? What's the refresh cadence?
2. Geocoding — which provider for "From / To" search in Plan? (Google? Mapbox? Nominatim?)
3. Map tiles — Mapbox, MapLibre, Apple Maps, Google? Affects design treatment.
4. Backend for saved stops — local-only, or sync across devices?
5. Crash + analytics tooling — Sentry? PostHog? Plausible?

Pin these before sprint 1.
