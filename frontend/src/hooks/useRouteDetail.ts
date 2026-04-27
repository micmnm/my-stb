import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Direction, RouteDetailResponse } from '../types';

const POLL_MS = 15_000;
const STALE_MS = 60_000;

export interface UseRouteDetailResult {
  data: RouteDetailResponse | null;
  error: Error | null;
  isLoading: boolean;
  isStale: boolean;
  lastUpdated: number | null;
  refetch: () => void;
}

export function useRouteDetail(routeId: string | undefined, direction: Direction): UseRouteDetailResult {
  const [data, setData] = useState<RouteDetailResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!routeId);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!routeId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const next = await api.getRouteDetail(routeId, direction, controller.signal);
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
  }, [routeId, direction, tick]);

  const isStale = !!data && Date.now() - new Date(data.serverTime).getTime() > STALE_MS;

  return { data, error, isLoading, isStale, lastUpdated, refetch };
}
