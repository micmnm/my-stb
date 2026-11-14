import { LiveDot } from '../atoms/LiveDot';
import { RouteBadge, type Mode } from '../atoms/RouteBadge';
import { useT } from '../../i18n/useT';
import { approxEta, lastSeen } from '../../i18n/eta';
import type { Freshness } from '../../types';
import styles from './TwoWayArrivalRow.module.css';

export interface DirectionEta {
  to: string;
  etaSeconds: number;
  isLive: boolean;
  freshness?: Freshness;
  lastSeenSeconds?: number;
}

export interface TwoWayArrivalRowProps {
  route: { num: string; mode: Mode };
  directionA: DirectionEta | null;
  directionB: DirectionEta | null;
  expanded?: boolean;
  /** Feed is down: grey every ETA. */
  stale?: boolean;
  onTap?: () => void;
  className?: string;
}

function DirectionCell({ dir, stale }: { dir: DirectionEta | null; stale?: boolean }) {
  const t = useT();
  if (!dir) {
    return (
      <span className={styles.dir}>
        <span className={styles.dirHeader}>—</span>
        <span className={styles.terminus}>—</span>
      </span>
    );
  }
  const vehicleStale = dir.freshness === 'stale';
  const etaClass = [
    styles.eta,
    !dir.isLive && styles.etaNotLive,
    (stale || vehicleStale) && styles.etaStale,
  ].filter(Boolean).join(' ');

  // aria-label is ignored on plain spans, so the spoken form goes in an sr-only twin.
  let value;
  if (vehicleStale) {
    const seen = lastSeen(t, dir.lastSeenSeconds ?? 0);
    value = (
      <span className={[styles.lastSeen, styles.etaStale].join(' ')}>
        <span aria-hidden="true">{seen.text}</span>
        <span className={styles.srOnly}>{seen.aria}</span>
      </span>
    );
  } else {
    const eta = approxEta(t, dir.etaSeconds);
    value = (
      <span className={etaClass}>
        <span className="numeric-display" aria-hidden="true">~{eta.n}</span>
        <span className={styles.etaUnit} aria-hidden="true">{t('eta.min_unit')}</span>
        <span className={styles.srOnly}>{eta.aria}</span>
      </span>
    );
  }

  return (
    <span className={styles.dir}>
      <span className={styles.dirHeader}>
        <LiveDot live={dir.isLive && !vehicleStale && !stale} />
        <span className={styles.dirTo}>{dir.to}</span>
      </span>
      {value}
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
