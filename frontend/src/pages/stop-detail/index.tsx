import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { SectionHeader } from '../../components/patterns/SectionHeader';
import { TwoWayArrivalRow, type DirectionEta } from '../../components/molecules/TwoWayArrivalRow';
import { ExpandedArrivalCard } from '../../components/molecules/ExpandedArrivalCard';
import { AlertBanner } from '../../components/atoms/AlertBanner';
import { Skeleton } from '../../components/atoms/Skeleton';
import { WalkChip } from '../../components/atoms/WalkChip';
import { Chevron, IconBookmark, IconShare } from '../../components/icons';
import { Toast } from '../../components/atoms/Toast';
import { useStopArrivals } from '../../hooks/useStopArrivals';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useT } from '../../i18n/useT';
import { useSaved } from '../../stores/saved';
import { api } from '../../api/client';
import { modeFromRouteType, type Arrival, type StopDetail } from '../../types';
import './stopDetail.css';

interface RouteGroup {
  routeId: string;
  shortName: string;
  routeType: number;
  directionA: { soonest: Arrival; following: Arrival[] } | null;
  directionB: { soonest: Arrival; following: Arrival[] } | null;
  minEta: number;
}

function groupArrivals(arrivals: Arrival[]): RouteGroup[] {
  const map = new Map<string, RouteGroup>();
  for (const a of arrivals) {
    let group = map.get(a.routeId);
    if (!group) {
      group = {
        routeId: a.routeId,
        shortName: a.shortName,
        routeType: a.routeType,
        directionA: null,
        directionB: null,
        minEta: Number.POSITIVE_INFINITY,
      };
      map.set(a.routeId, group);
    }
    const slot = a.direction === 'a' ? 'directionA' : 'directionB';
    if (group[slot] === null) {
      group[slot] = { soonest: a, following: [] };
    } else {
      group[slot]!.following.push(a);
    }
    group.minEta = Math.min(group.minEta, a.etaSeconds);
  }
  return [...map.values()].sort((x, y) => x.minEta - y.minEta);
}

function metersHaversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function StopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useT();
  const { position } = useGeolocation();
  const [stopMeta, setStopMeta] = useState<StopDetail | null>(null);
  const [stopError, setStopError] = useState<Error | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const { isSaved, add: addSaved, remove: removeSaved } = useSaved();
  const bookmarked = id ? isSaved('stop', id) : false;

  const { data, isLoading, isStale, error, refetch } = useStopArrivals(id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.getStop(id)
      .then(s => { if (!cancelled) setStopMeta(s); })
      .catch(e => { if (!cancelled) setStopError(e instanceof Error ? e : new Error(String(e))); });
    return () => { cancelled = true; };
  }, [id]);

  const groups = useMemo(() => groupArrivals(data?.arrivals ?? []), [data]);

  const walk = useMemo(() => {
    if (!position || !stopMeta) return null;
    const meters = Math.round(metersHaversine(position, stopMeta));
    const minutes = Math.round(meters / (1.3 * 60));
    return { minutes, meters };
  }, [position, stopMeta]);

  const linesCount = stopMeta?.routes.length ?? 0;
  const linesLabel = linesCount === 1
    ? t('stop_detail.lines_count_one')
    : t('stop_detail.lines_count_other', { n: linesCount });

  const onShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: stopMeta?.name ?? 'Stop',
          url: window.location.href,
        });
      } catch {
        // user cancelled
      }
    }
  };

  const onBookmark = () => {
    if (!id) return;
    if (bookmarked) {
      removeSaved('stop', id);
      setToast({ message: t('saved.removed', { name: stopMeta?.name ?? id }) });
    } else {
      addSaved({ kind: 'stop', id, name: stopMeta?.name ?? id });
      setToast({ message: t('saved.added', { name: stopMeta?.name ?? id }) });
    }
  };

  const handleExpandToggle = (groupKey: string) => {
    setExpandedKey(prev => (prev === groupKey ? null : groupKey));
  };

  return (
    <ScreenShell>
      <div className="stop-detail">
        <header className="stop-detail__header">
          <div className="stop-detail__icon-row">
            <button
              type="button"
              className="stop-detail__icon-btn"
              onClick={() => navigate(-1)}
              aria-label={t('stop_detail.back')}
            >
              <Chevron dir="left" size={22} />
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className="stop-detail__icon-btn"
                onClick={onShare}
                aria-label={t('stop_detail.share')}
              >
                <IconShare size={22} />
              </button>
              <button
                type="button"
                className="stop-detail__icon-btn"
                onClick={onBookmark}
                aria-pressed={bookmarked}
                aria-label={bookmarked ? t('stop_detail.bookmark_remove') : t('stop_detail.bookmark_add')}
              >
                <IconBookmark size={22} filled={bookmarked} c={bookmarked ? 'var(--stb-red)' : 'currentColor'} />
              </button>
            </div>
          </div>

          <div>
            <div className="stop-detail__label">{t('stop_detail.label')} · {id}</div>
            <h1 className="stop-detail__title">{stopMeta?.name ?? <Skeleton w="60%" h="32px" />}</h1>
          </div>

          <div className="stop-detail__chips">
            {walk && <WalkChip minutes={walk.minutes} meters={walk.meters} />}
            {linesCount > 0 && <span className="stop-detail__caption">{linesLabel}</span>}
          </div>
        </header>

        <div className="stop-detail__banners">
          {(error || stopError) && (
            <AlertBanner severity="critical" title={t('errors.feed_down')} body={t('errors.offline')} />
          )}
          {isStale && !error && (
            <AlertBanner severity="warning" title={t('stop_detail.stale_label')} onDismiss={refetch} />
          )}
        </div>

        <SectionHeader
          title={`${t('stop_detail.arrivals')} · ${t('stop_detail.both_dirs')}`}
          live={!!data && !isStale}
          serverTime={data ? formatClock(data.serverTime) : undefined}
        />

        <div className="stop-detail__list">
          {isLoading && groups.length === 0 && (
            <>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="stop-detail__skeleton-row">
                  <Skeleton w="48px" h="28px" r="var(--r-sm)" />
                  <Skeleton w="40%" h="20px" />
                  <Skeleton w="40%" h="20px" />
                </div>
              ))}
            </>
          )}

          {!isLoading && groups.length === 0 && (
            <div className="stop-detail__empty">{t('stop_detail.no_arrivals')}</div>
          )}

          {groups.map(group => {
            const groupKey = `${group.routeId}`;
            const expanded = expandedKey === groupKey;
            const mode = modeFromRouteType(group.routeType, group.shortName);

            const dirA: DirectionEta | null = group.directionA
              ? { to: group.directionA.soonest.destinationName, etaSeconds: group.directionA.soonest.etaSeconds, isLive: group.directionA.soonest.isLive }
              : null;
            const dirB: DirectionEta | null = group.directionB
              ? { to: group.directionB.soonest.destinationName, etaSeconds: group.directionB.soonest.etaSeconds, isLive: group.directionB.soonest.isLive }
              : null;

            const expandedDirection: 'a' | 'b' = group.directionA ? 'a' : 'b';
            const expandedSlot = expandedDirection === 'a' ? group.directionA : group.directionB;
            const expandedFollowing = expandedSlot ? [expandedSlot.soonest, ...expandedSlot.following] : [];

            return (
              <div key={groupKey} className="stop-detail__row-wrap">
                <TwoWayArrivalRow
                  route={{ num: group.shortName, mode }}
                  directionA={dirA}
                  directionB={dirB}
                  expanded={expanded}
                  stale={isStale}
                  onTap={() => handleExpandToggle(groupKey)}
                />
                {expanded && stopMeta && (
                  <ExpandedArrivalCard
                    className="stop-detail__expand"
                    routeId={group.routeId}
                    direction={expandedDirection}
                    stop={{ lat: stopMeta.lat, lng: stopMeta.lng }}
                    nextArrivals={expandedFollowing}
                  />
                )}
              </div>
            );
          })}
        </div>

        {toast && (
          <Toast message={toast.message} onDismiss={() => setToast(null)} durationMs={3000} />
        )}
      </div>
    </ScreenShell>
  );
}
