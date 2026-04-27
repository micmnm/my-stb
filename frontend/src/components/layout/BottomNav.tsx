import { NavLink } from 'react-router-dom';
import { useT } from '../../i18n/useT';

type TabIcon = (props: { active: boolean }) => React.ReactElement;

const HomeIcon: TabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);

const SearchIcon: TabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

const PlanIcon: TabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h12" />
    <path d="m13 4 3 3-3 3" />
    <path d="M20 17H8" />
    <path d="m11 20-3-3 3-3" />
  </svg>
);

const SavedIcon: TabIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 4h12v17l-6-4-6 4z" />
  </svg>
);

const tabs: Array<{ to: string; key: string; Icon: TabIcon; end?: boolean }> = [
  { to: '/', key: 'nav.home', Icon: HomeIcon, end: true },
  { to: '/search', key: 'nav.search', Icon: SearchIcon },
  { to: '/plan', key: 'nav.plan', Icon: PlanIcon },
  { to: '/saved', key: 'nav.saved', Icon: SavedIcon },
];

export function BottomNav() {
  const t = useT();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map(({ to, key, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => 'bottom-nav__tab' + (isActive ? ' is-active' : '')}
        >
          {({ isActive }) => (
            <>
              <span className="bottom-nav__icon"><Icon active={isActive} /></span>
              <span className="bottom-nav__label">{t(key)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
