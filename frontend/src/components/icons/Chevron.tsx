import type { IconProps } from './IconArrow';

type Direction = 'right' | 'left' | 'up' | 'down';

export function Chevron({ size = 22, c = 'currentColor', dir = 'right', ...rest }: IconProps & { dir?: Direction }) {
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[dir];
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
      style={{ transform: `rotate(${rotation}deg)` }}
      {...rest}
    >
      <path d="m8 5 6 6-6 6" />
    </svg>
  );
}
