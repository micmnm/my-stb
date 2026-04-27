import { Fragment } from 'react';
import { useT } from '../../i18n/useT';
import type { SchematicStopDto, VehicleDto } from '../../types';
import styles from './Schematic.module.css';

export interface SchematicProps {
  stops: SchematicStopDto[];
  vehicles?: VehicleDto[];
  vehicleColor?: string;
  yourStopId?: string;
  stale?: boolean;
  onStopTap?: (stopId: string) => void;
  className?: string;
}

interface VehicleByPrevIdx {
  /** Map from "previous stop index" → vehicles whose marker should appear after that stop. */
  buckets: Map<number, VehicleDto[]>;
  /** Vehicles before stop 0 (vehicle at terminus, hasn't left yet). */
  preTerminus: VehicleDto[];
}

function bucketVehicles(vehicles: VehicleDto[], stops: SchematicStopDto[]): VehicleByPrevIdx {
  const indexById = new Map<string, number>();
  stops.forEach((s, i) => indexById.set(s.id, i));

  const buckets = new Map<number, VehicleDto[]>();
  const preTerminus: VehicleDto[] = [];

  for (const v of vehicles) {
    if (!v.nextStopId) continue;
    const nextIdx = indexById.get(v.nextStopId);
    if (nextIdx === undefined) continue;
    if (nextIdx === 0) {
      preTerminus.push(v);
    } else {
      const prevIdx = nextIdx - 1;
      const arr = buckets.get(prevIdx) ?? [];
      arr.push(v);
      buckets.set(prevIdx, arr);
    }
  }
  return { buckets, preTerminus };
}

function formatEtaShort(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '';
  if (seconds <= 0) return '·';
  if (seconds < 60) return '<1m';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export function Schematic({
  stops,
  vehicles = [],
  vehicleColor = 'var(--stb-red)',
  yourStopId,
  stale,
  onStopTap,
  className,
}: SchematicProps) {
  const t = useT();
  const { buckets, preTerminus } = bucketVehicles(vehicles, stops);

  // Find soonest vehicle for "next" badge.
  const sorted = [...vehicles]
    .filter(v => v.nextStopEtaSeconds !== null && v.nextStopEtaSeconds !== undefined)
    .sort((a, b) => (a.nextStopEtaSeconds ?? Infinity) - (b.nextStopEtaSeconds ?? Infinity));
  const soonestId = sorted[0]?.id;

  const renderVehicle = (v: VehicleDto) => (
    <div
      key={v.id}
      className={[styles.vehicleRow, stale || !v.isLive ? styles.staleVehicle : ''].filter(Boolean).join(' ')}
    >
      <span className={styles.vehicleMarkerWrap}>
        <span className={styles.vehicleMarker} style={{ background: vehicleColor }} aria-hidden="true" />
      </span>
      <span
        className={[styles.vehiclePill, v.id === soonestId ? styles.vehiclePillNext : ''].filter(Boolean).join(' ')}
      >
        {formatEtaShort(v.nextStopEtaSeconds)}
        {v.id === soonestId && <span> · {t('stop_detail.live')}</span>}
      </span>
    </div>
  );

  return (
    <div className={[styles.rail, className].filter(Boolean).join(' ')}>
      <div className={[styles.line, stale ? styles.lineDim : ''].filter(Boolean).join(' ')} aria-hidden="true" />
      {preTerminus.map(renderVehicle)}
      {stops.map((stop, i) => {
        const you = stop.id === yourStopId;
        const dotClass = [styles.dot, you && styles.dotYou].filter(Boolean).join(' ');
        const sub = stop.isTerminus ? t('route_detail.terminus') : you ? t('route_detail.your_stop') : undefined;
        return (
          <Fragment key={`${stop.id}-${stop.sequence}`}>
            <button
              type="button"
              className={styles.row}
              onClick={onStopTap ? () => onStopTap(stop.id) : undefined}
            >
              <span className={styles.dotWrap}>
                <span className={dotClass} />
              </span>
              <span className={styles.text}>
                <span className={[styles.name, you && styles.nameYou].filter(Boolean).join(' ')}>{stop.name}</span>
                {sub && <span className={styles.sub}>{sub}</span>}
              </span>
              {stop.etaSeconds !== null && stop.etaSeconds !== undefined && (
                <span className={styles.eta}>{formatEtaShort(stop.etaSeconds)}</span>
              )}
            </button>
            {(buckets.get(i) ?? []).map(renderVehicle)}
          </Fragment>
        );
      })}
    </div>
  );
}
