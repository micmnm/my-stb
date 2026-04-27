import type { IconProps } from './IconArrow';

export function IconSearch({ size = 22, c = 'currentColor', ...rest }: IconProps) {
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
      <circle cx="10" cy="10" r="6" />
      <path d="m18 18-3.5-3.5" />
    </svg>
  );
}
