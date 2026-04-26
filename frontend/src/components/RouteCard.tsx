import type { RouteOption } from '../types';
import { routeTypeLabel } from '../types';

interface RouteCardProps {
  route: RouteOption;
  onSelect: (route: RouteOption) => void;
}

const typeColors: Record<string, string> = {
  bus: '#3498db',
  tram: '#e74c3c',
  trolley: '#2ecc71',
  metro: '#f39c12',
};

export function RouteCard({ route, onSelect }: RouteCardProps) {
  const label = routeTypeLabel(route.routeType);
  const color = typeColors[label] || '#3498db';

  return (
    <div className="route-card" onClick={() => onSelect(route)}>
      <div className="route-card-badge" style={{ background: color }}>
        <span className="route-card-line">{route.shortName}</span>
        <span className="route-card-type">{label}</span>
      </div>
      <div className="route-card-info">
        <div className="route-card-direction">{route.direction}</div>
        <div className="route-card-details">
          <span>{route.originStopName} &rarr; {route.destStopName}</span>
          <span>{route.stopCount} stops</span>
        </div>
        <div className="route-card-meta">
          <span>Walk {route.originStopDistance}m to stop</span>
          {route.lastMileDistance > 0 && <span> · {route.lastMileDistance}m to destination</span>}
          {route.estimatedMinutes && <span> · ~{route.estimatedMinutes} min</span>}
        </div>
      </div>
    </div>
  );
}
