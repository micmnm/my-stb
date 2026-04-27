import { useSyncExternalStore } from 'react';

export type RecentKind = 'stop' | 'route' | 'address' | 'trip';

export interface Recent {
  kind: RecentKind;
  refId: string;
  visitedAt: string;
  label: string;
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = 'mystb.recents';
const MAX = 20;
const listeners = new Set<() => void>();

function read(): Recent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let cache: Recent[] = read();

function write(next: Recent[]): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota — non-fatal */
  }
  listeners.forEach(fn => fn());
}

export function getRecents(): Recent[] {
  return cache;
}

export function pushRecent(item: Omit<Recent, 'visitedAt'> & { visitedAt?: string }): void {
  const stamped: Recent = { ...item, visitedAt: item.visitedAt ?? new Date().toISOString() };
  const filtered = cache.filter(r => !(r.kind === stamped.kind && r.refId === stamped.refId));
  const next = [stamped, ...filtered].slice(0, MAX);
  write(next);
}

export function clearRecents(): void {
  write([]);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useRecents(): Recent[] {
  return useSyncExternalStore(subscribe, getRecents, getRecents);
}
