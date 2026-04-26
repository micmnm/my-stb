import type { RouteOption, Vehicle, GeocodingResult } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function get<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers['X-Api-Key'] = API_KEY;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  searchRoutes(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteOption[]> {
    return get(`/api/routes?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`);
  },

  getVehicles(routeId: string): Promise<Vehicle[]> {
    return get(`/api/vehicles?routeId=${routeId}`);
  },

  searchPlaces(query: string): Promise<GeocodingResult[]> {
    return get(`/api/search?q=${encodeURIComponent(query)}`);
  },
};
