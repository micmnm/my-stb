import ro from './ro.json';
import en from './en.json';

export type Lang = 'ro' | 'en';

const dict: Record<Lang, Record<string, string>> = { ro, en };

const STORAGE_KEY = 'mystb.lang';
const listeners = new Set<() => void>();

function detectInitial(): Lang {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ro' || stored === 'en') return stored;
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ro')) {
    return 'ro';
  }
  return 'en';
}

let current: Lang = detectInitial();
if (typeof document !== 'undefined') {
  document.documentElement.lang = current;
}

export function getLang(): Lang { return current; }

export function setLang(lang: Lang): void {
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  listeners.forEach(fn => fn());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dict[current][key] ?? dict.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
