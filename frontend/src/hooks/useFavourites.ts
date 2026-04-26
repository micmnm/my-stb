import { useState, useCallback } from 'react';
import type { Favourite } from '../types';

const STORAGE_KEY = 'mystb-favourites';

function loadFavourites(): Favourite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFavourites(favs: Favourite[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavourites() {
  const [favourites, setFavourites] = useState<Favourite[]>(loadFavourites);

  const add = useCallback((name: string, lat: number, lng: number) => {
    setFavourites(prev => {
      const next = [...prev, { id: crypto.randomUUID(), name, lat, lng }];
      saveFavourites(next);
      return next;
    });
  }, []);

  const update = useCallback((id: string, name: string, lat: number, lng: number) => {
    setFavourites(prev => {
      const next = prev.map(f => f.id === id ? { ...f, name, lat, lng } : f);
      saveFavourites(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setFavourites(prev => {
      const next = prev.filter(f => f.id !== id);
      saveFavourites(next);
      return next;
    });
  }, []);

  return { favourites, add, update, remove };
}
