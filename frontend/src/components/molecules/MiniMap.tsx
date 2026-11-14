import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { IconClose } from '../icons';
import { useT } from '../../i18n/useT';
import type { Freshness, Mode } from '../../types';
import styles from './MiniMap.module.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAX_FIT_ZOOM = 16;

export interface MiniMapVehicle {
  id: string;
  lat: number;
  lng: number;
  etaSeconds: number;
  lastSeenSeconds: number;
  freshness: Freshness;
}

export interface MiniMapProps {
  stop: { lat: number; lng: number };
  vehicles: MiniMapVehicle[];
  /** Live dots take this line colour. */
  mode?: Mode;
  /** Feed is down: draw every dot as stale. */
  dim?: boolean;
  height?: number;
  className?: string;
}

function FitView({ points, active }: { points: [number, number][]; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Refits on each poll while inert; never yanks the view while the user is panning.
    if (active) return;
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: MAX_FIT_ZOOM });
    } else {
      map.setView(points[0], 15);
    }
  }, [points, active, map]);
  return null;
}

/** MapContainer props are fixed after mount, so interactivity is toggled on the Leaflet handlers. */
function Interaction({ active }: { active: boolean }) {
  const map = useMap();
  useEffect(() => {
    const handlers = [map.dragging, map.touchZoom, map.doubleClickZoom, map.scrollWheelZoom, map.boxZoom, map.keyboard];
    if (!active) {
      handlers.forEach(h => h.disable());
      return;
    }
    handlers.forEach(h => h.enable());
    const zoom = L.control.zoom({ position: 'topleft' }).addTo(map);
    return () => { zoom.remove(); };
  }, [active, map]);
  return null;
}

export function MiniMap({ stop, vehicles, mode = 'bus', dim, height = 160, className }: MiniMapProps) {
  const t = useT();
  const [active, setActive] = useState(false);
  const center = useMemo<[number, number]>(() => [stop.lat, stop.lng], [stop.lat, stop.lng]);
  const points = useMemo<[number, number][]>(
    () => [center, ...vehicles.map(v => [v.lat, v.lng] as [number, number])],
    [center, vehicles],
  );

  return (
    <div
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      style={{ height }}
      role="region"
      aria-label={t('map.aria', { n: vehicles.length })}
    >
      <MapContainer
        center={center}
        zoom={15}
        className={styles.map}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        keyboard={false}
        touchZoom={false}
        boxZoom={false}
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <FitView points={points} active={active} />
        <Interaction active={active} />
        <Marker position={center} />
        {vehicles.map(v => {
          const stale = dim || v.freshness === 'stale';
          const dotClass = [styles.dot, stale ? styles.dotStale : styles[`line_${mode}`]].join(' ');
          return (
            // className isn't updated by setStyle, so remount when it changes.
            <CircleMarker
              key={`${v.id}:${dotClass}`}
              center={[v.lat, v.lng]}
              radius={8}
              pathOptions={{ className: dotClass, weight: 2, fillOpacity: 1 }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {t('map.dot_tooltip', {
                  n: Math.max(1, Math.round(v.etaSeconds / 60)),
                  s: Math.round(v.lastSeenSeconds),
                })}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {active ? (
        <button
          type="button"
          className={styles.lock}
          onClick={() => setActive(false)}
          aria-label={t('map.lock')}
        >
          <IconClose size={18} />
        </button>
      ) : (
        // Covers the map while inert so page scroll and taps never reach Leaflet.
        <button
          type="button"
          className={styles.activate}
          onClick={() => setActive(true)}
          aria-label={t('map.activate')}
        />
      )}
    </div>
  );
}
