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
