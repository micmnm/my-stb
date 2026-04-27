import styles from './LiveDot.module.css';

export interface LiveDotProps {
  live: boolean;
  className?: string;
}

export function LiveDot({ live, className }: LiveDotProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.dot, live ? styles.live : styles.stale, className].filter(Boolean).join(' ')}
    />
  );
}
