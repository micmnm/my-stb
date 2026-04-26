import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { Vehicle } from '../types';

export function useVehicles(routeId: string | null) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!routeId) {
      setVehicles([]);
      return;
    }

    const poll = async () => {
      try {
        setVehicles(await api.getVehicles(routeId));
      } catch {
        /* ignore */
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 10_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [routeId]);

  return vehicles;
}
