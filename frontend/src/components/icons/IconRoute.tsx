import type { IconProps } from './IconArrow';

export function IconRoute({ size = 22, c = 'currentColor', ...rest }: IconProps) {
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
      <circle cx="6" cy="5" r="2" />
      <circle cx="16" cy="17" r="2" />
      <path d="M6 7v3a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4" />
    </svg>
  );
}
