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
  { to: '/owner/b2b-integration', label: 'B2B Integrations', icon: <Settings size={16} /> },
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
  { to: '/owner/forum', label: 'Skogsforumet Network', icon: <Users size={20} />, badge: 2, subItems: communitySubItems },
  { to: '/owner/contribute', label: 'Contribute', icon: <Camera size={20} />, subItems: contributeSubItems },
];

const STORAGE_KEY = 'beetlesense-rail-expanded';

interface LeftRailProps {
  forceExpanded?: boolean;
  onClose?: () => void;
}

export function LeftRail({ forceExpanded, onClose }: LeftRailProps) {
  const location = useLocation();
  const [internalExpanded, setInternalExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const expanded = forceExpanded || internalExpanded;

  useEffect(() => {
    if (!forceExpanded) {
      try {
        localStorage.setItem(STORAGE_KEY, String(internalExpanded));
      } catch {
        // ignore
      }
    }
  }, [internalExpanded, forceExpanded]);

  const railWidth = expanded ? 260 : 64;

  return (
    <nav
      className={`flex flex-col h-full border-r border-[var(--border)] transition-all duration-300 ${
        forceExpanded ? 'glass-panel' : 'bg-[var(--bg2)]'
      }`}
      style={{
        width: railWidth,
        overflow: 'hidden',
      }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div
        className="flex items-center h-[var(--topbar-height)] border-b border-[var(--border)] shrink-0"
        style={{ padding: expanded ? '0 20px' : '0 16px' }}
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--green)] to-emerald-600 shadow-sm shrink-0">
          <Bug size={20} className="text-white" />
        </div>
        {expanded && (
          <div className="ml-3 flex flex-col">
            <span
              className="text-base font-bold text-[var(--text)] whitespace-nowrap leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              BeetleSense
            </span>
            <span className="text-[10px] font-bold text-[var(--green)] uppercase tracking-[0.2em]">Platform</span>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1 custom-scrollbar">
        {railTabs.map((tab) => {
          const isActive =
            location.pathname === tab.to || location.pathname.startsWith(tab.to + '/');
          const showSub = expanded && isActive && tab.subItems;

          return (
            <div key={tab.to} className="space-y-1">
              <NavLink
                to={tab.to}
                onClick={() => forceExpanded && onClose?.()}
                aria-current={isActive ? 'page' : undefined}
                title={!expanded ? tab.label : undefined}
                className={`
                  group flex items-center gap-3 rounded-xl text-sm font-semibold
                  transition-all duration-300 relative
                  ${isActive
                    ? 'bg-gradient-to-r from-[var(--green)]/10 to-transparent text-[var(--green)] shadow-[inset_2px_0_0_0_var(--green)]'
                    : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                  }
                `}
                style={{
                  padding: expanded ? '12px 16px' : '12px 0',
                  justifyContent: expanded ? 'flex-start' : 'center',
                }}
              >
                <span className="relative shrink-0 transition-transform group-hover:scale-110 duration-300">
                  {tab.icon}
                  {tab.badge && tab.badge > 0 && !expanded && (
                    <span
                      className="absolute -top-1 -right-1 rounded-full border-2 border-white animate-pulse"
                      style={{ width: 10, height: 10, background: 'var(--risk-high)' }}
                    />
                  )}
                </span>

                {expanded && (
                  <span className="whitespace-nowrap flex-1 tracking-tight">{tab.label}</span>
                )}

                {expanded && tab.badge && tab.badge > 0 && (
                  <span
                    className="text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm"
                    style={{
                      background: 'var(--risk-high)',
                      color: '#fff',
                      minWidth: 20,
                      textAlign: 'center',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </NavLink>

              {/* Sub-items */}
              {showSub && (
                <div className="ml-8 pl-4 border-l-2 border-gray-100 mt-1 space-y-1 animate-in fade-in duration-300">
                  {tab.subItems!.map((sub) => {
                    const subActive =
                      location.pathname === sub.to ||
                      location.pathname.startsWith(sub.to + '/');
                    return (
                      <NavLink
                        key={sub.to + sub.label}
                        to={sub.to}
                        onClick={() => forceExpanded && onClose?.()}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium
                          transition-all duration-300
                          ${subActive
                            ? 'text-[var(--green)] bg-[var(--green)]/5 font-bold'
                            : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                          }
                        `}
                      >
                        <span className="opacity-70">{sub.icon}</span>
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

      {/* Collapse toggle + version */}
      <div className="shrink-0 border-t border-[var(--border)] p-3 space-y-2">
        {!forceExpanded && (
          <button
            onClick={() => setInternalExpanded((prev) => !prev)}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-all duration-300 bg-gray-50/50"
            aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          >
            {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            {expanded && <span className="text-xs uppercase tracking-widest">Dock Rail</span>}
          </button>
        )}
        
        <div className="flex flex-col items-center gap-1 opacity-50 px-2">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Cloud Sync</span>
           </div>
           {expanded && (
             <p className="text-[9px] text-[var(--text3)] font-mono">BS-OS v2.6.4-prod</p>
           )}
        </div>
      </div>
    </nav>
  );
}
