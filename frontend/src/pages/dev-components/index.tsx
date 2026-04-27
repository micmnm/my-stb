import type { ReactNode } from 'react';
import { ScreenShell } from '../../components/layout/ScreenShell';
import { RouteBadge, type Mode } from '../../components/atoms/RouteBadge';
import { LiveDot } from '../../components/atoms/LiveDot';
import { WalkChip } from '../../components/atoms/WalkChip';
import { AlertBanner } from '../../components/atoms/AlertBanner';
import { Skeleton } from '../../components/atoms/Skeleton';
import { SearchInput } from '../../components/molecules/SearchInput';
import { StopRow } from '../../components/molecules/StopRow';
import { TwoWayArrivalRow } from '../../components/molecules/TwoWayArrivalRow';
import { SchematicRail } from '../../components/molecules/SchematicRail';
import { SchematicStop } from '../../components/molecules/SchematicStop';
import { SectionHeader } from '../../components/patterns/SectionHeader';
import { Chevron, IconArrow, IconBookmark, IconClose, IconHome, IconLocationDot, IconRoute, IconSearch, IconShare, IconSwap, IconWalk } from '../../components/icons';
import { useState } from 'react';
import './dev.css';

const MODES: Mode[] = ['tram', 'bus', 'trolley', 'm1', 'm2', 'm3', 'm4', 'm5'];

function ThemedRow({ children }: { children: (variant: 'light' | 'dark') => ReactNode }) {
  return (
    <div className="dev-themed">
      <div className="dev-themed__panel">
        <div className="dev-card__label">Light</div>
        {children('light')}
      </div>
      <div className="dev-themed__panel dev-themed__panel--dark" data-theme="dark">
        <div className="dev-card__label">Dark</div>
        {children('dark')}
      </div>
    </div>
  );
}

export default function DevComponentsPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  return (
    <ScreenShell showBottomNav={false}>
      <div className="dev-page">
        <h1>Components playground</h1>

        <section className="dev-section">
          <h2>Icons</h2>
          <div className="dev-grid">
            <IconArrow /><IconBookmark /><IconShare /><IconWalk /><IconSwap />
            <IconLocationDot /><Chevron /><IconClose /><IconSearch /><IconHome /><IconRoute />
          </div>
        </section>

        <section className="dev-section">
          <h2>RouteBadge</h2>
          <ThemedRow>
            {() => (
              <>
                <div className="dev-grid">
                  {MODES.map(m => <RouteBadge key={m} num={m === 'tram' ? '41' : m === 'bus' ? '178' : m.toUpperCase()} mode={m} size="sm" />)}
                </div>
                <div className="dev-grid">
                  {MODES.map(m => <RouteBadge key={m} num={m === 'tram' ? '41' : m === 'bus' ? '178' : m.toUpperCase()} mode={m} size="md" />)}
                </div>
                <div className="dev-grid">
                  {MODES.map(m => <RouteBadge key={m} num={m === 'tram' ? '41' : m === 'bus' ? '178' : m.toUpperCase()} mode={m} size="lg" />)}
                </div>
              </>
            )}
          </ThemedRow>
        </section>

        <section className="dev-section">
          <h2>LiveDot · WalkChip</h2>
          <ThemedRow>
            {() => (
              <div className="dev-grid">
                <LiveDot live /> <span>live</span>
                <LiveDot live={false} /> <span>stale</span>
                <WalkChip minutes={3} meters={210} />
                <WalkChip minutes={9} meters={680} />
              </div>
            )}
          </ThemedRow>
        </section>

        <section className="dev-section">
          <h2>AlertBanner</h2>
          <ThemedRow>
            {() => (
              <div className="dev-stack">
                <AlertBanner severity="info" title="Info" body="Stația revine în funcțiune azi la 18:00." />
                <AlertBanner severity="warning" title="Lucrări tramvai 41" body="Serviciu redus între Romancierilor și Ghencea." actionHref="/route/41" />
                <AlertBanner severity="critical" title="Linie suspendată" body="Tramvaiul 21 nu circulă astăzi." />
              </div>
            )}
          </ThemedRow>
        </section>

        <section className="dev-section">
          <h2>Skeleton</h2>
          <ThemedRow>
            {() => (
              <div className="dev-stack">
                <Skeleton w="60%" h="20px" />
                <Skeleton w="40%" h="14px" />
                <Skeleton w="100%" h="56px" r="var(--r-md)" />
              </div>
            )}
          </ThemedRow>
        </section>

        <section className="dev-section">
          <h2>SearchInput</h2>
          <ThemedRow>
            {() => <SearchInput value={search} onChange={setSearch} />}
          </ThemedRow>
        </section>

        <section className="dev-section">
          <h2>StopRow</h2>
          <ThemedRow>
            {() => (
              <div className="dev-stack">
                <StopRow
                  stop={{ id: '1', name: 'Piața Romană', street: 'Bd. Magheru' }}
                  walkChip={{ minutes: 3, meters: 210 }}
                  lines={[
                    { num: '41', mode: 'tram' },
                    { num: '178', mode: 'bus' },
                    { num: '69', mode: 'trolley' },
                  ]}
                />
                <StopRow
                  stop={{ id: '2', name: 'Universitate' }}
                  lines={[
                    { num: 'M2', mode: 'm2' },
                    { num: '300', mode: 'bus' },
                    { num: '301', mode: 'bus' },
                    { num: '302', mode: 'bus' },
                    { num: '303', mode: 'bus' },
                    { num: '304', mode: 'bus' },
                    { num: '305', mode: 'bus' },
                  ]}
                />
              </div>
            )}
          </ThemedRow>
        </section>

        <section className="dev-section">
          <h2>TwoWayArrivalRow</h2>
          <ThemedRow>
            {() => (
              <div className="dev-stack">
                <TwoWayArrivalRow
                  route={{ num: '41', mode: 'tram' }}
                  directionA={{ to: 'Piața Presei', etaSeconds: 120, isLive: true }}
                  directionB={{ to: 'Pipera', etaSeconds: 480, isLive: true }}
                  expanded={expanded}
                  onTap={() => setExpanded(v => !v)}
                />
                <TwoWayArrivalRow
                  route={{ num: '178', mode: 'bus' }}
                  directionA={{ to: 'Cora Pantelimon', etaSeconds: 30, isLive: true }}
                  directionB={null}
                />
                <TwoWayArrivalRow
                  route={{ num: '300', mode: 'bus' }}
                  directionA={{ to: 'Granitul', etaSeconds: 4500, isLive: false }}
                  directionB={{ to: 'CFR Progresul', etaSeconds: 0, isLive: false }}
                  stale
                />
              </div>
            )}
          </ThemedRow>
        </section>

        <section className="dev-section">
          <h2>Schematic (basic)</h2>
          <ThemedRow>
            {() => (
              <SchematicRail>
                <SchematicStop name="Piața Presei" sub="Terminus" />
                <SchematicStop name="Casa Presei" passed />
                <SchematicStop name="Aviatorilor" passed />
                <SchematicStop name="Romancierilor" you eta="3 min" />
                <SchematicStop name="Eroilor" eta="5 min" />
                <SchematicStop name="Pipera" sub="Terminus" eta="22 min" />
              </SchematicRail>
            )}
          </ThemedRow>
        </section>

        <section className="dev-section">
          <h2>SectionHeader</h2>
          <ThemedRow>
            {() => (
              <div className="dev-stack">
                <SectionHeader title="Sosiri" live serverTime="14:32" />
                <SectionHeader title="Sosiri" live={false} serverTime="14:30" rightSlot={<button type="button">Inversează</button>} />
              </div>
            )}
          </ThemedRow>
        </section>
      </div>
    </ScreenShell>
  );
}
