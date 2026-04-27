import type { ReactNode } from 'react';
import { LiveDot } from '../atoms/LiveDot';
import { useT } from '../../i18n/useT';
import styles from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: string;
  live?: boolean;
  serverTime?: string;
  rightSlot?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, live, serverTime, rightSlot, className }: SectionHeaderProps) {
  const t = useT();
  return (
    <div className={[styles.header, className].filter(Boolean).join(' ')}>
      <h4 className={styles.title}>{title}</h4>
      {live !== undefined && (
        <span className={styles.live}>
          <LiveDot live={live} />
          {serverTime && (
            <span className={styles.timestamp}>
              {t('stop_detail.live')} · {serverTime}
            </span>
          )}
        </span>
      )}
      {rightSlot && <span className={styles.right}>{rightSlot}</span>}
    </div>
  );
}
