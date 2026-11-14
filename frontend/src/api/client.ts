import type {
  ArrivalsResponse,
  Direction,
  NearbyStop,
  PeekResponse,
  PlanRequest,
  PlanResponse,
  RouteDetailResponse,
  RouteOption,
  SearchResponse,
  SearchType,
  ServiceAlert,
  StopDetail,
  Vehicle,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`API error: ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

const rateLimitListeners = new Set<() => void>();

/** Called whenever the API answers 429. */
export function onRateLimited(fn: () => void): () => void {
  rateLimitListeners.add(fn);
  return () => { rateLimitListeners.delete(fn); };
}

function checkOk(res: Response): void {
  if (res.ok) return;
  if (res.status === 429) rateLimitListeners.forEach(fn => fn());
  throw new ApiError(res.status);
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { signal });
  checkOk(res);
  return res.json();
}

async function postJson<TBody, TResp>(path: string, body: TBody, signal?: AbortSignal): Promise<TResp> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  checkOk(res);
  return res.json();
}

export const api = {
  searchRoutes(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<RouteOption[]> {
    return get(`/api/routes?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`);
  },

  getVehicles(routeId: string): Promise<Vehicle[]> {
    return get(`/api/vehicles?routeId=${routeId}`);
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

  /** Server caps: 1..20 stopIds, 0..50 routeIds (400 otherwise), so stops go in batches of 20. Empty routeIds = no route filter. */
  async peekArrivals(stopIds: string[], routeIds: string[] = [], signal?: AbortSignal): Promise<PeekResponse> {
    const routes = routeIds.slice(0, 50);
    const batches: string[][] = [];
    for (let i = 0; i < stopIds.length; i += 20) batches.push(stopIds.slice(i, i + 20));
    if (batches.length === 0) batches.push([]);
    const responses = await Promise.all(batches.map((ids) =>
      postJson<object, PeekResponse>(
        '/api/stops/arrivals/peek',
        routes.length > 0 ? { stopIds: ids, routeIds: routes } : { stopIds: ids },
        signal,
      )));
    return {
      feed: responses[0].feed,
      stops: Object.assign({}, ...responses.map((r) => r.stops)),
    };
  },

  plan(request: PlanRequest, signal?: AbortSignal): Promise<PlanResponse> {
    return postJson('/api/plan', request, signal);
  },
};
