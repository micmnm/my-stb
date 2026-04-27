import type { IconProps } from './IconArrow';

export function IconClose({ size = 22, c = 'currentColor', ...rest }: IconProps) {
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
      <path d="m6 6 10 10" />
      <path d="m16 6-10 10" />
    </svg>
  );
}
