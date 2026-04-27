import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { PlanRequest, PlanResponse } from '../types';

export interface UseTripPlanResult {
  data: PlanResponse | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useTripPlan(req: PlanRequest | null): UseTripPlanResult {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!req) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    api.plan(req, controller.signal)
      .then(resp => {
        if (cancelled) return;
        setData(resp);
        setError(null);
      })
      .catch(e => {
        if (cancelled || (e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req && JSON.stringify(req), tick]);

  return { data, error, isLoading, refetch };
}
