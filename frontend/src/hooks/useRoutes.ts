import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { RouteOption } from '../types';

export function useRoutes() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    setLoading(true);
    try {
      setRoutes(await api.searchRoutes(fromLat, fromLng, toLat, toLng));
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setRoutes([]), []);

  return { routes, loading, search, clear };
}
