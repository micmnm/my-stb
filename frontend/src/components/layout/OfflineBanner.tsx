import { useOnline } from '../../hooks/useOnline';
import { useT } from '../../i18n/useT';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const online = useOnline();
  const t = useT();
  if (online) return null;
  return (
    <div role="status" aria-live="polite" className={styles.banner}>
      {t('errors.offline')}
    </div>
  );
}
