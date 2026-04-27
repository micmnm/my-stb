import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { DevToggles } from './DevToggles';

export interface ScreenShellProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function ScreenShell({ children, showBottomNav = true }: ScreenShellProps) {
  return (
    <div className="screen-shell">
      <main className="screen-shell__main">{children}</main>
      {showBottomNav && <BottomNav />}
      {import.meta.env.DEV && <DevToggles />}
    </div>
  );
}
