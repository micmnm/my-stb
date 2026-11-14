import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PlanRequest, PlanResponse } from '../types';

export interface UseTripPlanResult {
  data: PlanResponse | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
}

interface Outcome {
  id: string;
  data: PlanResponse | null;
  error: Error | null;
}

export function useTripPlan(req: PlanRequest | null): UseTripPlanResult {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const key = req ? JSON.stringify(req) : null;
  const id = key === null ? null : `${tick}:${key}`;

  useEffect(() => {
    if (key === null || id === null) return;
    const controller = new AbortController();
    api.plan(JSON.parse(key) as PlanRequest, controller.signal)
      .then(resp => setOutcome({ id, data: resp, error: null }))
      .catch(e => {
        if (controller.signal.aborted || (e as { name?: string }).name === 'AbortError') return;
        setOutcome({ id, data: null, error: e instanceof Error ? e : new Error(String(e)) });
      });
    return () => controller.abort();
  }, [key, id]);

  const current = outcome !== null && outcome.id === id;
  return {
    // Keep the previous plan visible while a refetch is in flight.
    data: key === null ? null : outcome?.data ?? null,
    error: current ? outcome.error : null,
    isLoading: id !== null && !current,
    refetch,
  };
}
