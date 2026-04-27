# Search

Universal search across stops, routes, and addresses.

## Purpose

Get from "I don't have it saved" to a Stop or Route detail in 1–3 taps.

## Layout

1. **Search input** (autofocused on open) — `SearchInput` with placeholder from `copy.md`.
2. **Filter chips** (optional v1 nice-to-have): All / Stops / Lines / Addresses.
3. **Recent** section when input is empty.
4. **Results** when input has text — segmented by type if mixed.

## Result row types

| Kind | Visual | On tap |
|---|---|---|
| Stop | Pin icon + stop name + street + lines preview (max 4 RouteBadges) | Stop detail |
| Route | RouteBadge (lg) + "Tram 41" + "Drumul Taberei – Pipera" | Route detail |
| Address | Locate-dot icon + label + neighborhood | Plan (pre-fill "To") |

## Behavior

- **Debounce:** 200 ms after last keystroke.
- **Min query length:** 1 char (we have ~thousands of stops; first-letter filtering is fine).
- **Ranking:** prefix > substring; saved/recent items boost; physically closer stops boost.
- **Address geocoding:** see open question in `README.md`. v1 mock can use a static list of Bucharest landmarks.

## States

- Empty (no input): show Recent.
- Empty (input, no matches): "Niciun rezultat" + suggestion to try a stop ID.
- Loading: small spinner inline in input.
- Error (geocoder down): show Stops + Lines results; hide Addresses with quiet note.
