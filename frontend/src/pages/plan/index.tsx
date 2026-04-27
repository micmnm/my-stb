import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { SectionHeader } from '../../components/patterns/SectionHeader';
import { AlertBanner } from '../../components/atoms/AlertBanner';
import { LiveDot } from '../../components/atoms/LiveDot';
import { RouteBadge } from '../../components/atoms/RouteBadge';
import { Skeleton } from '../../components/atoms/Skeleton';
import { Chevron, IconLocationDot, IconSwap, IconWalk } from '../../components/icons';
import { useTripPlan } from '../../hooks/useTripPlan';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useT } from '../../i18n/useT';
import { pushRecent, useRecents, type Recent } from '../../stores/recents';
import type {
  PlanLocation,
  PlanModeFilter,
  PlanRequest,
  PlanTransitLeg,
  PlanWalkLeg,
  PlanWhen,
  Trip,
} from '../../types';
import './plan.css';

type Step = 'input' | 'results' | 'trip';
const MODE_OPTIONS: PlanModeFilter[] = ['tram', 'bus', 'trolley', 'metro'];
const MODE_TO_API: Record<PlanModeFilter, string[]> = {
  tram: ['tram'],
  bus: ['bus'],
  trolley: ['trolley'],
  metro: ['m1', 'm2', 'm3', 'm4', 'm5'],
};

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function plural(t: ReturnType<typeof useT>, base: string, n: number): string {
  if (n === 0 && (base === 'plan.changes')) return t('plan.changes_zero');
  return n === 1 ? t(`${base}_one`) : t(`${base}_other`, { n });
}

function expandModes(modes: PlanModeFilter[]): string[] {
  return modes.flatMap(m => MODE_TO_API[m]);
}

function locationFromParams(params: URLSearchParams, prefix: 'from' | 'to'): PlanLocation | null {
  const lat = params.get(`${prefix}Lat`);
  const lng = params.get(`${prefix}Lng`);
  const label = params.get(`${prefix}Label`);
  const stopId = params.get(`${prefix}StopId`);
  if (stopId) return { kind: 'stop', stopId, label: label ?? undefined };
  if (lat && lng) return {
    kind: 'address',
    lat: Number(lat),
    lng: Number(lng),
    label: label ?? undefined,
  };
  return null;
}

export default function PlanPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const recents = useRecents();
  const { position } = useGeolocation();

  const step = (params.get('step') as Step | null) ?? 'input';
  const tripId = params.get('id');

  const [from, setFrom] = useState<PlanLocation | null>(() => locationFromParams(params, 'from'));
  const [to, setTo] = useState<PlanLocation | null>(() => locationFromParams(params, 'to'));
  const [whenType, setWhenType] = useState<PlanWhen['type']>('now');
  const [whenTime, setWhenTime] = useState<string>('');
  const [modes, setModes] = useState<PlanModeFilter[]>([...MODE_OPTIONS]);

  // Use geolocation for "from" if user wants "use my location"
  const useMyLocation = () => {
    if (!position) return;
    setFrom({
      kind: 'address',
      lat: position.lat,
      lng: position.lng,
      label: 'My location',
    });
  };

  const planRequest: PlanRequest | null = useMemo(() => {
    if (step !== 'results' && step !== 'trip') return null;
    if (!from || !to) return null;
    return {
      from,
      to,
      when: whenType === 'now'
        ? { type: 'now' }
        : { type: whenType, time: whenTime },
      modes: expandModes(modes),
      maxWalkMeters: 1000,
    };
  }, [step, from, to, whenType, whenTime, modes]);

  const { data, isLoading, error } = useTripPlan(planRequest);

  // Push recent trip on results.
  useEffect(() => {
    if (step === 'results' && data && data.trips.length > 0 && from && to) {
      pushRecent({
        kind: 'trip',
        refId: `${from.lat ?? from.stopId}|${to.lat ?? to.stopId}|${whenType}`,
        label: `${from.label ?? '?'} → ${to.label ?? '?'}`,
        meta: { from, to, when: { type: whenType, time: whenTime } },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, data]);

  const setStep = (next: Step, extra?: Record<string, string>) => {
    const np = new URLSearchParams(params);
    np.set('step', next);
    if (extra) for (const [k, v] of Object.entries(extra)) np.set(k, v);
    if (next !== 'trip') np.delete('id');
    setParams(np);
  };

  if (step === 'trip' && data && tripId) {
    const trip = data.trips.find(tr => tr.id === tripId) ?? data.trips[0];
    return (
      <PlanStepByStep
        trip={trip}
        onBack={() => setStep('results')}
        onTransitTap={leg => navigate(`/route/${encodeURIComponent(leg.routeId)}`)}
      />
    );
  }

  if (step === 'results') {
    return (
      <PlanResults
        from={from}
        to={to}
        trips={data?.trips ?? []}
        loading={isLoading}
        error={error}
        onEdit={() => setStep('input')}
        onSelect={trip => setStep('trip', { id: trip.id })}
        onTryDifferentTime={() => setStep('input')}
      />
    );
  }

  const recentTrips = recents.filter(r => r.kind === 'trip').slice(0, 5);

  return (
    <ScreenShell>
      <div className="plan-page">
        <div className="plan-page__header">
          <h1 className="plan-page__title">{t('nav.plan')}</h1>
        </div>

        <div className="plan-input__card">
          <button
            type="button"
            className="plan-input__row"
            onClick={() => navigate('/search?intent=plan-from')}
          >
            <IconLocationDot size={20} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="plan-input__row-label">{t('plan.from')}</span><br />
              <span className={['plan-input__row-value', !from && 'plan-input__row-empty'].filter(Boolean).join(' ')}>
                {from?.label ?? '—'}
              </span>
            </span>
          </button>

          <div className="plan-input__swap-row">
            <button
              type="button"
              className="plan-input__swap"
              onClick={() => { const f = from; setFrom(to); setTo(f); }}
              aria-label={t('plan.swap')}
            >
              <IconSwap size={18} />
            </button>
          </div>

          <button
            type="button"
            className="plan-input__row"
            onClick={() => navigate('/search?intent=plan-to')}
          >
            <IconLocationDot size={20} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="plan-input__row-label">{t('plan.to')}</span><br />
              <span className={['plan-input__row-value', !to && 'plan-input__row-empty'].filter(Boolean).join(' ')}>
                {to?.label ?? '—'}
              </span>
            </span>
          </button>

          {position && (
            <button
              type="button"
              onClick={useMyLocation}
              className="plan-input__row"
              style={{ minHeight: 40 }}
            >
              <IconLocationDot size={18} />
              <span className="plan-input__row-value">{t('search.use_my_location')}</span>
            </button>
          )}
        </div>

        <div className="plan-input__when">
          {(['now', 'leaveAt', 'arriveBy'] as const).map(type => {
            const labelKey = type === 'now' ? 'plan.when.now' : type === 'leaveAt' ? 'plan.when.leave_at' : 'plan.when.arrive_by';
            return (
              <button
                key={type}
                type="button"
                className={['plan-input__when-chip', whenType === type ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setWhenType(type)}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
        {whenType !== 'now' && (
          <input
            type="datetime-local"
            className="plan-input__time"
            value={whenTime}
            onChange={e => setWhenTime(e.target.value)}
            aria-label={t(whenType === 'leaveAt' ? 'plan.when.leave_at' : 'plan.when.arrive_by')}
          />
        )}

        <div className="plan-input__modes">
          <h4 className="plan-input__modes-title">{t('plan.modes_filter')}</h4>
          <div className="plan-input__modes-row">
            {MODE_OPTIONS.map(m => (
              <button
                key={m}
                type="button"
                className={['plan-input__when-chip', modes.includes(m) ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => setModes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])}
              >
                {t(`plan.mode_${m}`)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="plan-input__cta"
          disabled={!from || !to || (whenType !== 'now' && !whenTime)}
          onClick={() => setStep('results')}
        >
          {t('plan.find_routes')}
        </button>

        <span className="plan-input__direct">{t('plan.direct_only')}</span>

        {recentTrips.length > 0 && (
          <>
            <SectionHeader title={t('plan.recent_trips')} />
            <RecentTripList recents={recentTrips} onPick={r => {
              const meta = r.meta as { from: PlanLocation; to: PlanLocation; when: PlanWhen } | undefined;
              if (!meta) return;
              setFrom(meta.from);
              setTo(meta.to);
              setWhenType(meta.when.type);
              setWhenTime(meta.when.time ?? '');
              setStep('results');
            }} />
          </>
        )}
      </div>
    </ScreenShell>
  );
}

function RecentTripList({ recents, onPick }: { recents: Recent[]; onPick: (r: Recent) => void }) {
  return (
    <div className="plan-results__list">
      {recents.map(r => (
        <button key={r.refId} type="button" className="plan-trip-card" onClick={() => onPick(r)}>
          <span className="plan-trip-card__times">{r.label}</span>
        </button>
      ))}
    </div>
  );
}

function PlanResults({
  from,
  to,
  trips,
  loading,
  error,
  onEdit,
  onSelect,
  onTryDifferentTime,
}: {
  from: PlanLocation | null;
  to: PlanLocation | null;
  trips: Trip[];
  loading: boolean;
  error: Error | null;
  onEdit: () => void;
  onSelect: (trip: Trip) => void;
  onTryDifferentTime: () => void;
}) {
  const t = useT();
  return (
    <ScreenShell>
      <div className="plan-page">
        <div className="plan-page__header">
          <button
            type="button"
            className="plan-page__icon-btn"
            onClick={onEdit}
            aria-label={t('plan.edit')}
          >
            <Chevron dir="left" size={22} />
          </button>
          <h1 className="plan-page__title">
            {(from?.label ?? '?')} → {(to?.label ?? '?')}
          </h1>
        </div>

        {loading && (
          <div className="plan-results__list">
            {[0, 1, 2].map(i => (
              <div key={i} className="plan-trip-card">
                <Skeleton w="50%" h="24px" />
                <Skeleton w="70%" h="14px" />
                <Skeleton w="100%" h="8px" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '0 var(--s-4)' }}>
            <AlertBanner severity="critical" title={t('errors.feed_down')} body={t('errors.offline')} />
          </div>
        )}

        {!loading && !error && trips.length === 0 && (
          <div className="plan-page__header" style={{ flexDirection: 'column', gap: 'var(--s-3)' }}>
            <p style={{ color: 'var(--fg-2)' }}>{t('plan.no_routes')}</p>
            <button type="button" className="plan-input__cta" onClick={onTryDifferentTime}>
              {t('plan.try_different_time')}
            </button>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <div className="plan-results__list">
            {trips.map(trip => (
              <PlanTripCard key={trip.id} trip={trip} onClick={() => onSelect(trip)} />
            ))}
          </div>
        )}
      </div>
    </ScreenShell>
  );
}

function PlanTripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const t = useT();
  const transitCount = trip.legs.filter(l => l.kind === 'transit').length;
  const changes = Math.max(0, transitCount - 1);
  const durationMin = Math.round(trip.durationSeconds / 60);

  // Mode-tinted strip from leg durations.
  const totalSeconds = trip.legs.reduce((sum, leg) =>
    sum + (leg.kind === 'walk'
      ? leg.durationSeconds
      : Math.max(60, (new Date(leg.arrivesAt).getTime() - new Date(leg.departsAt).getTime()) / 1000)),
  0);

  return (
    <button type="button" className="plan-trip-card" onClick={onClick}>
      <span className="plan-trip-card__times">
        {formatClock(trip.startsAt)} → {formatClock(trip.endsAt)}
      </span>
      <span className="plan-trip-card__meta">
        {t('plan.duration_min', { m: durationMin })} · {plural(t, 'plan.changes', changes)}
      </span>
      <span className="plan-trip-card__strip" aria-hidden="true">
        {trip.legs.map((leg, i) => {
          const seconds = leg.kind === 'walk'
            ? leg.durationSeconds
            : (new Date(leg.arrivesAt).getTime() - new Date(leg.departsAt).getTime()) / 1000;
          const pct = Math.max(2, Math.min(100, (seconds / totalSeconds) * 100));
          const color = leg.kind === 'walk'
            ? 'var(--neutral-300)'
            : `var(--line-${leg.mode})`;
          return (
            <span
              key={i}
              className="plan-trip-card__strip-segment"
              style={{ width: `${pct}%`, background: color }}
            />
          );
        })}
      </span>
      <span className="plan-trip-card__walk">
        <IconWalk size={14} /> {Math.round(trip.walkSecondsTotal / 60)} min
      </span>
    </button>
  );
}

function PlanStepByStep({
  trip,
  onBack,
  onTransitTap,
}: {
  trip: Trip;
  onBack: () => void;
  onTransitTap: (leg: PlanTransitLeg) => void;
}) {
  const t = useT();
  return (
    <ScreenShell>
      <div className="plan-page">
        <div className="plan-page__header">
          <button
            type="button"
            className="plan-page__icon-btn"
            onClick={onBack}
            aria-label={t('plan.edit')}
          >
            <Chevron dir="left" size={22} />
          </button>
          <h1 className="plan-page__title">
            {formatClock(trip.startsAt)} → {formatClock(trip.endsAt)}
          </h1>
        </div>

        <div className="plan-step-by-step">
          {trip.legs.map((leg, i) => (
            leg.kind === 'walk' ? (
              <WalkStep key={i} leg={leg} />
            ) : (
              <TransitStep key={i} leg={leg} onTap={() => onTransitTap(leg)} />
            )
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}

function WalkStep({ leg }: { leg: PlanWalkLeg }) {
  const t = useT();
  return (
    <div className="plan-step">
      <IconWalk size={22} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p className="plan-step__title">{t('plan.step_walk', { to: leg.toName })}</p>
        <span className="plan-step__caption">
          {Math.max(1, Math.round(leg.durationSeconds / 60))} min · {leg.meters} m
        </span>
      </div>
    </div>
  );
}

function TransitStep({ leg, onTap }: { leg: PlanTransitLeg; onTap: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onTap}
      className="plan-step"
      style={{ cursor: 'pointer', textAlign: 'left' }}
    >
      <RouteBadge num={leg.routeId} mode={leg.mode} size="md" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p className="plan-step__title">
          {t('plan.step_take', { route: leg.routeId, to: leg.toStopName })}
        </p>
        <span className="plan-step__times">
          {formatClock(leg.departsAt)} → {formatClock(leg.arrivesAt)}
        </span>
        <span className="plan-step__caption">
          {t('plan.step_stops', { n: leg.stops })} {leg.isLive && <LiveDot live />}
        </span>
      </div>
      <Chevron size={20} />
    </button>
  );
}
