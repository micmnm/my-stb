import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { PeekArrivals } from '../types';

const POLL_MS = 30_000;

export interface UseStopArrivalPeekResult {
  data: PeekArrivals;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => void;
}

export function useStopArrivalPeek(stopIds: string[]): UseStopArrivalPeekResult {
  const [data, setData] = useState<PeekArrivals>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Stable key so we don't re-fetch when array reference changes.
  const key = stopIds.slice().sort().join(',');

  useEffect(() => {
    if (stopIds.length === 0) {
      setData({});
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      try {
        const next = await api.peekArrivals(stopIds, controller.signal);
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
  }, [key, tick]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch: () => setTick(t => t + 1),
  };
}
