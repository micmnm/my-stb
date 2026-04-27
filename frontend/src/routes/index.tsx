import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '../pages/home';
import SearchPage from '../pages/search';
import PlanPage from '../pages/plan';
import SavedPage from '../pages/saved';
import StopDetailPage from '../pages/stop-detail';
import RouteDetailPage from '../pages/route-detail';
import LegacyApp from '../pages/legacy/LegacyApp';
import DevComponentsPage from '../pages/dev-components';
import '../components/layout/layout.css';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/stop/:id" element={<StopDetailPage />} />
        <Route path="/route/:id" element={<RouteDetailPage />} />
        <Route path="/legacy" element={<LegacyApp />} />
        {import.meta.env.DEV && (
          <Route path="/dev/components" element={<DevComponentsPage />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
