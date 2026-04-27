import type { IconProps } from './IconArrow';

export function IconLocationDot({ size = 22, c = 'currentColor', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      stroke={c}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M11 20s-6-5.5-6-11a6 6 0 1 1 12 0c0 5.5-6 11-6 11Z" />
      <circle cx="11" cy="9" r="2" fill={c} stroke="none" />
    </svg>
  );
}
