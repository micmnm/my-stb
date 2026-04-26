import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Vehicle } from '../types';

interface VehicleMarkerProps {
  vehicle: Vehicle;
  lineName: string;
  color: string;
}

function createVehicleIcon(lineName: string, color: string) {
  return new L.DivIcon({
    className: 'vehicle-marker',
    html: `<div class="vehicle-dot" style="background:${color}">${lineName}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function VehicleMarker({ vehicle, lineName, color }: VehicleMarkerProps) {
  return (
    <Marker position={[vehicle.lat, vehicle.lng]} icon={createVehicleIcon(lineName, color)}>
      <Popup>
        {lineName} · {vehicle.licensePlate || vehicle.id}
      </Popup>
    </Marker>
  );
}
