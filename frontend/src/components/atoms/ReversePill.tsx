import { IconSwap } from '../icons';
import { useT } from '../../i18n/useT';
import styles from './ReversePill.module.css';

export interface ReversePillProps {
  onClick: () => void;
  className?: string;
}

export function ReversePill({ onClick, className }: ReversePillProps) {
  const t = useT();
  return (
    <button
      type="button"
      className={[styles.pill, className].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={t('route_detail.reverse')}
    >
      <IconSwap size={16} />
      <span>{t('route_detail.reverse')}</span>
    </button>
  );
}
