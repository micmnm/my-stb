import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface MiniMapProps {
  stop: { lat: number; lng: number };
  vehicle?: { lat: number; lng: number; label?: string };
  height?: number;
  className?: string;
  vehicleColor?: string;
}

function FitView({
  stop,
  vehicle,
}: {
  stop: { lat: number; lng: number };
  vehicle?: { lat: number; lng: number };
}) {
  const map = useMap();
  useEffect(() => {
    if (vehicle) {
      const bounds = L.latLngBounds([
        [stop.lat, stop.lng],
        [vehicle.lat, vehicle.lng],
      ]);
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
    } else {
      map.setView([stop.lat, stop.lng], 15);
    }
  }, [stop.lat, stop.lng, vehicle?.lat, vehicle?.lng, map, vehicle]);
  return null;
}

export function MiniMap({ stop, vehicle, height = 120, className, vehicleColor = '#E63027' }: MiniMapProps) {
  const center = useMemo<[number, number]>(() => [stop.lat, stop.lng], [stop.lat, stop.lng]);
  return (
    <div
      className={className}
      style={{ width: '100%', height, borderRadius: 'var(--r-md)', overflow: 'hidden' }}
      aria-hidden="true"
    >
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        keyboard={false}
        touchZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitView stop={stop} vehicle={vehicle} />
        <Marker position={center} />
        {vehicle && (
          <CircleMarker
            center={[vehicle.lat, vehicle.lng]}
            radius={8}
            pathOptions={{ color: '#fff', fillColor: vehicleColor, fillOpacity: 1, weight: 2 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
