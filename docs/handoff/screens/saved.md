# Saved

User-managed list of saved stops + routes with personal nicknames.

## Purpose

Make daily commutes one-tap-fast. The user's "Home", "School", "Bunica" should each get them to live arrivals in a single tap from app open.

## Layout

1. **Header:** "Salvate / Saved" + Edit toggle (right)
2. **Stops** section
3. **Lines** section
4. **Add (+) button** in header → Search (intent=save)

## Item row

Default mode:
- Drag handle (left, only visible in Edit mode)
- Nickname (display 17 px bold, e.g. "Acasă")
- Stop/route name in 13 px neutral below
- Peek arrivals (right): 1–2 most imminent

Edit mode:
- Drag handle visible
- Nickname becomes inline editable text field
- Trash icon on right
- Tap row body still navigates

## Behavior

- **Reorder:** long-press the handle, drag, release. Persisted on release.
- **Rename:** tap nickname (in Edit mode) → keyboard, save on blur or return.
- **Delete:** tap trash, confirm via inline undo toast (5 s).
- **Default nickname:** if user adds without a nickname, use stop name as-is.

## States

- **Empty:** illustration (placeholder OK in v1) + "Adaugă stații sau linii pentru acces rapid." + CTA "Adaugă".
- **Loading saved arrivals:** skeleton peek bars.
- **A saved stop got removed by STB (404):** mark row with grey badge "Indisponibil" + offer remove.
