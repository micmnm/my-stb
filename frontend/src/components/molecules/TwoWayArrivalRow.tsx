import { LiveDot } from '../atoms/LiveDot';
import { RouteBadge, type Mode } from '../atoms/RouteBadge';
import styles from './TwoWayArrivalRow.module.css';

export interface DirectionEta {
  to: string;
  etaSeconds: number;
  isLive: boolean;
}

export interface TwoWayArrivalRowProps {
  route: { num: string; mode: Mode };
  directionA: DirectionEta | null;
  directionB: DirectionEta | null;
  expanded?: boolean;
  stale?: boolean;
  onTap?: () => void;
  className?: string;
}

interface FormattedEta {
  primary: string;
  unit?: string;
}

function formatEta(seconds: number): FormattedEta {
  if (seconds <= 0) return { primary: '—' };
  if (seconds < 60) return { primary: '<1', unit: 'min' };
  if (seconds < 3600) return { primary: String(Math.round(seconds / 60)), unit: 'min' };
  const date = new Date(Date.now() + seconds * 1000);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return { primary: `${hh}:${mm}` };
}

function DirectionCell({ dir, stale }: { dir: DirectionEta | null; stale?: boolean }) {
  if (!dir) {
    return (
      <span className={styles.dir}>
        <span className={styles.dirHeader}>—</span>
        <span className={styles.terminus}>—</span>
      </span>
    );
  }
  const eta = formatEta(dir.etaSeconds);
  const etaClass = [
    styles.eta,
    !dir.isLive && styles.etaNotLive,
    stale && styles.etaStale,
  ].filter(Boolean).join(' ');
  return (
    <span className={styles.dir}>
      <span className={styles.dirHeader}>
        <LiveDot live={dir.isLive && !stale} />
        <span className={styles.dirTo}>{dir.to}</span>
      </span>
      <span className={etaClass}>
        <span className="numeric-display">{eta.primary}</span>
        {eta.unit && <span className={styles.etaUnit}>{eta.unit}</span>}
      </span>
    </span>
  );
}

export function TwoWayArrivalRow({
  route,
  directionA,
  directionB,
  expanded,
  stale,
  onTap,
  className,
}: TwoWayArrivalRowProps) {
  return (
    <button
      type="button"
      className={[styles.row, expanded && styles.expanded, className].filter(Boolean).join(' ')}
      onClick={onTap}
      aria-expanded={expanded}
    >
      <span className={styles.badge}>
        <RouteBadge num={route.num} mode={route.mode} size="md" />
      </span>
      <span className={styles.dirGroup}>
        <DirectionCell dir={directionA} stale={stale} />
        <span className={styles.divider} aria-hidden="true" />
        <DirectionCell dir={directionB} stale={stale} />
      </span>
    </button>
  );
}
