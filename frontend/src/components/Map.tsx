import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
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

interface MapProps {
  userPosition: { lat: number; lng: number } | null;
  children?: React.ReactNode;
}

function RecenterMap({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

export function Map({ userPosition, children }: MapProps) {
  const center = userPosition ? [userPosition.lat, userPosition.lng] as [number, number] : BUCHAREST_CENTER;

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap position={userPosition ? [userPosition.lat, userPosition.lng] : null} />
      {userPosition && (
        <Marker position={[userPosition.lat, userPosition.lng]}>
          <Popup>You are here</Popup>
        </Marker>
      )}
      {children}
    </MapContainer>
  );
}
