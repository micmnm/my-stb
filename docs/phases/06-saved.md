# Phase 6 — Saved

**Goal:** Replace the existing `useFavourites` lat/lng-only store with a proper `SavedItem` store backing nicknames, reorder, edit, and delete-with-undo. Wire bookmark toggles on Stop and Route detail to it.

**Depends on:** Phases 0–5 (every screen needs a working bookmark; Search's `?intent=save` flow already lands here).

**Test it:** open `/saved` — see two sections (Stops, Lines) with your saved items. Toggle Edit — drag handles appear, nicknames become editable inline, trash icons surface. Reorder a row, rename one, delete one, tap "Undo" within 5 s — restore. Open Stop detail of a saved stop, tap bookmark — toast "Removed from saved", bookmark icon flips state. All persists across reloads.

**Handoff references:** [`screens/saved.md`](../handoff/screens/saved.md), [`data.md`](../handoff/data.md) `LocalStore`/`SavedItem`, [`copy.md`](../handoff/copy.md) `saved.*`.

---

## Scope

- New store: `frontend/src/stores/saved.ts` — typed `SavedItem` array per `data.md`, persisted to `localStorage`, with migration from the legacy `useFavourites` shape.
- New hook: `useSaved()` exposing `{ stops, routes, add, update, remove, reorder, isSaved }`.
- `<SavedPage/>` with Edit toggle, drag-to-reorder, inline rename, delete-with-undo.
- Wire `Bookmark` icon on `<StopDetailPage/>` and `<RouteDetailPage/>` to `useSaved().add/remove`.
- Use the saved-stops list to drive Home's saved section (already consuming favourites in Phase 4 — switch the source).

## Out of scope

- Cross-device sync — out of scope per `scope.md` `Later` table. Local only.
- Lines section's peek of *next vehicle on the line* — only stop sections show peek arrivals on Home; `screens/saved.md` doesn't require peek on the Saved tab itself, but a 1-line "next at terminus" is a nice-to-have. Defer.

## Tasks

### 1. Saved store

File: `frontend/src/stores/saved.ts`. Shape exactly per `data.md`:

```ts
export type SavedKind = 'stop' | 'route';
export interface SavedItem {
  kind: SavedKind;
  id: string;             // stopId or routeId
  nickname?: string;
  order: number;          // ascending; reordered on drag
  addedAt: string;        // ISO
  // for stops only:
  name?: string;          // denormalized stop name for offline render
  // for routes only:
  shortName?: string;
  mode?: Mode;
}
```

Persist under `mystb.saved` (string JSON). Use `useSyncExternalStore` so all consumers re-render on update.

API:

```ts
add(item: Omit<SavedItem, 'order'|'addedAt'>): void
update(kind: SavedKind, id: string, patch: Partial<SavedItem>): void
remove(kind: SavedKind, id: string): void
reorder(kind: SavedKind, fromIdx: number, toIdx: number): void
isSaved(kind: SavedKind, id: string): boolean
```

### 2. Migration

On first read after upgrade, look for the legacy `mystb.favourites` (or whatever key `useFavourites` writes today — confirm by reading `frontend/src/hooks/useFavourites.ts`). For each entry, convert to `SavedItem` with `kind: 'stop'`, `id: <closest stop id by haversine>` if the lat/lng matches a known stop within 50 m; otherwise drop with a `console.warn`. Write the converted array under the new key and remove the old key.

If migration is risky (lat/lng entries don't map cleanly), don't drop them — keep them as a `legacy: { lat, lng, name }` field on a `SavedItem` of kind `'stop'` and id `legacy:<index>`. The Saved page renders a row marked "Indisponibil" + "Remove" for each per `screens/saved.md` 404 case.

### 3. `<SavedPage/>`

File: `frontend/src/pages/saved/index.tsx`. Layout:

```
[ScreenShell]
├─ Header: "Salvate / Saved" + Edit toggle (right) + Add (+) (left of Edit)
├─ if empty: empty card t('saved.empty') + Adaugă CTA → /search?intent=save
├─ Stops section (StopRow variant, see below)
├─ Lines section (RouteBadge row variant)
└─ BottomNav
```

Item row (default mode):
- Nickname (display 17 bold) | stop/route name (caption neutral)
- Right side (stops only): peek arrivals (1–2 ETAs from `useStopArrivalPeek` from Phase 4).
- Tap row body → `/stop/:id` or `/route/:id`.

Item row (Edit mode):
- Drag handle (left, only visible in Edit).
- Nickname becomes a small `<input>` in place. Save on blur or Enter.
- Trash icon (right). Tap → call `remove()` then surface a 5 s undo toast (`t('saved.remove_undo', { name })`). Add the key.
- Tap body still navigates (don't lose that affordance).

### 4. Drag-to-reorder

Use HTML5 DnD or a 200-line custom touch handler — no new dependencies. Persist via `reorder(kind, from, to)` only on drop. Animate position swaps with `transform` + `transition: transform var(--dur-fast) var(--ease-ui)`.

For touch: long-press the drag handle starts a drag; vertical movement reorders; release commits.

### 5. Bookmark wiring on detail screens

In `<StopDetailPage/>` (Phase 2 left a stub):

```tsx
const { isSaved, add, remove } = useSaved();
const saved = isSaved('stop', stopId);
const onBookmark = () => saved
  ? remove('stop', stopId)
  : add({ kind: 'stop', id: stopId, name: stop.name });
```

Same in `<RouteDetailPage/>` for `'route'`.

Toggling shows a brief toast — same component as the delete-undo toast (extract `<Toast/>` to `frontend/src/components/atoms/Toast.tsx` if not done already).

### 6. Home saved section now sources from `useSaved`

Update `<HomePage/>` (Phase 4) to consume `useSaved()` instead of the legacy `useFavourites`. Saved stops still drive `useStopArrivalPeek` for the right-side peek ETAs. Render `nickname || name` as the row title.

The legacy `useFavourites` and `<FavouritesManager/>` can stay alive on `/legacy` if you want to keep that fallback alive; otherwise delete them after this phase.

### 7. Empty state

If `saved.length === 0`:
- Single illustration placeholder (a simple SVG: bookmark + plus) is fine.
- Text: `t('saved.empty')`.
- CTA: `t('saved.add')` → `/search?intent=save`.

### 8. 404 on a saved stop

When `useStopArrivalPeek` returns `404` for a saved stop ID, mark that row with a grey "Indisponibil" badge + a "Remove" button per `screens/saved.md`. Add `t('saved.unavailable')` and `t('saved.unavailable_remove')`.

### 9. Verify

- `/saved` empty → see card + CTA → tap → `/search?intent=save` → tap a stop → return to `/saved` with the stop present.
- Toggle Edit → drag handles + trash icons appear.
- Rename a row → reload page → name persists.
- Reorder a row → reload → order persists.
- Delete a row → "Undo" appears for 5 s → tap → row restored.
- Open the saved stop's Stop detail → bookmark is filled → tap → "Removed" toast → bookmark hollow → return to `/saved` → row gone.
- Open a route → tap bookmark → return to `/saved` → it's now in the Lines section.
- Reload after migration from legacy favourites → all (or most, with the legacy fallback) carried over.

## Done when

- [ ] `useSaved` is the single source of truth; legacy `useFavourites` is no longer imported by any production page (only `/legacy` if kept).
- [ ] Migration runs on first load and either maps legacy entries to real stops or marks them legacy/unavailable.
- [ ] `/saved` supports add (via Search), edit nickname, drag-reorder, delete with undo.
- [ ] Bookmark toggles on Stop detail and Route detail update the store and reflect immediately.
- [ ] Home's saved section sources from `useSaved`.
- [ ] All copy via `t()`.
