# Scope

What's in v1, v1.5, and later.

## v1 — must ship

These are the screens designed in `screens/` and shown in `reference/App screens.html`. Everything below has a spec.

| Screen | Status |
|---|---|
| Home (saved stops + nearby) | ✅ designed |
| Search (stops, routes, addresses) | ✅ designed |
| Stop detail (live arrivals, both directions) | ✅ designed |
| Route detail (line schematic + vehicles) | ✅ designed |
| Plan a trip (From → To, results, step-by-step) | ✅ designed |
| Saved (with personal nicknames) | ✅ designed |

**Cross-cutting v1 requirements:**
- Bilingual RO/EN (RO default), with copy from `copy.md`
- Light + dark theme (designed for both)
- Live data with stale/offline degradation (see `screens/_states.md`)
- Service alerts surfaced on Route detail (top banner)
- Accessibility: AA contrast, ≥44 px hit targets, screen-reader labels for all icons

## v1.5 — first follow-up release

Designed only as bullet points, not screens. Build v1, ship, learn, then design these.

- **Onboarding** — first launch: location permission, language pick, optional "set home stop"
- **Settings** — language, theme override, units, accessibility prefs, data refresh interval, about
- **Trip-in-progress** — what you see while riding (next stop, alight reminder, time-to-destination)
- **Empty/loading/error states for every screen** — first pass exists in `_states.md`; needs full coverage
- **Push notifications** for service alerts on saved lines (note: explicitly *not* for arrival alerts — see decisions.md Q4)

## Later — explicitly deferred

| Item | Why deferred |
|---|---|
| Schedule view (printed timetable) | Q8 decision: live ETAs cover 95% of need; schedule data is fragile |
| Ticket / pass purchase | Out of design scope for this phase; partnership question for STB |
| In-app reporting (lost & found, problem report) | Utility, not core; can be a webview link to STB site initially |
| Multi-modal trips beyond STB (taxi, scooter, bike) | Brand decision: My STB is a STB-first app |
| Walking-only trip plans | Edge case; users have Maps for that |
| Account / cross-device sync | Saved stops can live in local storage for v1 |
| Widgets (iOS/Android home screen) | Great future feature; needs separate design pass |

## Anti-goals

Things we deliberately won't add, even if asked:

- **Promotional content / marketing banners** — the app is a utility, not a billboard
- **Gamification (streaks, badges)** — wrong tone for a transit app
- **Aggressive notifications** — opt-in only, sparingly
- **Filler stats / data slop** — we don't show numbers unless they help the user decide
