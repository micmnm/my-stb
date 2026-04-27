import { IconWalk } from '../icons';
import { useT } from '../../i18n/useT';
import styles from './WalkChip.module.css';

export interface WalkChipProps {
  minutes: number;
  meters: number;
  className?: string;
}

export function WalkChip({ minutes, meters, className }: WalkChipProps) {
  const t = useT();
  if (minutes > 12) return null;
  return (
    <span className={[styles.chip, className].filter(Boolean).join(' ')}>
      <span className={styles.icon}><IconWalk size={14} /></span>
      <span>{t('stop_detail.walk_chip', { m: minutes, d: meters })}</span>
    </span>
  );
}
