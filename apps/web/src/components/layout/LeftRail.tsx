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
  ChevronDown,
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
  Compass,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface RailTab {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  statusText?: string;
  subItems?: { to: string; label: string; icon: ReactNode }[];
}

/* ─── Core tabs: what a forest owner actually needs day-to-day ─── */

const coreStatusSubItems = [
  { to: '/owner/parcels', label: 'Skiften', icon: <TreePine size={16} /> },
  { to: '/owner/surveys', label: 'Inventeringar', icon: <Eye size={16} /> },
  { to: '/owner/calendar', label: 'Kalender', icon: <CalendarDays size={16} /> },
];

const coreTabs: RailTab[] = [
  { to: '/owner/status', label: 'Min Skog', icon: <Shield size={20} />, subItems: coreStatusSubItems },
  { to: '/owner/threats', label: 'Bevakning', icon: <AlertTriangle size={20} />, statusText: 'Inget akut just nu', subItems: [
    { to: '/owner/microclimate', label: 'Barkborreprognos', icon: <Bug size={16} /> },
    { to: '/owner/fire-risk', label: 'Brandrisk', icon: <Flame size={16} /> },
  ] },
  { to: '/owner/wingman', label: 'Fråga skogen', icon: <Sparkles size={20} /> },
];

/* ─── Advanced tabs: hidden behind "Utforska mer" for power users ─── */

const advancedTabs: RailTab[] = [
  { to: '/owner/forest-profile', label: 'Skogsprofil', icon: <Sprout size={20} /> },
  { to: '/owner/satellite-check', label: 'Satellitdata', icon: <Scan size={20} />, subItems: [
    { to: '/owner/satellite-constellation', label: 'Satelliter', icon: <Satellite size={16} /> },
    { to: '/owner/canopy-height', label: 'Kronhöjd', icon: <Ruler size={16} /> },
  ] },
  { to: '/owner/carbon', label: 'Kolbalans', icon: <Leaf size={20} /> },
  { to: '/owner/biodiversity', label: 'Biologisk mångfald', icon: <TreePine size={20} /> },
  { to: '/owner/compliance', label: 'Regelefterlevnad', icon: <ClipboardCheck size={20} /> },
  { to: '/owner/forum', label: 'Grannar & Forum', icon: <Users size={20} />, subItems: [
    { to: '/owner/neighbor-activity', label: 'I närheten', icon: <MapPin size={16} /> },
    { to: '/owner/observations', label: 'Observationer', icon: <Eye size={16} /> },
    { to: '/owner/forum', label: 'Diskussioner', icon: <MessageCircle size={16} /> },
    { to: '/owner/marketplace', label: 'Marknadsplats', icon: <TrendingUp size={16} /> },
  ] },
  { to: '/owner/gallery', label: 'Foton', icon: <Camera size={20} /> },
  { to: '/owner/reports', label: 'Rapporter', icon: <FileBarChart size={20} /> },
  { to: '/owner/academy', label: 'Lär dig mer', icon: <GraduationCap size={20} /> },
  { to: '/owner/research', label: 'Forskning', icon: <BookOpen size={20} /> },
  { to: '/owner/ai-lab', label: 'AI-labb', icon: <BrainCircuit size={20} /> },
  { to: '/owner/settings', label: 'Inställningar', icon: <Settings size={20} /> },
];

/* ─── Expandable "Utforska mer" section ─── */

function AdvancedSection({
  tabs,
  location,
  forceExpanded,
  onClose,
}: {
  tabs: RailTab[];
  location: ReturnType<typeof useLocation>;
  forceExpanded?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);

  // Auto-open if user is on an advanced page
  const isOnAdvanced = tabs.some(
    (t) => location.pathname === t.to || location.pathname.startsWith(t.to + '/'),
  );
  const showContent = open || isOnAdvanced;

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-all duration-300"
      >
        <Compass size={16} />
        <span className="flex-1 text-left tracking-tight">Utforska mer</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${showContent ? 'rotate-180' : ''}`}
        />
      </button>

      {showContent && (
        <div className="mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
          {tabs.map((tab) => {
            const isActive =
              location.pathname === tab.to || location.pathname.startsWith(tab.to + '/');
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                onClick={() => forceExpanded && onClose?.()}
                className={`
                  flex items-center gap-2.5 px-4 py-2 rounded-lg text-[13px] font-medium
                  transition-all duration-300
                  ${isActive
                    ? 'text-[var(--green)] bg-[var(--green)]/5 font-bold'
                    : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                  }
                `}
              >
                <span className="opacity-60 shrink-0">{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
        {coreTabs.map((tab) => {
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
                </span>

                {expanded && (
                  <span className="whitespace-nowrap flex-1 tracking-tight">{tab.label}</span>
                )}

                {/* Plain-language status instead of badge number */}
                {expanded && tab.statusText && (
                  <span className="text-[10px] text-[var(--text3)] font-normal whitespace-nowrap">
                    {tab.statusText}
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

        {/* ─── "Utforska mer" expandable section for advanced tools ─── */}
        {expanded && (
          <AdvancedSection
            tabs={advancedTabs}
            location={location}
            forceExpanded={forceExpanded}
            onClose={onClose}
          />
        )}
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
