import { useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { GeocodingResult } from '../types';

export function useSearch() {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchPlaces(query);
        setResults(res);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 400);
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, search, clear };
}
