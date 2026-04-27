import type { ReactNode } from 'react';
import { Chevron, IconClose } from '../icons';
import { useT } from '../../i18n/useT';
import styles from './AlertBanner.module.css';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertBannerProps {
  title: string;
  body?: ReactNode;
  severity?: AlertSeverity;
  actionHref?: string;
  onDismiss?: () => void;
  className?: string;
}

export function AlertBanner({
  title,
  body,
  severity = 'warning',
  actionHref,
  onDismiss,
  className,
}: AlertBannerProps) {
  const t = useT();
  const role = severity === 'critical' ? 'alert' : 'status';
  const wrapperClass = [styles.banner, styles[severity], className].filter(Boolean).join(' ');
  const chipClass = [styles.chip, styles[`chip${severity[0].toUpperCase()}${severity.slice(1)}`]].join(' ');

  const content = (
    <>
      <span className={chipClass} aria-hidden="true">!</span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {body && <span className={styles.bodyText}>{body}</span>}
      </span>
      {actionHref && (
        <span className={styles.action} aria-hidden="true">
          <Chevron size={20} />
        </span>
      )}
      {!actionHref && onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label={t('errors.retry')}
        >
          <IconClose size={20} />
        </button>
      )}
    </>
  );

  if (actionHref) {
    return (
      <a href={actionHref} role={role} className={wrapperClass}>
        {content}
      </a>
    );
  }

  return (
    <div role={role} className={wrapperClass}>
      {content}
    </div>
  );
}
