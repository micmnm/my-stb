import type {
  ArrivalsResponse,
  Direction,
  GeocodingResult,
  NearbyStop,
  PeekArrivals,
  RouteDetailResponse,
  RouteOption,
  SearchResponse,
  SearchType,
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

async function postJson<TBody, TResp>(path: string, body: TBody, signal?: AbortSignal): Promise<TResp> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-Api-Key'] = API_KEY;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
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

  /**
   * Legacy address-only call kept for the /legacy map UX. Backed by the new
   * unified search endpoint, then projected to the historic GeocodingResult shape.
   */
  async searchPlaces(query: string): Promise<GeocodingResult[]> {
    const resp = await get<SearchResponse>(
      `/api/search?q=${encodeURIComponent(query)}&types=addresses`,
    );
    return resp.addresses.map(a => ({
      displayName: a.label,
      lat: a.lat,
      lng: a.lng,
      type: a.type,
    }));
  },

  search(
    q: string,
    opts?: { types?: SearchType[]; lat?: number; lng?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<SearchResponse> {
    const qs = new URLSearchParams({ q });
    if (opts?.types?.length) qs.set('types', opts.types.join(','));
    if (opts?.lat !== undefined) qs.set('lat', String(opts.lat));
    if (opts?.lng !== undefined) qs.set('lng', String(opts.lng));
    if (opts?.limit) qs.set('limit', String(opts.limit));
    return get(`/api/search?${qs}`, signal);
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

  getNearbyStops(lat: number, lng: number, opts?: { limit?: number; maxMeters?: number }, signal?: AbortSignal): Promise<NearbyStop[]> {
    const qs = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (opts?.limit) qs.set('limit', String(opts.limit));
    if (opts?.maxMeters) qs.set('maxMeters', String(opts.maxMeters));
    return get(`/api/stops/nearby?${qs}`, signal);
  },

  peekArrivals(stopIds: string[], signal?: AbortSignal): Promise<PeekArrivals> {
    return postJson('/api/stops/arrivals/peek', { stopIds }, signal);
  },
};
