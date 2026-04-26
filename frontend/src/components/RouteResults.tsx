import type { RouteOption } from '../types';
import { RouteCard } from './RouteCard';

interface RouteResultsProps {
  routes: RouteOption[];
  loading: boolean;
  onSelect: (route: RouteOption) => void;
}

export function RouteResults({ routes, loading, onSelect }: RouteResultsProps) {
  if (loading) return <div className="route-results-loading">Finding routes...</div>;
  if (routes.length === 0) return null;

  return (
    <div className="route-results">
      <h3>{routes.length} route{routes.length > 1 ? 's' : ''} found</h3>
      {routes.map((r) => (
        <RouteCard key={`${r.routeId}-${r.directionId}`} route={r} onSelect={onSelect} />
      ))}
    </div>
  );
}
