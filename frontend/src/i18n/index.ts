import IntlMessageFormat from 'intl-messageformat';
import ro from './ro.json';
import en from './en.json';

export type Lang = 'ro' | 'en';

const dict: Record<Lang, Record<string, string>> = { ro, en };
const formatterCache = new Map<string, IntlMessageFormat>();

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
  formatterCache.clear();
  listeners.forEach(fn => fn());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function getFormatter(message: string, locale: Lang): IntlMessageFormat | null {
  const cacheKey = `${locale}:${message}`;
  let cached = formatterCache.get(cacheKey);
  if (cached) return cached;
  try {
    cached = new IntlMessageFormat(message, locale);
    formatterCache.set(cacheKey, cached);
    return cached;
  } catch {
    return null;
  }
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const message = dict[current][key] ?? dict.en[key] ?? key;

  // ICU-shaped messages (plural / select) need real formatter; simple {var} substitution
  // works either way but keep the fast path for the common case.
  if (message.includes('{') && (message.includes('plural,') || message.includes('select,'))) {
    const fmt = getFormatter(message, current);
    if (fmt) {
      try {
        const out = fmt.format(vars ?? {});
        return Array.isArray(out) ? out.join('') : String(out);
      } catch {
        // fall through to plain substitution
      }
    }
  }

  if (!vars) return message;
  let s = message;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}
