# Navigation flows

## Tab structure

Bottom nav, 4 tabs:

1. **Home** (default) — saved stops on top, nearby stops below
2. **Search** — universal search (stops, routes, addresses)
3. **Plan** — From → To trip planning
4. **Saved** — saved stops + lines management with nicknames

Switching tabs preserves each tab's stack (iOS pattern).

---

## Stack flows

### Home
```
Home
 ├── tap saved stop          → Stop detail
 ├── tap nearby stop         → Stop detail
 ├── tap saved line          → Route detail
 └── tap service alert       → (in-place expand) → tap "Affected line" → Route detail
```

### Search
```
Search
 ├── tap stop result         → Stop detail
 ├── tap route result        → Route detail
 ├── tap address result      → Plan (pre-filled "To")
 └── tap recent              → same as above by type
```

### Stop detail
```
Stop detail
 ├── tap arrival row         → inline expand (Q3)
 │    └── tap "See full line ↗"  → Route detail
 │    └── tap mini-map           → Route detail
 ├── tap bookmark            → toggle saved
 └── tap share               → system share sheet (deep link to stop)
```

### Route detail
```
Route detail
 ├── tap reverse pill        → flip direction in place (no nav)
 ├── tap a stop in schematic → Stop detail (for that stop)
 ├── tap alert banner        → expand banner inline (no separate screen)
 └── tap bookmark            → toggle saved line
```

### Plan
```
Plan
 ├── enter From / To         → Plan results
 │    ├── tap a result       → Plan step-by-step
 │    └── back               → Plan results (preserved)
 └── tap recent trip         → Plan results directly
```

### Saved
```
Saved
 ├── tap stop with nickname     → Stop detail
 ├── tap "Edit" on a row        → Edit nickname inline
 ├── reorder (drag handle)      → persisted on release
 └── tap "Add" (+)              → Search (with intent=save)
```

---

## Back behavior

- **Bottom nav switch:** never adds to stack. Tapping the active tab again pops to root of that tab.
- **Push within a tab:** standard back.
- **Stop ↔ Route:** these can chain; back goes to the previous in the chain. (User taps stop → stop detail → "see full line" → route → tap a stop → stop detail. Back unwinds in reverse.)
- **Modal screens (none in v1):** if added later, dismissed by gesture or explicit close button.

---

## Deep links

Reserve these URL shapes for v1.5 sharing/widgets:

- `mystb://stop/{stopId}` → Stop detail
- `mystb://route/{routeId}?dir={a|b}` → Route detail
- `mystb://plan?from={...}&to={...}` → Plan results

Web shares should fall back to a public web page if the app isn't installed.

---

## State preserved across tabs

| State | Preserved? |
|---|---|
| Plan inputs (From / To, time mode) | Yes, until cleared by user |
| Last viewed stop / route | Yes — for "recents" |
| Search query + scroll position | Yes, while session active |
| Saved order | Yes, persisted to disk |
| Bookmark state | Yes, persisted to disk |
| Theme (auto / light / dark) | Yes (v1.5: settings) |
| Language (RO / EN) | Yes; system language by default |
