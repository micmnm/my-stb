import { useSyncExternalStore } from 'react';
import type { Mode } from '../types';

export type SavedKind = 'stop' | 'route';

export interface SavedItem {
  kind: SavedKind;
  id: string;
  nickname?: string;
  order: number;
  addedAt: string;
  // for stops
  name?: string;
  // for routes
  shortName?: string;
  mode?: Mode;
  // legacy migration fallback when a favourite couldn't be mapped to a real stop
  legacy?: { lat: number; lng: number; name: string };
}

const STORAGE_KEY = 'mystb.saved';
const LEGACY_KEY = 'mystb-favourites';
const listeners = new Set<() => void>();

interface LegacyFavourite { id: string; name: string; lat: number; lng: number; }

function readStored(): SavedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStored(items: SavedItem[]): void {
  cache = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota — non-fatal */
  }
  listeners.forEach(fn => fn());
}

let cache: SavedItem[] = readStored();
let migrationStarted = false;

export function getSaved(): SavedItem[] {
  return cache;
}

function nextOrder(kind: SavedKind): number {
  return cache.filter(i => i.kind === kind).reduce((m, i) => Math.max(m, i.order), -1) + 1;
}

export function isSaved(kind: SavedKind, id: string): boolean {
  return cache.some(i => i.kind === kind && i.id === id);
}

export function addItem(item: Omit<SavedItem, 'order' | 'addedAt'>): SavedItem | null {
  if (isSaved(item.kind, item.id)) return null;
  const next: SavedItem = {
    ...item,
    order: nextOrder(item.kind),
    addedAt: new Date().toISOString(),
  };
  writeStored([...cache, next]);
  return next;
}

export function removeItem(kind: SavedKind, id: string): SavedItem | null {
  const removed = cache.find(i => i.kind === kind && i.id === id);
  if (!removed) return null;
  writeStored(cache.filter(i => !(i.kind === kind && i.id === id)));
  return removed;
}

export function restoreItem(item: SavedItem): void {
  if (isSaved(item.kind, item.id)) return;
  writeStored([...cache, item]);
}

export function updateItem(kind: SavedKind, id: string, patch: Partial<SavedItem>): void {
  const next = cache.map(i => (i.kind === kind && i.id === id ? { ...i, ...patch, kind: i.kind, id: i.id } : i));
  writeStored(next);
}

export function reorderItem(kind: SavedKind, fromIdx: number, toIdx: number): void {
  const sameKind = cache.filter(i => i.kind === kind).sort((a, b) => a.order - b.order);
  if (fromIdx < 0 || fromIdx >= sameKind.length || toIdx < 0 || toIdx >= sameKind.length) return;
  const [moved] = sameKind.splice(fromIdx, 1);
  sameKind.splice(toIdx, 0, moved);
  const updates = new Map<string, number>();
  sameKind.forEach((it, i) => updates.set(`${it.kind}:${it.id}`, i));
  const next = cache.map(i => {
    const o = updates.get(`${i.kind}:${i.id}`);
    return o !== undefined ? { ...i, order: o } : i;
  });
  writeStored(next);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useSaved(): {
  stops: SavedItem[];
  routes: SavedItem[];
  isSaved: typeof isSaved;
  add: typeof addItem;
  remove: typeof removeItem;
  restore: typeof restoreItem;
  update: typeof updateItem;
  reorder: typeof reorderItem;
} {
  const all = useSyncExternalStore(subscribe, getSaved, getSaved);
  const stops = all.filter(i => i.kind === 'stop').sort((a, b) => a.order - b.order);
  const routes = all.filter(i => i.kind === 'route').sort((a, b) => a.order - b.order);
  return {
    stops,
    routes,
    isSaved,
    add: addItem,
    remove: removeItem,
    restore: restoreItem,
    update: updateItem,
    reorder: reorderItem,
  };
}

/**
 * Migrate from the legacy mystb-favourites store. For each entry, query
 * /api/stops/nearby with a 50 m radius and snap to the closest stop. If no stop
 * is within the threshold, retain the entry as a legacy fallback row.
 */
export async function migrateLegacyFavouritesIfPresent(
  resolver: (lat: number, lng: number) => Promise<{ id: string; name: string } | null>,
): Promise<void> {
  if (migrationStarted) return;
  migrationStarted = true;

  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  let legacy: LegacyFavourite[] = [];
  try { legacy = JSON.parse(raw); } catch { /* ignore */ }
  if (!Array.isArray(legacy) || legacy.length === 0) {
    localStorage.removeItem(LEGACY_KEY);
    return;
  }

  const migrated: SavedItem[] = [...cache];

  for (let i = 0; i < legacy.length; i++) {
    const fav = legacy[i];
    const closest = await resolver(fav.lat, fav.lng).catch(() => null);
    if (closest && !migrated.some(it => it.kind === 'stop' && it.id === closest.id)) {
      migrated.push({
        kind: 'stop',
        id: closest.id,
        nickname: fav.name,
        name: closest.name,
        order: migrated.filter(m => m.kind === 'stop').length,
        addedAt: new Date().toISOString(),
      });
    } else if (!closest) {
      migrated.push({
        kind: 'stop',
        id: `legacy:${fav.id}`,
        nickname: fav.name,
        name: fav.name,
        order: migrated.filter(m => m.kind === 'stop').length,
        addedAt: new Date().toISOString(),
        legacy: { lat: fav.lat, lng: fav.lng, name: fav.name },
      });
    }
  }

  writeStored(migrated);
  localStorage.removeItem(LEGACY_KEY);
}
