import type { IconProps } from './IconArrow';

export function IconWalk({ size = 22, c = 'currentColor', ...rest }: IconProps) {
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
      <circle cx="13" cy="4.25" r="1.5" />
      <path d="m6 20 3-6 2 1.5L9 20" />
      <path d="M11 15.5 9.5 11l3-3 2.5 3.5h2.5" />
      <path d="M5 13.5 7.5 9l3-1" />
    </svg>
  );
}
