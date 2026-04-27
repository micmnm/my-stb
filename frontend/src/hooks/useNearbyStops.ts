import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { NearbyStop } from '../types';

const POSITION_CHANGE_METERS = 100;

function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface UseNearbyStopsResult {
  data: NearbyStop[];
  isLoading: boolean;
  error: Error | null;
}

export function useNearbyStops(
  position: { lat: number; lng: number } | null,
  opts: { limit?: number; maxMeters?: number } = {},
): UseNearbyStopsResult {
  const [data, setData] = useState<NearbyStop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastFetchPosRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    const last = lastFetchPosRef.current;
    if (last && distMeters(last, position) < POSITION_CHANGE_METERS) return;
    lastFetchPosRef.current = position;

    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    api.getNearbyStops(position.lat, position.lng, opts, controller.signal)
      .then(rows => { if (!cancelled) { setData(rows); setError(null); } })
      .catch(e => {
        if (cancelled || (e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; controller.abort(); };
  }, [position, opts]);

  return { data, isLoading, error };
}
