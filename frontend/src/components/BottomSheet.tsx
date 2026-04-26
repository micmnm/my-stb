import type { ReactNode } from 'react';

interface BottomSheetProps {
  children: ReactNode;
}

export function BottomSheet({ children }: BottomSheetProps) {
  return (
    <div className="bottom-sheet">
      <div className="bottom-sheet-handle" />
      <div className="bottom-sheet-content">
        {children}
      </div>
    </div>
  );
}
