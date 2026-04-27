# My STB — Phased Implementation Plan

Source of truth for the redesign: [`docs/handoff/`](../handoff/README.md).

This plan transforms the current single-screen map app into the 4-tab, bilingual, design-token-driven experience described in the handoff. Each phase is **independently testable in a browser** before moving on. Stop after any phase, ship it, and the app should still be coherent.

## Constraints respected

- **No new heavyweight dependencies.** React Router and a small i18n lib are the only frontend additions. Reuse existing `useGeolocation`, `useFavourites`, `useVehicles`, `useRoutes`, and the .NET endpoints where possible.
- **Frontend is web (PWA), not React Native.** Handoff says "React Native or native" but the current repo is a Vite/React PWA — we stay there. The handoff's component contracts and tokens still apply.
- **Bilingual from day one.** No hardcoded Romanian/English strings. All copy goes through the i18n layer added in Phase 0.
- **Live data + stale/offline degradation** is baked into the data hooks, not bolted on at the end.

## Phase order and rationale

| # | Phase | Why this slot |
|---|---|---|
| 0 | [Foundation](00-foundation.md) | Tokens, router, i18n, theme, bottom-nav shell. Nothing else can land cleanly without these. |
| 1 | [Design system](01-design-system.md) | Build the atoms/molecules from `components.md` once. Every later screen consumes them. |
| 2 | [Stop detail](02-stop-detail.md) | Per `decisions.md`, this is the most important screen. Build it first; everything else navigates to it. |
| 3 | [Route detail](03-route-detail.md) | Schematic + vehicles. Stop-detail's "See full line ↗" needs it. |
| 4 | [Home](04-home.md) | Saved peek + nearby. Needs stop-arrivals data from Phase 2. |
| 5 | [Search](05-search.md) | Universal search wiring tabs together. |
| 6 | [Saved](06-saved.md) | Nicknames, reorder, edit. Migrates the existing favourites store. |
| 7 | [Plan a trip](07-plan.md) | From/To planner. Reuses the existing `/api/routes` engine for v1. |
| 8 | [Polish](08-polish.md) | EN parity, accessibility AA, dark refinements, offline, PWA, motion. |

## How to use this plan

1. Read the phase file end-to-end before starting.
2. Skim the linked handoff sections — they're the spec; these files are just the build order.
3. Each phase ends with a **Done when** checklist — verify all items in a real browser before moving on.
4. Commit per task, not per phase. Small commits make it easier to bisect later.
5. If a task description conflicts with `docs/handoff/`, the handoff wins. Update the phase file and continue.

## Open questions parked from `handoff/README.md`

These do not block phases 0–6. Decide before Phase 7:

- Trip-planning engine: keep using the existing `/api/routes` calculator, or swap to OpenTripPlanner? Phase 7 assumes the former.
- Geocoding: Nominatim is already wired. Keep unless rate limits bite.
- Map tiles: Leaflet + OSM today. No change planned in this plan.
- Saved-stops sync across devices: out of scope; local storage only (matches handoff `Later` table).
- Crash/analytics: park until after Phase 8.
