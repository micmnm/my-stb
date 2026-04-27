import type { IconProps } from './IconArrow';

export function IconSwap({ size = 22, c = 'currentColor', ...rest }: IconProps) {
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
      <path d="M5 7h12" />
      <path d="m13 3 4 4-4 4" />
      <path d="M17 15H5" />
      <path d="m9 19-4-4 4-4" />
    </svg>
  );
}
