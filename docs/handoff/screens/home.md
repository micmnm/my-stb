# Home

The default screen. Anchors the user with their saved stops on top, nearby stops below.

## Purpose

Answer the dominant question — *"when's my next bus / tram?"* — in **under 2 seconds** for a recurring user. Every layout decision serves that.

## Layout (top to bottom)

1. **Greeting + status** — "Bună" / "Hello" + current time. Compact (32 px tall).
2. **Service alert banner** — only if any alert affects a saved line/stop. Else nothing (don't reserve space).
3. **Your stops** section — saved stops with peek of next 1–2 arrivals.
4. **Nearby** section — closest stops by walking distance.
5. **Bottom nav** (`Home` active).

## Components used

`ScreenShell`, `AlertBanner`, `StopRow` (with peek arrivals variant), `RouteBadge`, `LiveDot`, `WalkChip`, `BottomNav`.

## Saved-stops row

- **Nickname** (e.g. "Acasă" / "School") — display font, 17 px, bold, ink color.
- **Stop name** below in 13 px neutral.
- **Peek arrivals** on the right: 2 most imminent, each = `RouteBadge` + ETA.

If no saved stops: empty card "Salvează stațiile pe care le folosești des." with an "Adaugă" button → Search (intent=save).

## Nearby section

- Title "În apropiere / Nearby" with WalkChip on each row showing min + meters.
- Limit to 5; tap "More" → Search.
- If location permission denied: replace section with a single card "Activează locația pentru a vedea stațiile din apropiere" + button. No nag.

## States

- **Loading:** skeleton bars for both sections (3 rows each).
- **Empty saved:** prompt card.
- **Empty nearby (perm denied):** prompt card.
- **Stale data on a row:** ETAs in neutral-500, no LiveDot pulse.

## Refresh

Pull-to-refresh. Auto-refresh every 30 s while screen active.
