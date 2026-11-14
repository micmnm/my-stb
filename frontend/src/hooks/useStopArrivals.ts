import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ArrivalsResponse, FeedHealth } from '../types';

const POLL_MS = 15_000;

export interface UseStopArrivalsResult {
  data: ArrivalsResponse | null;
  error: Error | null;
  isLoading: boolean;
  feed: FeedHealth | null;
  /** Server reports the upstream vehicle feed as down; all ETAs are untrustworthy. */
  feedDown: boolean;
  lastUpdated: number | null;
  refetch: () => void;
}

export function useStopArrivals(stopId: string | undefined): UseStopArrivalsResult {
  const [data, setData] = useState<ArrivalsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!stopId);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => {
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (!stopId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const next = await api.getArrivals(stopId, controller.signal);
        if (cancelled) return;
        setData(next);
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
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
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
  }, [stopId, tick]);

  const feed = data?.feed ?? null;
  const feedDown = feed?.status === 'down';

  return { data, error, isLoading, feed, feedDown, lastUpdated, refetch };
}
