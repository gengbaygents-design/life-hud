import {
  Compass,
  House,
  Layers3,
  Orbit,
  ScanLine,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';
import { useLim } from './lim-state';
import { LimPresence } from './lim-presence';

const navigation = [
  { label: 'HOME', caption: '此刻与今天', path: '/app', icon: House },
  { label: 'QUEST', caption: '行动的方向', path: '/app/quest', icon: Compass },
  { label: 'STUDY', caption: '理解与探索', path: '/app/study', icon: BookOpen },
  { label: 'MORE', caption: '生活的其他面', path: '/app/more', icon: Layers3 },
];
type NavigationProps = { pathname: string; onNavigate: (path: string) => void };
function isActive(path: string, pathname: string) {
  if (path === '/app')
    return pathname === '/' || pathname === '/app' || pathname === '/app/';
  if (path === '/app/more')
    return (
      !['/', '/app', '/app/'].includes(pathname) &&
      !pathname.startsWith('/app/quest') &&
      !pathname.startsWith('/app/study')
    );
  return pathname.startsWith(path);
}
function NavigationItem({
  item,
  pathname,
  onNavigate,
  captions = false,
}: NavigationProps & {
  item: (typeof navigation)[number];
  captions?: boolean;
}) {
  const active = isActive(item.path, pathname);
  return (
    <button
      type="button"
      className="nav-item"
      data-active={active}
      aria-current={active ? 'page' : undefined}
      onClick={() => onNavigate(item.path)}
    >
      <item.icon size={19} strokeWidth={1.5} aria-hidden="true" />
      <span>
        <span className="nav-label">{item.label}</span>
        {captions && <span className="nav-caption">{item.caption}</span>}
      </span>
    </button>
  );
}
function LimEntry({ desktop = false }: { desktop?: boolean }) {
  const { state, openLim } = useLim();
  return (
    <button
      type="button"
      className={desktop ? 'desktop-lim-entry' : 'nav-item nav-lim'}
      aria-label="◉ LIM"
      aria-haspopup="dialog"
      aria-expanded={state.isOpen}
      onClick={() => openLim()}
    >
      {desktop ? (
        <>
          <LimPresence size="small" />
          <span>
            与 Lim 同行<small>随时在这里</small>
          </span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </>
      ) : (
        <>
          <Orbit size={24} strokeWidth={1.4} aria-hidden="true" />
          <span>◉ LIM</span>
        </>
      )}
    </button>
  );
}
export function DesktopSidebar(props: NavigationProps) {
  return (
    <aside className="desktop-sidebar" aria-label="LIFE HUD 导航栏">
      <div className="sidebar-brand">
        <ScanLine
          className="brand-mark"
          size={26}
          strokeWidth={1.3}
          aria-hidden="true"
        />
        <span>
          LIFE HUD<small>YOUR LIFE, IN ORBIT</small>
        </span>
      </div>
      <p className="sidebar-caption">WORKSPACE</p>
      <nav className="desktop-nav" aria-label="桌面主导航">
        {navigation.map((item) => (
          <NavigationItem key={item.path} {...props} item={item} captions />
        ))}
      </nav>
      <div className="sidebar-footer">
        <LimEntry desktop />
        <p>一步一步，靠近想去的地方。</p>
      </div>
    </aside>
  );
}
export function MobileBottomNav(props: NavigationProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="主导航">
      {navigation.slice(0, 2).map((item) => (
        <NavigationItem key={item.path} {...props} item={item} />
      ))}
      <LimEntry />
      {navigation.slice(2).map((item) => (
        <NavigationItem key={item.path} {...props} item={item} />
      ))}
    </nav>
  );
}
