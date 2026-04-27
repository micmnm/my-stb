import type { ReactNode } from 'react';
import styles from './SchematicRail.module.css';

export interface VehicleMarker {
  vehicleId: string;
  betweenStopIndex: number;
  progress: number;
  label: string;
}

export interface SchematicRailProps {
  children: ReactNode;
  vehicles?: VehicleMarker[];
  className?: string;
}

export function SchematicRail({ children, className }: SchematicRailProps) {
  return (
    <div className={[styles.rail, className].filter(Boolean).join(' ')}>
      <div className={styles.line} aria-hidden="true" />
      {children}
    </div>
  );
}
