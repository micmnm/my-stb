import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { SectionHeader } from '../../components/patterns/SectionHeader';
import { AlertBannerStack } from '../../components/patterns/AlertBannerStack';
import { StopRow } from '../../components/molecules/StopRow';
import { RouteBadge } from '../../components/atoms/RouteBadge';
import { Skeleton } from '../../components/atoms/Skeleton';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useNearbyStops } from '../../hooks/useNearbyStops';
import { useStopArrivalPeek } from '../../hooks/useStopArrivalPeek';
import { migrateLegacyFavouritesIfPresent, useSaved } from '../../stores/saved';
import { api } from '../../api/client';
import { modeFromRouteType, type Arrival, type Mode, type ServiceAlert } from '../../types';
import { useT } from '../../i18n/useT';
import './home.css';

function useClock(): string {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatPeekEta(seconds: number): string {
  if (seconds <= 0) return '—';
  if (seconds < 60) return '<1';
  if (seconds < 3600) return String(Math.round(seconds / 60));
  const d = new Date(Date.now() + seconds * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function PeekArrival({ arrival }: { arrival: Arrival }) {
  const mode = modeFromRouteType(arrival.routeType, arrival.shortName);
  const eta = formatPeekEta(arrival.etaSeconds);
  const cls = ['home__peek-eta', !arrival.isLive && 'home__peek-eta--not-live'].filter(Boolean).join(' ');
  return (
    <span className="home__peek-pair">
      <RouteBadge num={arrival.shortName} mode={mode} size="sm" />
      <span className={cls}>{eta}</span>
    </span>
  );
}

export default function HomePage() {
  const t = useT();
  const navigate = useNavigate();
  const clock = useClock();
  const { stops: savedStops, routes: savedRoutes } = useSaved();
  const { position, error: geoError } = useGeolocation();
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);

  // One-time migration from legacy favourites store.
  useEffect(() => {
    void migrateLegacyFavouritesIfPresent(async (lat, lng) => {
      const nearby = await api.getNearbyStops(lat, lng, { limit: 1, maxMeters: 50 }).catch(() => []);
      const closest = nearby[0];
      return closest ? { id: closest.id, name: closest.name } : null;
    });
  }, []);

  const peekIds = useMemo(
    () => savedStops.filter(s => !s.legacy).map(s => s.id),
    [savedStops],
  );
  const { data: peek } = useStopArrivalPeek(peekIds);

  // Fetch all active alerts and intersect with saved IDs.
  useEffect(() => {
    let cancelled = false;
    api.getAlerts({})
      .then(rows => { if (!cancelled) setAlerts(rows); })
      .catch(() => { /* surface alerts only when reachable */ });
    return () => { cancelled = true; };
  }, []);

  const savedStopIdSet = useMemo(() => new Set(peekIds), [peekIds]);
  const savedRouteIdSet = useMemo(() => new Set(savedRoutes.map(r => r.id)), [savedRoutes]);
  const intersectingAlerts = useMemo(
    () => alerts.filter(a =>
      (a.affectedStopIds ?? []).some(id => savedStopIdSet.has(id))
      || (a.affectedRouteIds ?? []).some(id => savedRouteIdSet.has(id))
    ),
    [alerts, savedStopIdSet, savedRouteIdSet],
  );

  // Nearby stops via geolocation.
  const nearbyOpts = useMemo(() => ({ limit: 5, maxMeters: 1500 }), []);
  const { data: nearby, isLoading: nearbyLoading } = useNearbyStops(position, nearbyOpts);
  const locationDenied = !!geoError;

  const hasSaved = savedStops.length > 0 || savedRoutes.length > 0;

  return (
    <ScreenShell>
      <div className="home">
        <div className="home__greeting">
          <h1 className="home__hello">{t('home.greeting')}</h1>
          <span className="home__clock">{clock}</span>
        </div>

        {intersectingAlerts.length > 0 && (
          <div className="home__alert">
            <AlertBannerStack alerts={intersectingAlerts} collapsedLimit={1} />
          </div>
        )}

        <section className="home__section">
          <SectionHeader title={t('home.saved_section')} />
          {!hasSaved ? (
            <div className="home__empty-card">
              <p>{t('home.empty_saved')}</p>
              <button
                type="button"
                className="home__cta"
                onClick={() => navigate('/search?intent=save')}
              >
                {t('saved.add')}
              </button>
            </div>
          ) : (
            <div className="home__list">
              {savedStops.map(item => {
                const peekRows = item.legacy ? [] : peek[item.id]?.soonest ?? [];
                const onTap = () => {
                  if (item.legacy) return;
                  navigate(`/stop/${encodeURIComponent(item.id)}`);
                };
                return (
                  <button
                    key={`stop:${item.id}`}
                    type="button"
                    className="home__saved-row"
                    onClick={onTap}
                  >
                    <span className="home__saved-text">
                      <span className="home__saved-name">{item.nickname ?? item.name ?? item.id}</span>
                      {item.name && item.nickname && item.name !== item.nickname && (
                        <span className="home__saved-sub">{item.name}</span>
                      )}
                    </span>
                    {peekRows.length > 0 && (
                      <span className="home__peek">
                        {peekRows.slice(0, 2).map(a => (
                          <PeekArrival key={a.vehicleId} arrival={a} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
              {savedRoutes.map(item => (
                <button
                  key={`route:${item.id}`}
                  type="button"
                  className="home__saved-row"
                  onClick={() => navigate(`/route/${encodeURIComponent(item.id)}`)}
                >
                  {item.shortName && item.mode && (
                    <RouteBadge num={item.shortName} mode={item.mode} size="md" />
                  )}
                  <span className="home__saved-text">
                    <span className="home__saved-name">{item.nickname ?? item.shortName ?? item.id}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="home__section">
          <SectionHeader title={t('home.nearby_section')} />
          {locationDenied ? (
            <div className="home__perm-card">
              <p>{t('permissions.location_denied')}</p>
              <button
                type="button"
                className="home__cta"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(() => { /* hook reacts via watchPosition */ });
                  }
                }}
              >
                {t('home.enable_location')}
              </button>
            </div>
          ) : (
            <div className="home__list">
              {nearbyLoading && nearby.length === 0 && (
                <>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="home__skeleton-row">
                      <Skeleton w="50%" h="18px" />
                      <Skeleton w="120px" h="22px" />
                    </div>
                  ))}
                </>
              )}
              {nearby.map(stop => {
                const lines = stop.routes.slice(0, 5).map(r => ({
                  num: r.shortName,
                  mode: modeFromRouteType(r.routeType, r.shortName) as Mode,
                }));
                const minutes = Math.max(1, Math.round(stop.walkSeconds / 60));
                return (
                  <StopRow
                    key={stop.id}
                    stop={{ id: stop.id, name: stop.name }}
                    walkChip={{ minutes, meters: stop.distanceMeters }}
                    lines={lines}
                    onTap={() => navigate(`/stop/${encodeURIComponent(stop.id)}`)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </ScreenShell>
  );
}
