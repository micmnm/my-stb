import { useNavigate } from 'react-router-dom';
import { Chevron } from '../icons';
import { MiniMap } from './MiniMap';
import { useT } from '../../i18n/useT';
import type { Arrival } from '../../types';
import styles from './ExpandedArrivalCard.module.css';

export interface ExpandedArrivalCardProps {
  routeId: string;
  direction: 'a' | 'b';
  stop: { lat: number; lng: number };
  nextArrivals: Arrival[];
  vehiclePosition?: { lat: number; lng: number };
  className?: string;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return '<1 min';
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const date = new Date(Date.now() + seconds * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function ExpandedArrivalCard({
  routeId,
  direction,
  stop,
  nextArrivals,
  vehiclePosition,
  className,
}: ExpandedArrivalCardProps) {
  const t = useT();
  const navigate = useNavigate();

  const onSeeLine = () => {
    navigate(`/route/${encodeURIComponent(routeId)}?dir=${direction}`);
  };

  const following = nextArrivals.slice(0, 3);

  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        onClick={onSeeLine}
        style={{ all: 'unset', cursor: 'pointer' }}
        aria-label={t('stop_detail.see_line')}
      >
        <MiniMap stop={stop} vehicle={vehiclePosition} />
      </button>

      <h5 className={styles.followingHeader}>{t('stop_detail.following')}</h5>
      <div className={styles.followingList}>
        {following.length === 0 && (
          <span className={styles.followingDest}>{t('stop_detail.no_arrivals')}</span>
        )}
        {following.map(arrival => (
          <div key={arrival.vehicleId} className={styles.followingRow}>
            <span className={styles.followingDest}>→ {arrival.destinationName}</span>
            <span className={styles.followingEta}>{formatEta(arrival.etaSeconds)}</span>
          </div>
        ))}
      </div>

      <button type="button" className={styles.cta} onClick={onSeeLine}>
        <span>{t('stop_detail.see_line')}</span>
        <Chevron size={20} />
      </button>
    </div>
  );
}
