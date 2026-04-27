import styles from './RouteBadge.module.css';

export type Mode = 'tram' | 'bus' | 'trolley' | 'm1' | 'm2' | 'm3' | 'm4' | 'm5';
export type RouteBadgeSize = 'sm' | 'md' | 'lg';

export interface RouteBadgeProps {
  num: string;
  mode: Mode;
  size?: RouteBadgeSize;
  className?: string;
  ariaLabel?: string;
}

const modeBg: Record<Mode, string> = {
  tram: 'var(--line-tram)',
  bus: 'var(--line-bus)',
  trolley: 'var(--line-trolley)',
  m1: 'var(--line-metro-m1)',
  m2: 'var(--line-metro-m2)',
  m3: 'var(--line-metro-m3)',
  m4: 'var(--line-metro-m4)',
  m5: 'var(--line-metro-m5)',
};

// m1 (yellow) needs dark text for contrast; the rest are dark backgrounds with cream/white text.
const modeFg: Record<Mode, string> = {
  tram: 'var(--fg-on-red)',
  bus: '#FFFFFF',
  trolley: '#FFFFFF',
  m1: 'var(--tunnel)',
  m2: '#FFFFFF',
  m3: 'var(--fg-on-red)',
  m4: '#FFFFFF',
  m5: '#FFFFFF',
};

export function RouteBadge({ num, mode, size = 'md', className, ariaLabel }: RouteBadgeProps) {
  return (
    <span
      className={[styles.badge, styles[size], className].filter(Boolean).join(' ')}
      style={{ background: modeBg[mode], color: modeFg[mode] }}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
    >
      {num}
    </span>
  );
}
