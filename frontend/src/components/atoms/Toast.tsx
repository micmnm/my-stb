import { useEffect } from 'react';
import { IconClose } from '../icons';
import styles from './Toast.module.css';

export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  actionLabel,
  onAction,
  onDismiss,
  durationMs = 5000,
}: ToastProps) {
  useEffect(() => {
    if (!onDismiss || durationMs <= 0) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div className={styles.host} role="status" aria-live="polite">
      <div className={styles.toast}>
        <span className={styles.message}>{message}</span>
        {actionLabel && onAction && (
          <button type="button" className={styles.action} onClick={onAction}>
            {actionLabel}
          </button>
        )}
        {onDismiss && (
          <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
            <IconClose size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
