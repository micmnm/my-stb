import type {
  ArrivalsResponse,
  Direction,
  GeocodingResult,
  RouteDetailResponse,
  RouteOption,
  ServiceAlert,
  StopDetail,
  Vehicle,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers['X-Api-Key'] = API_KEY;
  const res = await fetch(`${BASE_URL}${path}`, { headers, signal });
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

  getStop(id: string, signal?: AbortSignal): Promise<StopDetail> {
    return get(`/api/stops/${encodeURIComponent(id)}`, signal);
  },

  getArrivals(stopId: string, signal?: AbortSignal): Promise<ArrivalsResponse> {
    return get(`/api/stops/${encodeURIComponent(stopId)}/arrivals`, signal);
  },

  getRouteDetail(routeId: string, direction: Direction, signal?: AbortSignal): Promise<RouteDetailResponse> {
    return get(`/api/routes/${encodeURIComponent(routeId)}/detail?direction=${direction}`, signal);
  },

  getAlerts(opts: { routeId?: string; stopId?: string } = {}, signal?: AbortSignal): Promise<ServiceAlert[]> {
    const qs = new URLSearchParams();
    if (opts.routeId) qs.set('routeId', opts.routeId);
    if (opts.stopId) qs.set('stopId', opts.stopId);
    const suffix = qs.toString();
    return get(`/api/alerts${suffix ? '?' + suffix : ''}`, signal);
  },
};
