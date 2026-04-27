# Cross-cutting states

Loading, empty, error, offline, stale — patterns every screen must implement.

## Loading

- **Always skeletons, never spinners over numbers.** A spinner where a "3 min" should be is misleading.
- Skeleton color: `--neutral-100` (light) / `--tunnel-2` (dark)
- Subtle shimmer animation, ≤1.4 s per cycle, respects `prefers-reduced-motion`.
- Don't show skeleton for under 200 ms — too flashy. Render synchronously if data arrives that fast.

## Empty

Three flavors:

1. **Empty by design** (no saved stops yet) — friendly prompt + CTA. Use copy from `copy.md`.
2. **Empty for this query** (no search results) — quiet line of text. No illustration.
3. **Empty due to time** (no arrivals in next hour) — explanatory line including the time window.

Never just leave a blank pane.

## Error

- **Feed unreachable:** banner at top of affected screen, retry button.
- **Network down:** persistent offline banner across all screens that need live data.
- **Permission denied** (location): in-context card replacing the section that needed it. No global banner.

Banner color: `--warning-soft`. Critical errors only: `--danger-soft`.

## Stale

When `now - serverTime > 60 s`:
- ETAs render in `--fg-3` (neutral-500), no brand red.
- LiveDot is off (no pulse, neutral fill).
- Subtle "Last update {HH:MM}" caption in the section header.

## Offline

- Last-known data is cached for 5 minutes after going offline. After that, render empty + "Offline" banner.
- Saved stops always render even offline (cached).
- Route schematics render their static structure offline; vehicles hidden.
- Don't disable navigation. The app should remain explorable.

## Accessibility for states

- Every banner has `role="status"` (info/warning) or `role="alert"` (critical).
- Every spinner / skeleton has `aria-busy="true"` on its container.
- Empty-state CTAs are real buttons, not text.
