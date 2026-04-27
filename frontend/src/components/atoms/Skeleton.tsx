import styles from './Skeleton.module.css';

export interface SkeletonProps {
  w?: string;
  h?: string;
  r?: string;
  className?: string;
}

export function Skeleton({ w = '100%', h = '12px', r, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      style={{ width: w, height: h, borderRadius: r }}
    />
  );
}
