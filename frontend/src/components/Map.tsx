import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { StopMarker } from './StopMarker';
import { LastMileLine } from './LastMileLine';
import { VehicleMarker } from './VehicleMarker';
import type { RouteOption, Vehicle } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Leaflet + bundlers issue)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BUCHAREST_CENTER: [number, number] = [44.4268, 26.1025];

const routeColors: Record<number, string> = {
  0: '#e74c3c',  // tram
  3: '#3498db',  // bus
  11: '#2ecc71', // trolley
  1: '#f39c12',  // metro
};

interface MapProps {
  userPosition: { lat: number; lng: number } | null;
  selectedRoute: RouteOption | null;
  destination: { lat: number; lng: number } | null;
  vehicles: Vehicle[];
}

function FitBounds({ route, userPosition }: { route: RouteOption | null; userPosition: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (route?.shapeCoords && route.shapeCoords.length > 0) {
      const bounds = L.latLngBounds(route.shapeCoords.map(c => [c[0], c[1]] as [number, number]));
      if (userPosition) bounds.extend([userPosition.lat, userPosition.lng]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (userPosition) {
      map.setView([userPosition.lat, userPosition.lng], 15);
    }
  }, [route, userPosition, map]);
  return null;
}

export function Map({ userPosition, selectedRoute, destination, vehicles }: MapProps) {
  const center = userPosition ? [userPosition.lat, userPosition.lng] as [number, number] : BUCHAREST_CENTER;
  const routeColor = selectedRoute ? (routeColors[selectedRoute.routeType] || '#3498db') : '#3498db';

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds route={selectedRoute} userPosition={userPosition} />

      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {selectedRoute?.shapeCoords && (
        <Polyline
          positions={selectedRoute.shapeCoords.map(c => [c[0], c[1]] as [number, number])}
          pathOptions={{ color: routeColor, weight: 4 }}
        />
      )}

      {selectedRoute && (
        <>
          <StopMarker lat={0} lng={0} name={selectedRoute.originStopName} type="origin" />
          <StopMarker lat={0} lng={0} name={selectedRoute.destStopName} type="destination" />
        </>
      )}

      {destination && selectedRoute && selectedRoute.lastMileDistance > 0 && (
        <LastMileLine
          from={[0, 0]}
          to={[destination.lat, destination.lng]}
          distance={selectedRoute.lastMileDistance}
        />
      )}

      {vehicles.map((v) => (
        <VehicleMarker
          key={v.id}
          vehicle={v}
          lineName={selectedRoute?.shortName ?? ''}
          color={routeColor}
        />
      ))}
    </MapContainer>
  );
}
