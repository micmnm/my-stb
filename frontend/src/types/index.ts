export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance?: number;
}

export interface RouteOption {
  routeId: string;
  shortName: string;
  routeType: number;
  direction: string;
  directionId: number;
  originStopId: string;
  originStopName: string;
  originStopDistance: number;
  destStopId: string;
  destStopName: string;
  destStopDistance: number;
  lastMileDistance: number;
  stopCount: number;
  estimatedMinutes: number | null;
  shapeCoords: [number, number][] | null;
}

export interface Vehicle {
  id: string;
  routeId: string;
  lat: number;
  lng: number;
  directionId: number;
  licensePlate: string | null;
  timestamp: number;
  updatedAt: number;
}

export interface Favourite {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  displayName: string;
  lat: number;
  lng: number;
  type: string | null;
}

export type RouteTypeLabel = 'bus' | 'tram' | 'trolley' | 'metro';

export function routeTypeLabel(type: number): RouteTypeLabel {
  switch (type) {
    case 0: return 'tram';
    case 1: return 'metro';
    case 11: return 'trolley';
    default: return 'bus';
  }
}

// ============== New shapes (data.md) ==============

export type Mode = 'tram' | 'bus' | 'trolley' | 'm1' | 'm2' | 'm3' | 'm4' | 'm5';

export interface RouteSummary {
  id: string;
  shortName: string;
  routeType: number;
}

export interface StopDetail {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: RouteSummary[];
  street?: string;
}

export interface Arrival {
  routeId: string;
  shortName: string;
  routeType: number;
  vehicleId: string;
  direction: 'a' | 'b';
  directionId: number;
  destinationStopId: string;
  destinationName: string;
  etaSeconds: number;
  isLive: boolean;
  isCancelled: boolean;
}

export interface ArrivalsResponse {
  stopId: string;
  serverTime: string;
  arrivals: Arrival[];
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface ServiceAlert {
  id: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  affectedRouteIds?: string[];
  affectedStopIds?: string[];
  startsAt?: string;
  endsAt?: string;
  url?: string | null;
}

export type Direction = 'a' | 'b';

export interface RouteSummaryDetail {
  id: string;
  shortName: string;
  longName: string;
  routeType: number;
  mode: Mode;
}

export interface Terminus {
  stopId: string;
  name: string;
}

export interface SchematicStopDto {
  id: string;
  name: string;
  sequence: number;
  isTerminus: boolean;
  etaSeconds: number | null;
}

export interface VehicleDto {
  id: string;
  routeId: string;
  lat: number;
  lng: number;
  directionId: number;
  direction: Direction;
  updatedAt: number;
  isLive: boolean;
  nextStopId: string | null;
  nextStopEtaSeconds: number | null;
}

export interface RouteDetailResponse {
  route: RouteSummaryDetail;
  terminusA: Terminus | null;
  terminusB: Terminus | null;
  direction: Direction;
  stops: SchematicStopDto[];
  vehicles: VehicleDto[];
  alerts: ServiceAlert[];
  serverTime: string;
}

export interface NearbyStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  walkSeconds: number;
  routes: { shortName: string; routeType: number }[];
}

export interface SearchStopHit {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
  distanceMeters: number;
}

export interface SearchRouteHit {
  id: string;
  shortName: string;
  longName: string;
  routeType: number;
}

export interface SearchAddressHit {
  label: string;
  lat: number;
  lng: number;
  type: string | null;
}

export interface SearchResponse {
  stops: SearchStopHit[];
  routes: SearchRouteHit[];
  addresses: SearchAddressHit[];
}

export type SearchType = 'stops' | 'routes' | 'addresses';

export interface PeekArrivals {
  /** stopId → soonest arrivals (max 2 per stop, one per direction). */
  [stopId: string]: { soonest: Arrival[] };
}

/** Map an STB GTFS route_type (or any numeric type) to our Mode token. */
export function modeFromRouteType(type: number, shortName?: string): Mode {
  if (type === 1) {
    const sn = shortName?.toUpperCase() ?? '';
    if (sn === 'M1') return 'm1';
    if (sn === 'M2') return 'm2';
    if (sn === 'M3') return 'm3';
    if (sn === 'M4') return 'm4';
    if (sn === 'M5') return 'm5';
    return 'm1';
  }
  if (type === 0) return 'tram';
  if (type === 11) return 'trolley';
  return 'bus';
}
