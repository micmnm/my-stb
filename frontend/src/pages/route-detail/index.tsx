import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { SectionHeader } from '../../components/patterns/SectionHeader';
import { AlertBannerStack } from '../../components/patterns/AlertBannerStack';
import { AlertBanner } from '../../components/atoms/AlertBanner';
import { RouteBadge } from '../../components/atoms/RouteBadge';
import { ReversePill } from '../../components/atoms/ReversePill';
import { Skeleton } from '../../components/atoms/Skeleton';
import { Toast } from '../../components/atoms/Toast';
import { Chevron, IconBookmark } from '../../components/icons';
import { Schematic } from '../../components/molecules/Schematic';
import { useRouteDetail } from '../../hooks/useRouteDetail';
import { useT } from '../../i18n/useT';
import { useSaved } from '../../stores/saved';
import type { Direction } from '../../types';
import './routeDetail.css';

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function plural(t: ReturnType<typeof useT>, base: string, n: number): string {
  return n === 1 ? t(`${base}_one`) : t(`${base}_other`, { n });
}

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const t = useT();
  const { isSaved, add: addSaved, remove: removeSaved } = useSaved();
  const bookmarked = id ? isSaved('route', id) : false;
  const [toast, setToast] = useState<{ message: string } | null>(null);

  const direction: Direction = searchParams.get('dir') === 'b' ? 'b' : 'a';
  const { data, isLoading, isStale, error, refetch } = useRouteDetail(id, direction);

  const flipDirection = useCallback(() => {
    const next: Direction = direction === 'a' ? 'b' : 'a';
    setSearchParams(p => {
      const np = new URLSearchParams(p);
      np.set('dir', next);
      return np;
    });
  }, [direction, setSearchParams]);

  useEffect(() => {
    refetch();
  }, [direction, refetch]);

  const onBookmark = () => {
    if (!id) return;
    if (bookmarked) {
      removeSaved('route', id);
      setToast({ message: t('saved.removed', { name: data?.route.shortName ?? id }) });
    } else if (data) {
      addSaved({
        kind: 'route',
        id,
        shortName: data.route.shortName,
        mode: data.route.mode,
      });
      setToast({ message: t('saved.added', { name: data.route.shortName }) });
    }
  };

  const headsignTo =
    data?.direction === 'b' ? data?.terminusA?.name : data?.terminusB?.name;

  const stopsCount = data?.stops.length ?? 0;
  const vehicleCount = data?.vehicles.length ?? 0;
  const stopsLabel = plural(t, 'route_detail.stops_count', stopsCount);
  const vehiclesLabel = plural(t, 'route_detail.vehicles_count', vehicleCount);
  const sectionTitle = data
    ? `${stopsLabel} · ${vehiclesLabel}`
    : t('stop_detail.arrivals');

  const noVehicles = !!data && data.vehicles.length === 0;

  return (
    <ScreenShell>
      <div className="route-detail">
        <header className="route-detail__header">
          <div className="route-detail__icon-row">
            <button
              type="button"
              className="route-detail__icon-btn"
              onClick={() => navigate(-1)}
              aria-label={t('route_detail.back')}
            >
              <Chevron dir="left" size={22} />
            </button>
            <button
              type="button"
              className="route-detail__icon-btn"
              onClick={onBookmark}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? t('route_detail.bookmark_remove') : t('route_detail.bookmark_add')}
            >
              <IconBookmark size={22} filled={bookmarked} c={bookmarked ? 'var(--stb-red)' : 'currentColor'} />
            </button>
          </div>

          <div className="route-detail__title-row">
            {data ? (
              <RouteBadge num={data.route.shortName} mode={data.route.mode} size="lg" />
            ) : (
              <Skeleton w="60px" h="36px" r="var(--r-md)" />
            )}
            <div className="route-detail__title-text">
              <h1 className="route-detail__title">
                {data ? data.route.longName || data.route.shortName : <Skeleton w="120px" h="24px" />}
              </h1>
              {headsignTo && (
                <span className="route-detail__headsign">→ {headsignTo}</span>
              )}
            </div>
          </div>
        </header>

        {data && data.alerts.length > 0 && (
          <div className="route-detail__alerts">
            <AlertBannerStack alerts={data.alerts} />
          </div>
        )}

        {error && (
          <div className="route-detail__alerts">
            <AlertBanner severity="critical" title={t('errors.feed_down')} body={t('errors.offline')} />
          </div>
        )}

        {noVehicles && !error && (
          <div className="route-detail__alerts">
            <AlertBanner severity="info" title={t('route_detail.no_active_vehicles')} />
          </div>
        )}

        <SectionHeader
          title={sectionTitle}
          live={!!data && !isStale && data.vehicles.length > 0}
          serverTime={
            data
              ? isStale
                ? t('route_detail.last_update', { time: formatClock(data.serverTime) })
                : formatClock(data.serverTime)
              : undefined
          }
          rightSlot={data ? <ReversePill onClick={flipDirection} /> : null}
        />

        <div className="route-detail__schematic">
          {isLoading && !data && (
            <div style={{ padding: 'var(--s-3) var(--s-4)' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }}>
                  <Skeleton w="14px" h="14px" r="50%" />
                  <Skeleton w="60%" h="16px" />
                </div>
              ))}
            </div>
          )}

          {data && (
            <Schematic
              stops={data.stops}
              vehicles={data.vehicles}
              vehicleColor={`var(--line-${data.route.mode})`}
              stale={isStale}
              onStopTap={stopId => navigate(`/stop/${encodeURIComponent(stopId)}`)}
            />
          )}
        </div>

        {toast && (
          <Toast message={toast.message} onDismiss={() => setToast(null)} durationMs={3000} />
        )}
      </div>
    </ScreenShell>
  );
}
