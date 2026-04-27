import { useState } from 'react';
import { AlertBanner } from '../atoms/AlertBanner';
import { useT } from '../../i18n/useT';
import type { ServiceAlert } from '../../types';
import styles from './AlertBannerStack.module.css';

export interface AlertBannerStackProps {
  alerts: ServiceAlert[];
  collapsedLimit?: number;
  className?: string;
}

const SEVERITY_RANK: Record<string, number> = { critical: 3, warning: 2, info: 1 };

function sortAlerts(alerts: ServiceAlert[]): ServiceAlert[] {
  return [...alerts].sort((a, b) => {
    const sa = SEVERITY_RANK[a.severity] ?? 0;
    const sb = SEVERITY_RANK[b.severity] ?? 0;
    if (sa !== sb) return sb - sa;
    const ta = a.startsAt ? new Date(a.startsAt).getTime() : 0;
    const tb = b.startsAt ? new Date(b.startsAt).getTime() : 0;
    return tb - ta;
  });
}

export function AlertBannerStack({ alerts, collapsedLimit = 2, className }: AlertBannerStackProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  if (alerts.length === 0) return null;

  const sorted = sortAlerts(alerts);
  const visible = expanded || sorted.length <= collapsedLimit + 1
    ? sorted
    : sorted.slice(0, collapsedLimit);
  const hidden = sorted.length - visible.length;

  return (
    <div className={[styles.stack, className].filter(Boolean).join(' ')}>
      {visible.map(alert => (
        <AlertBanner
          key={alert.id}
          severity={alert.severity}
          title={alert.title}
          body={alert.body}
          actionHref={alert.url ?? undefined}
        />
      ))}
      {hidden > 0 && (
        <button type="button" className={styles.expand} onClick={() => setExpanded(true)}>
          {t('alert.more', { n: hidden })}
        </button>
      )}
    </div>
  );
}
