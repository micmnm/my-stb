import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { FeedHealth, PeekArrivals } from '../types';

const POLL_MS = 30_000;
const EMPTY: PeekArrivals = {};

export interface UseStopArrivalPeekResult {
  /** stopId → soonest arrivals. */
  data: PeekArrivals;
  feed: FeedHealth | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => void;
}

/** `routeIds` non-empty restricts every stop's peek to those routes (server-side). */
export function useStopArrivalPeek(stopIds: string[], routeIds: string[] = []): UseStopArrivalPeekResult {
  const [data, setData] = useState<PeekArrivals>(EMPTY);
  const [feed, setFeed] = useState<FeedHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Stable keys so we don't re-fetch when array references change.
  const key = stopIds.slice().sort().join(',');
  const routeKey = routeIds.slice().sort().join(',');
  const enabled = stopIds.length > 0;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      try {
        const next = await api.peekArrivals(stopIds, routeIds, controller.signal);
        if (cancelled) return;
        setData(next.stops);
        setFeed(next.feed);
        setError(null);
        setLastUpdated(Date.now());
      } catch (e) {
        if (cancelled || (e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const start = () => {
      fetchOnce();
      timer = setInterval(fetchOnce, POLL_MS);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { fetchOnce(); start(); }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      stop();
      abortRef.current?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, routeKey, enabled, tick]);

  // Derived rather than reset in the effect when there is nothing to peek.
  return {
    data: enabled ? data : EMPTY,
    feed: enabled ? feed : null,
    isLoading: enabled && isLoading,
    error: enabled ? error : null,
    lastUpdated: enabled ? lastUpdated : null,
    refetch: () => setTick(t => t + 1),
  };
}
