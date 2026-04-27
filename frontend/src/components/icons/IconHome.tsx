import type { IconProps } from './IconArrow';

export function IconHome({ size = 22, c = 'currentColor', filled = false, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill={filled ? c : 'none'}
      stroke={c}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M3 10.5 11 4l8 6.5" />
      <path d="M5 9.5V19h12V9.5" />
    </svg>
  );
}
