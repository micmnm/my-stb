import { useSyncExternalStore } from 'react';

export type ThemeMode = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'mystb.theme';
const listeners = new Set<() => void>();

function readStored(): ThemeMode {
  const v = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) as ThemeMode | null;
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto';
}

let current: ThemeMode = readStored();
applyToDom(current);

function applyToDom(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'auto') {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = mode;
  }
}

export function getTheme(): ThemeMode { return current; }

export function setTheme(mode: ThemeMode): void {
  current = mode;
  localStorage.setItem(STORAGE_KEY, mode);
  applyToDom(mode);
  listeners.forEach(fn => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme, getTheme);
  return { theme, setTheme };
}
