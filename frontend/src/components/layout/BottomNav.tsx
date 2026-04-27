import { NavLink } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import { IconBookmark, IconHome, IconRoute, IconSearch } from '../icons';

interface TabIconProps { active: boolean }
type TabIcon = (props: TabIconProps) => React.ReactElement;

const HomeTabIcon: TabIcon = ({ active }) => <IconHome size={22} filled={active} />;
const SearchTabIcon: TabIcon = () => <IconSearch size={22} />;
const PlanTabIcon: TabIcon = () => <IconRoute size={22} />;
const SavedTabIcon: TabIcon = ({ active }) => <IconBookmark size={22} filled={active} />;

const tabs: Array<{ to: string; key: string; Icon: TabIcon; end?: boolean }> = [
  { to: '/', key: 'nav.home', Icon: HomeTabIcon, end: true },
  { to: '/search', key: 'nav.search', Icon: SearchTabIcon },
  { to: '/plan', key: 'nav.plan', Icon: PlanTabIcon },
  { to: '/saved', key: 'nav.saved', Icon: SavedTabIcon },
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
