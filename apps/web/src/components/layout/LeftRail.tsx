import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Sparkles,
  Users,
  Camera,
  ChevronLeft,
  ChevronRight,
  Bug,
  Flame,
  Scan,
  Leaf,
  TreePine,
  Globe,
  Sprout,
  Eye,
  Settings,
  FileBarChart,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  TrendingUp,
  Satellite,
  Ruler,
  BrainCircuit,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface RailTab {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  subItems?: { to: string; label: string; icon: ReactNode }[];
}

const statusSubItems = [
  { to: '/owner/parcels', label: 'Parcels', icon: <TreePine size={16} /> },
  { to: '/owner/surveys', label: 'Surveys', icon: <Eye size={16} /> },
  { to: '/owner/calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
  { to: '/owner/forest-profile', label: 'Forest Profile', icon: <Sprout size={16} /> },
];

const threatsSubItems = [
  { to: '/owner/microclimate', label: 'Beetle Forecast', icon: <Bug size={16} /> },
  { to: '/owner/fire-risk', label: 'Fire Risk', icon: <Flame size={16} /> },
  { to: '/owner/satellite-check', label: 'NDVI', icon: <Scan size={16} /> },
  { to: '/owner/carbon', label: 'Carbon', icon: <Leaf size={16} /> },
  { to: '/owner/biodiversity', label: 'Biodiversity', icon: <TreePine size={16} /> },
  { to: '/owner/satellite-constellation', label: 'Satellite Constellation', icon: <Satellite size={16} /> },
  { to: '/owner/canopy-height', label: 'Canopy Height', icon: <Ruler size={16} /> },
  { to: '/owner/compliance', label: 'Compliance', icon: <ClipboardCheck size={16} /> },
];

const communitySubItems = [
  { to: '/owner/neighbor-activity', label: 'Nearby', icon: <MapPin size={16} /> },
  { to: '/owner/observations', label: 'Sightings', icon: <Eye size={16} /> },
  { to: '/owner/forum', label: 'Discussions', icon: <MessageCircle size={16} /> },
  { to: '/owner/marketplace', label: 'Marketplace', icon: <TrendingUp size={16} /> },
];

const contributeSubItems = [
  { to: '/owner/gallery', label: 'Photos', icon: <Camera size={16} /> },
  { to: '/owner/observations', label: 'Observations', icon: <Eye size={16} /> },
  { to: '/owner/observations', label: 'Traps', icon: <Bug size={16} /> },
  { to: '/owner/settings', label: 'Settings', icon: <Settings size={16} /> },
  { to: '/owner/reports', label: 'Reports', icon: <FileBarChart size={16} /> },
  { to: '/owner/academy', label: 'Learning', icon: <GraduationCap size={16} /> },
  { to: '/owner/research', label: 'Research', icon: <BookOpen size={16} /> },
];

const railTabs: RailTab[] = [
  { to: '/owner/status', label: 'Status', icon: <Shield size={20} />, subItems: statusSubItems },
  { to: '/owner/threats', label: 'Threats', icon: <AlertTriangle size={20} />, badge: 3, subItems: threatsSubItems },
  { to: '/owner/wingman', label: 'Wingman', icon: <Sparkles size={20} />, subItems: [
    { to: '/owner/ai-lab', label: 'AI Lab', icon: <BrainCircuit size={16} /> },
  ] },
  { to: '/owner/forum', label: 'Community', icon: <Users size={20} />, badge: 2, subItems: communitySubItems },
  { to: '/owner/contribute', label: 'Contribute', icon: <Camera size={20} />, subItems: contributeSubItems },
];

const STORAGE_KEY = 'beetlesense-rail-expanded';

export function LeftRail() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(expanded));
    } catch {
      // ignore
    }
  }, [expanded]);

  const railWidth = expanded ? 240 : 64;

  return (
    <nav
      className="flex flex-col h-full border-r border-[var(--border)]"
      style={{
        width: railWidth,
        background: 'var(--bg2)',
        transition: 'width 200ms ease-out',
        overflow: 'hidden',
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div
        className="flex items-center h-[var(--topbar-height)] border-b border-[var(--border)] shrink-0"
        style={{ padding: expanded ? '0 20px' : '0 16px' }}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)] shrink-0">
          <Bug size={18} className="text-[var(--green)]" />
        </div>
        {expanded && (
          <span
            className="ml-3 text-base font-semibold text-[var(--text)] whitespace-nowrap"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            BeetleSense
          </span>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {railTabs.map((tab) => {
          const isActive =
            location.pathname === tab.to || location.pathname.startsWith(tab.to + '/');
          const showSub = expanded && isActive && tab.subItems;

          return (
            <div key={tab.to}>
              <NavLink
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                title={!expanded ? tab.label : undefined}
                className={`
                  group flex items-center gap-3 rounded-lg text-sm font-medium
                  transition-all duration-150 relative
                  ${isActive
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                  }
                `}
                style={{
                  padding: expanded ? '10px 12px' : '10px 0',
                  justifyContent: expanded ? 'flex-start' : 'center',
                }}
              >
                {/* Active left border pill */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full bg-[var(--green)]"
                    style={{ width: 3, height: 20 }}
                  />
                )}

                <span className="relative shrink-0">
                  {tab.icon}
                  {tab.badge && tab.badge > 0 && !expanded && (
                    <span
                      className="absolute -top-1 -right-1 rounded-full"
                      style={{ width: 6, height: 6, background: 'var(--risk-high)' }}
                    />
                  )}
                </span>

                {expanded && (
                  <span className="whitespace-nowrap flex-1">{tab.label}</span>
                )}

                {expanded && tab.badge && tab.badge > 0 && (
                  <span
                    className="text-[10px] font-bold rounded-full px-1.5 py-0.5"
                    style={{
                      background: 'var(--risk-high)',
                      color: '#fff',
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </NavLink>

              {/* Sub-items */}
              {showSub && (
                <div className="ml-5 pl-3 border-l border-[var(--border)] mt-1 space-y-0.5">
                  {tab.subItems!.map((sub) => {
                    const subActive =
                      location.pathname === sub.to ||
                      location.pathname.startsWith(sub.to + '/');
                    return (
                      <NavLink
                        key={sub.to + sub.label}
                        to={sub.to}
                        className={`
                          flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium
                          transition-colors duration-150
                          ${subActive
                            ? 'text-[var(--green)] bg-[var(--green)]/5'
                            : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                          }
                        `}
                      >
                        {sub.icon}
                        <span className="whitespace-nowrap">{sub.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-[var(--border)] p-2">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors duration-150"
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          {expanded && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </nav>
  );
}
