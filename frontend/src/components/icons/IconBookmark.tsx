import type { IconProps } from './IconArrow';

export function IconBookmark({ size = 22, c = 'currentColor', filled = false, ...rest }: IconProps & { filled?: boolean }) {
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
      <path d="M5 3.5h12v15.5l-6-4-6 4z" />
    </svg>
  );
}
