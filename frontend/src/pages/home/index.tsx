import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { SectionHeader } from '../../components/patterns/SectionHeader';
import { AlertBannerStack } from '../../components/patterns/AlertBannerStack';
import { StopRow } from '../../components/molecules/StopRow';
import { RouteBadge } from '../../components/atoms/RouteBadge';
import { Skeleton } from '../../components/atoms/Skeleton';
import { useFavourites } from '../../hooks/useFavourites';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useNearbyStops } from '../../hooks/useNearbyStops';
import { useStopArrivalPeek } from '../../hooks/useStopArrivalPeek';
import { api } from '../../api/client';
import { modeFromRouteType, type Arrival, type Mode, type ServiceAlert } from '../../types';
import { useT } from '../../i18n/useT';
import './home.css';

interface ResolvedFav {
  favId: string;
  nickname: string;
  stopId: string | null;
  stopName: string | null;
}

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
  const { favourites } = useFavourites();
  const { position, error: geoError } = useGeolocation();

  const [resolvedFavs, setResolvedFavs] = useState<ResolvedFav[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);

  // Resolve each favourite to its closest known stop (so peek API can work).
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const out: ResolvedFav[] = await Promise.all(
        favourites.map(async f => {
          try {
            const nearby = await api.getNearbyStops(f.lat, f.lng, { limit: 1, maxMeters: 80 });
            const closest = nearby[0];
            return {
              favId: f.id,
              nickname: f.name,
              stopId: closest?.id ?? null,
              stopName: closest?.name ?? null,
            };
          } catch {
            return { favId: f.id, nickname: f.name, stopId: null, stopName: null };
          }
        }),
      );
      if (!cancelled) setResolvedFavs(out);
    };
    resolve();
    return () => { cancelled = true; };
  }, [favourites]);

  const peekIds = useMemo(
    () => resolvedFavs.map(r => r.stopId).filter((id): id is string => !!id),
    [resolvedFavs],
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
  const intersectingAlerts = useMemo(
    () => alerts.filter(a =>
      (a.affectedStopIds ?? []).some(id => savedStopIdSet.has(id))
      // Saved routes intersection arrives in Phase 6 with the proper SavedItem store.
    ),
    [alerts, savedStopIdSet],
  );

  // Nearby stops via geolocation.
  const nearbyOpts = useMemo(() => ({ limit: 5, maxMeters: 1500 }), []);
  const { data: nearby, isLoading: nearbyLoading } = useNearbyStops(position, nearbyOpts);
  const locationDenied = !!geoError;

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
          {favourites.length === 0 ? (
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
              {resolvedFavs.length === 0 && favourites.length > 0 && (
                <>
                  {favourites.map(f => (
                    <div key={f.id} className="home__skeleton-row">
                      <Skeleton w="40%" h="18px" />
                      <Skeleton w="80px" h="14px" />
                    </div>
                  ))}
                </>
              )}
              {resolvedFavs.map(r => {
                const peekRows = r.stopId ? peek[r.stopId]?.soonest ?? [] : [];
                return (
                  <button
                    key={r.favId}
                    type="button"
                    className="home__saved-row"
                    onClick={() => r.stopId ? navigate(`/stop/${encodeURIComponent(r.stopId)}`) : navigate('/legacy')}
                  >
                    <span className="home__saved-text">
                      <span className="home__saved-name">{r.nickname}</span>
                      {r.stopName && <span className="home__saved-sub">{r.stopName}</span>}
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
                  // Re-trigger the prompt by calling getCurrentPosition.
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
