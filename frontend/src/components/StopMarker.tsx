import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface StopMarkerProps {
  lat: number;
  lng: number;
  name: string;
  type: 'origin' | 'destination';
}

const originIcon = new L.DivIcon({
  className: 'stop-marker origin',
  html: '<div class="stop-dot origin-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = new L.DivIcon({
  className: 'stop-marker dest',
  html: '<div class="stop-dot dest-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function StopMarker({ lat, lng, name, type }: StopMarkerProps) {
  return (
    <Marker position={[lat, lng]} icon={type === 'origin' ? originIcon : destIcon}>
      <Popup>{name}</Popup>
    </Marker>
  );
}
