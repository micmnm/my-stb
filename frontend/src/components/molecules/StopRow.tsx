import { IconLocationDot } from '../icons';
import { RouteBadge, type Mode } from '../atoms/RouteBadge';
import { WalkChip } from '../atoms/WalkChip';
import styles from './StopRow.module.css';

export interface StopRowLine {
  num: string;
  mode: Mode;
}

export interface StopRowProps {
  stop: { id: string; name: string; street?: string };
  walkChip?: { minutes: number; meters: number };
  lines?: StopRowLine[];
  maxLines?: number;
  onTap?: () => void;
  className?: string;
}

export function StopRow({
  stop,
  walkChip,
  lines = [],
  maxLines = 5,
  onTap,
  className,
}: StopRowProps) {
  const visible = lines.slice(0, maxLines);
  const hidden = Math.max(0, lines.length - visible.length);

  return (
    <button
      type="button"
      className={[styles.row, className].filter(Boolean).join(' ')}
      onClick={onTap}
    >
      <span className={styles.icon}><IconLocationDot size={20} /></span>
      <span className={styles.text}>
        <span className={styles.name}>{stop.name}</span>
        {stop.street && <span className={styles.street}>{stop.street}</span>}
      </span>
      <span className={styles.right}>
        {walkChip && <WalkChip minutes={walkChip.minutes} meters={walkChip.meters} />}
        {visible.length > 0 && (
          <span className={styles.lines}>
            {visible.map(line => (
              <RouteBadge key={`${line.mode}-${line.num}`} num={line.num} mode={line.mode} size="sm" />
            ))}
            {hidden > 0 && <span className={styles.morePill}>+{hidden}</span>}
          </span>
        )}
      </span>
    </button>
  );
}
