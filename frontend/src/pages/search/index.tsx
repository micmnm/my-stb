import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { SearchInput } from '../../components/molecules/SearchInput';
import { StopRow } from '../../components/molecules/StopRow';
import { SectionHeader } from '../../components/patterns/SectionHeader';
import { RouteBadge } from '../../components/atoms/RouteBadge';
import { IconLocationDot, IconSearch } from '../../components/icons';
import { api } from '../../api/client';
import { useT } from '../../i18n/useT';
import { useSaved } from '../../stores/saved';
import { pushRecent, useRecents, type Recent } from '../../stores/recents';
import {
  modeFromRouteType,
  type Mode,
  type SearchAddressHit,
  type SearchResponse,
  type SearchType,
} from '../../types';
import './search.css';

type Filter = 'all' | 'stops' | 'routes' | 'addresses';
const FILTERS: Filter[] = ['all', 'stops', 'routes', 'addresses'];
const DEBOUNCE_MS = 200;

function filterToTypes(filter: Filter): SearchType[] | undefined {
  if (filter === 'all') return undefined;
  return [filter];
}

export default function SearchPage() {
  const t = useT();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const intent = params.get('intent') === 'save' ? 'save' : 'navigate';
  const initialQuery = params.get('q') ?? '';
  const initialFilter = (params.get('f') as Filter | null) && FILTERS.includes(params.get('f') as Filter)
    ? (params.get('f') as Filter)
    : 'all';

  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [addrResult, setAddrResult] = useState<{ q: string; items: SearchAddressHit[] } | null>(null);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState<Error | null>(null);
  const addrAbortRef = useRef<AbortController | null>(null);
  const recents = useRecents();
  const { add: addSaved } = useSaved();

  // Reflect query + filter into URL so refresh / back works.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (query) next.set('q', query); else next.delete('q');
    if (filter !== 'all') next.set('f', filter); else next.delete('f');
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filter]);

  // Debounced stops/routes fetch; addresses are only fetched on submit.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === '' || filter === 'addresses') return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await api.search(trimmed, { types: filterToTypes(filter), limit: 30 }, controller.signal);
        setResults(resp);
        setError(null);
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') return;
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filter]);

  const trimmedQuery = query.trim();
  const canSearchAddresses = trimmedQuery.length >= 3;

  const searchAddresses = async () => {
    if (!canSearchAddresses) return;
    addrAbortRef.current?.abort();
    const controller = new AbortController();
    addrAbortRef.current = controller;
    setAddrLoading(true);
    setAddrError(null);
    try {
      const resp = await api.search(trimmedQuery, { types: ['addresses'], limit: 30 }, controller.signal);
      setAddrResult({ q: trimmedQuery, items: resp.addresses });
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return;
      setAddrError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (!controller.signal.aborted) setAddrLoading(false);
    }
  };

  const onSelectStop = (stop: { id: string; name: string; lat: number; lng: number }) => {
    pushRecent({ kind: 'stop', refId: stop.id, label: stop.name });
    if (intent === 'save') {
      addSaved({ kind: 'stop', id: stop.id, name: stop.name });
      navigate(-1);
      return;
    }
    navigate(`/stop/${encodeURIComponent(stop.id)}`);
  };

  const onSelectRoute = (route: { id: string; shortName: string; longName: string; routeType: number }) => {
    pushRecent({ kind: 'route', refId: route.id, label: `${route.shortName} · ${route.longName}` });
    if (intent === 'save') {
      addSaved({
        kind: 'route',
        id: route.id,
        shortName: route.shortName,
        mode: modeFromRouteType(route.routeType, route.shortName),
      });
      navigate(-1);
      return;
    }
    navigate(`/route/${encodeURIComponent(route.id)}`);
  };

  const onSelectAddress = (addr: { label: string; lat: number; lng: number }) => {
    pushRecent({ kind: 'address', refId: `${addr.lat},${addr.lng}`, label: addr.label });
    if (intent === 'save') {
      // Addresses aren't directly saveable.
      return;
    }
    const qs = new URLSearchParams({ toLat: String(addr.lat), toLng: String(addr.lng), toLabel: addr.label });
    navigate(`/plan?${qs}`);
  };

  const recentStops = useMemo(
    () => recents.filter(r => r.kind === 'stop').slice(0, 8),
    [recents],
  );
  const recentRoutes = useMemo(
    () => recents.filter(r => r.kind === 'route').slice(0, 8),
    [recents],
  );
  const recentAddresses = useMemo(
    () => recents.filter(r => r.kind === 'address').slice(0, 8),
    [recents],
  );

  const showRecents = query.trim() === '';
  const showStopsSection = !!results && (filter === 'all' || filter === 'stops');
  const showRoutesSection = !!results && (filter === 'all' || filter === 'routes');
  const addrItems = addrResult && addrResult.q === trimmedQuery ? addrResult.items : null;
  const showAddressRow = canSearchAddresses && intent !== 'save' && !addrLoading && addrItems === null;
  const noMatches = filter !== 'addresses'
    && results !== null
    && results.stops.length + results.routes.length === 0
    && !loading
    && addrItems === null;

  return (
    <ScreenShell>
      <div className="search-page">
        <div className="search-page__input">
          <form
            onSubmit={e => {
              e.preventDefault();
              if (intent !== 'save') void searchAddresses();
            }}
          >
            <SearchInput
              value={query}
              onChange={setQuery}
              autoFocus
              placeholder={t('search.placeholder')}
              ariaLabel={t('search.placeholder')}
            />
          </form>
        </div>

        <div className="search-page__chips" role="tablist" aria-label="Filter">
          {FILTERS.map(f => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={['search-page__chip', filter === f ? 'is-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setFilter(f)}
            >
              {t(`search.filter_${f}`)}
            </button>
          ))}
        </div>

        {intent === 'save' && (
          <div className="search-page__inline-note">{t('search.save_hint')}</div>
        )}

        {showRecents ? (
          <RecentsSection
            recents={{ stops: recentStops, routes: recentRoutes, addresses: recentAddresses }}
            onTap={recent => {
              if (recent.kind === 'stop') {
                navigate(`/stop/${encodeURIComponent(recent.refId)}`);
              } else if (recent.kind === 'route') {
                navigate(`/route/${encodeURIComponent(recent.refId)}`);
              }
            }}
          />
        ) : (
          <>
            {error && (
              <div className="search-page__inline-note">{t('errors.feed_down')}</div>
            )}

            {showStopsSection && results && results.stops.length > 0 && (
              <section className="search-page__section">
                <SectionHeader title={t('search.section_stops')} />
                <div className="search-page__list">
                  {results.stops.map(stop => {
                    const lines = stop.routes.slice(0, 5).map(num => ({
                      num,
                      mode: 'bus' as Mode,
                    }));
                    return (
                      <StopRow
                        key={stop.id}
                        stop={{ id: stop.id, name: stop.name }}
                        lines={lines}
                        onTap={() => onSelectStop(stop)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {showRoutesSection && results && results.routes.length > 0 && (
              <section className="search-page__section">
                <SectionHeader title={t('search.section_routes')} />
                <div className="search-page__list">
                  {results.routes.map(route => (
                    <button
                      key={route.id}
                      type="button"
                      className="search-page__row"
                      onClick={() => onSelectRoute(route)}
                    >
                      <RouteBadge
                        num={route.shortName}
                        mode={modeFromRouteType(route.routeType, route.shortName)}
                        size="lg"
                      />
                      <span className="search-page__row-text">
                        <span className="search-page__row-name">{route.shortName}</span>
                        {route.longName && (
                          <span className="search-page__row-sub">{route.longName}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {showAddressRow && (
              <div className="search-page__list">
                <button type="button" className="search-page__row" onClick={() => void searchAddresses()}>
                  <span className="search-page__row-icon"><IconSearch size={20} /></span>
                  <span className="search-page__row-text">
                    <span className="search-page__row-name">{t('search.addresses_for', { q: trimmedQuery })}</span>
                  </span>
                </button>
              </div>
            )}

            {addrError && (
              <div className="search-page__inline-note">{t('search.geocoder_unavailable')}</div>
            )}

            {addrItems && addrItems.length === 0 && (
              <div className="search-page__inline-note">{t('search.geocoder_unavailable')}</div>
            )}

            {addrItems && addrItems.length > 0 && (
              <section className="search-page__section">
                <SectionHeader title={t('search.section_addresses')} />
                <div className="search-page__list">
                  {addrItems.map(addr => (
                    <button
                      key={`${addr.lat},${addr.lng}`}
                      type="button"
                      className="search-page__row"
                      onClick={() => onSelectAddress(addr)}
                    >
                      <span className="search-page__row-icon"><IconLocationDot size={20} /></span>
                      <span className="search-page__row-text">
                        <span className="search-page__row-name">{addr.label.split(',')[0]}</span>
                        <span className="search-page__row-sub">{addr.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {noMatches && (
              <div className="search-page__empty">
                <div>{t('search.no_results')}</div>
                <div className="caption">{t('search.no_results_hint')}</div>
              </div>
            )}
          </>
        )}
      </div>
    </ScreenShell>
  );
}

function RecentsSection({
  recents,
  onTap,
}: {
  recents: { stops: Recent[]; routes: Recent[]; addresses: Recent[] };
  onTap: (recent: Recent) => void;
}) {
  const t = useT();
  const total = recents.stops.length + recents.routes.length + recents.addresses.length;
  if (total === 0) return null;

  return (
    <section className="search-page__section">
      <SectionHeader title={t('search.recent')} />
      <div className="search-page__list">
        {[...recents.stops, ...recents.routes, ...recents.addresses].map(r => (
          <button
            key={`${r.kind}:${r.refId}`}
            type="button"
            className="search-page__row"
            onClick={() => onTap(r)}
          >
            <span className="search-page__row-icon"><IconLocationDot size={20} /></span>
            <span className="search-page__row-text">
              <span className="search-page__row-name">{r.label}</span>
              <span className="search-page__row-sub">{r.kind}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
