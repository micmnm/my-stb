import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chevron } from '../icons';
import { MiniMap } from './MiniMap';
import { useT } from '../../i18n/useT';
import { approxEta, lastSeen } from '../../i18n/eta';
import type { Arrival, Mode } from '../../types';
import styles from './ExpandedArrivalCard.module.css';

export interface ExpandedArrivalCardProps {
  routeId: string;
  direction: 'a' | 'b';
  mode: Mode;
  stop: { lat: number; lng: number };
  /** Every approaching arrival on this route and direction, live first. */
  nextArrivals: Arrival[];
  /** Feed is down: grey every ETA and dot. */
  feedDown?: boolean;
  className?: string;
}

export function ExpandedArrivalCard({
  routeId,
  direction,
  mode,
  stop,
  nextArrivals,
  feedDown,
  className,
}: ExpandedArrivalCardProps) {
  const t = useT();
  const navigate = useNavigate();

  const onSeeLine = () => {
    navigate(`/route/${encodeURIComponent(routeId)}?dir=${direction}`);
  };

  const vehicles = useMemo(
    () => nextArrivals.map(a => ({
      id: a.vehicleId,
      lat: a.lat,
      lng: a.lng,
      etaSeconds: a.etaSeconds,
      lastSeenSeconds: a.lastSeenSeconds,
      freshness: a.freshness,
    })),
    [nextArrivals],
  );

  const following = nextArrivals.slice(0, 3);

  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      <MiniMap stop={stop} vehicles={vehicles} mode={mode} dim={feedDown} />

      <h5 className={styles.followingHeader}>{t('stop_detail.following')}</h5>
      <div className={styles.followingList}>
        {following.length === 0 && (
          <span className={styles.followingDest}>{t('stop_detail.no_arrivals')}</span>
        )}
        {following.map(arrival => {
          const stale = arrival.freshness === 'stale';
          const label = stale ? lastSeen(t, arrival.lastSeenSeconds) : approxEta(t, arrival.etaSeconds);
          const etaClass = [styles.followingEta, (stale || feedDown) && styles.followingEtaStale]
            .filter(Boolean).join(' ');
          return (
            <div key={arrival.vehicleId} className={styles.followingRow}>
              <span className={styles.followingDest}>→ {arrival.destinationName}</span>
              <span className={etaClass}>
                <span aria-hidden="true">{label.text}</span>
                <span className={styles.srOnly}>{label.aria}</span>
              </span>
            </div>
          );
        })}
      </div>

      <button type="button" className={styles.cta} onClick={onSeeLine}>
        <span>{t('stop_detail.see_line')}</span>
        <Chevron size={20} />
      </button>
    </div>
  );
}
