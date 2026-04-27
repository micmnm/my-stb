import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ScreenShell } from '../components/layout/ScreenShell';
import { Skeleton } from '../components/atoms/Skeleton';
import '../components/layout/layout.css';

const HomePage = lazy(() => import('../pages/home'));
const SearchPage = lazy(() => import('../pages/search'));
const PlanPage = lazy(() => import('../pages/plan'));
const SavedPage = lazy(() => import('../pages/saved'));
const StopDetailPage = lazy(() => import('../pages/stop-detail'));
const RouteDetailPage = lazy(() => import('../pages/route-detail'));
const LegacyApp = lazy(() => import('../pages/legacy/LegacyApp'));
const DevComponentsPage = lazy(() => import('../pages/dev-components'));

function PageFallback() {
  return (
    <ScreenShell>
      <div style={{ padding: 'var(--s-5) var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }} aria-busy="true">
        <Skeleton w="40%" h="32px" />
        <Skeleton w="60%" h="18px" />
        <Skeleton w="100%" h="56px" r="var(--r-md)" />
        <Skeleton w="100%" h="56px" r="var(--r-md)" />
      </div>
    </ScreenShell>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
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
      </Suspense>
    </BrowserRouter>
  );
}
