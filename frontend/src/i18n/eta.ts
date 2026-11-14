import type { t as translate } from './index';

type T = typeof translate;

export interface EtaText {
  /** Rounded minutes, at least 1. */
  n: number;
  text: string;
  aria: string;
}

/** Live ETAs are estimates (spec AU1): "~N min", read as "about N minutes". */
export function approxEta(t: T, etaSeconds: number): EtaText {
  const n = Math.max(1, Math.round(etaSeconds / 60));
  return { n, text: t('eta.approx_min', { n }), aria: t('eta.approx_min_aria', { n }) };
}

/** Stale arrivals show how long ago the bus last reported instead of an ETA (spec AU2). */
export function lastSeen(t: T, lastSeenSeconds: number): EtaText {
  const n = Math.max(1, Math.round(lastSeenSeconds / 60));
  return { n, text: t('eta.last_seen', { n }), aria: t('eta.last_seen_aria', { n }) };
}

export function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Banner title for `feed.status === 'down'` (spec AU3). */
export function feedDownTitle(t: T, lastSuccessAt: string | null): string {
  return lastSuccessAt
    ? t('errors.feed_down_since', { time: formatClock(new Date(lastSuccessAt)) })
    : t('errors.feed_down_unknown');
}
