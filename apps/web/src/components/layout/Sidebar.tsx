import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  TreePine,
  Scan,
  FileBarChart,
  Settings,
  Briefcase,
  Wallet,
  ClipboardCheck,
  Bug,
  Newspaper,
  Eye,
  Camera,
  Bell,
  BookOpen,
  ImageIcon,
  CalendarDays,
  Fingerprint,
  MessageCircle,
  ListChecks,
  Calculator,
  BookA,
  FolderOpen,
  GitBranch,
  Users,
  PieChart,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Sprout,
  Truck,
  Wind,
  Leaf,
  BrainCircuit,
  Archive,
  ScanEye,
  Thermometer,
  HeartHandshake,
  Radar,
  Route,
  MessageSquareQuote,
  Timer,
  Store,
  RadioTower,
  GraduationCap,
  ChevronDown,
  CreditCard,
  Smartphone,
  FileText,
  Video,
  BookMarked,
  Download,
  ScrollText,
  BarChart2,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface NavGroup {
  label: string;
  icon: ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

function getOwnerNav(t: (key: string, options?: any) => string): NavEntry[] {
  return [
    { to: '/owner/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
    { to: '/owner/portfolio', label: t('nav.portfolio'), icon: <PieChart size={20} /> },
    {
      label: t('nav.forestManagement', 'Forest Management'),
      icon: <TreePine size={20} />,
      defaultOpen: true,
      items: [
        { to: '/owner/forest-profile', label: t('nav.forestProfile'), icon: <Fingerprint size={20} /> },
        { to: '/owner/parcels', label: t('nav.parcels'), icon: <TreePine size={20} /> },
        { to: '/owner/surveys', label: t('nav.surveys'), icon: <Scan size={20} /> },
        { to: '/owner/capture', label: t('nav.capture'), icon: <Camera size={20} /> },
        { to: '/owner/gallery', label: t('nav.gallery'), icon: <ImageIcon size={20} /> },
        { to: '/owner/vision', label: t('nav.vision'), icon: <Eye size={20} /> },
      ],
    },
    {
      label: t('nav.monitoring', 'Monitoring & Alerts'),
      icon: <AlertTriangle size={20} />,
      items: [
        { to: '/owner/alerts', label: t('nav.alerts'), icon: <Bell size={20} /> },
        { to: '/owner/notifications', label: t('nav.notifications', 'Notifications'), icon: <Bell size={20} /> },
        { to: '/owner/satellite-check', label: t('nav.satelliteCheck'), icon: <ScanEye size={20} /> },
        { to: '/owner/early-warning', label: t('nav.earlyWarning'), icon: <AlertTriangle size={20} /> },
        { to: '/owner/storm-risk', label: t('nav.stormRisk'), icon: <Wind size={20} /> },
        { to: '/owner/neighbor-activity', label: t('nav.neighborActivity'), icon: <Radar size={20} /> },
        { to: '/owner/microclimate', label: t('nav.microclimate'), icon: <Thermometer size={20} /> },
      ],
    },
    {
      label: t('nav.analysisTools', 'Analysis & Tools'),
      icon: <BrainCircuit size={20} />,
      items: [
        { to: '/owner/advisor', label: t('nav.advisor'), icon: <BrainCircuit size={20} /> },
        { to: '/owner/growth-model', label: t('nav.growthModel'), icon: <Sprout size={20} /> },
        { to: '/owner/scenarios', label: t('nav.scenarios'), icon: <GitBranch size={20} /> },
        { to: '/owner/carbon', label: t('nav.carbon'), icon: <Leaf size={20} /> },
        { to: '/owner/long-rotation', label: t('nav.longRotation'), icon: <Timer size={20} /> },
        { to: '/owner/timber-market', label: t('nav.timberMarket'), icon: <TrendingUp size={20} /> },
        { to: '/owner/benchmark', label: t('nav.benchmark'), icon: <BarChart3 size={20} /> },
        { to: '/owner/simulator', label: t('nav.simulator'), icon: <Calculator size={20} /> },
      ],
    },
    {
      label: t('nav.fieldWork', 'Field & Operations'),
      icon: <Smartphone size={20} />,
      items: [
        { to: '/owner/field-mode', label: t('nav.fieldMode', 'Field Mode'), icon: <Smartphone size={20} /> },
        { to: '/owner/contractors', label: t('nav.contractors'), icon: <Truck size={20} /> },
        { to: '/owner/harvest-logistics', label: t('nav.harvestLogistics'), icon: <Route size={20} /> },
        { to: '/owner/field-guides', label: t('nav.fieldGuides', 'Field Guides'), icon: <BookMarked size={20} /> },
      ],
    },
    {
      label: t('nav.reportsExport', 'Reports & Export'),
      icon: <FileBarChart size={20} />,
      items: [
        { to: '/owner/reports', label: t('nav.reports'), icon: <FileBarChart size={20} /> },
        { to: '/owner/report-builder', label: t('nav.reportBuilder', 'Report Builder'), icon: <FileText size={20} /> },
        { to: '/owner/export', label: t('nav.export', 'Data Export'), icon: <Download size={20} /> },
      ],
    },
    {
      label: t('nav.learning', 'Learning'),
      icon: <GraduationCap size={20} />,
      items: [
        { to: '/owner/academy', label: t('nav.academy'), icon: <GraduationCap size={20} /> },
        { to: '/owner/tutorials', label: t('nav.tutorials', 'Video Tutorials'), icon: <Video size={20} /> },
        { to: '/owner/glossary', label: t('nav.glossary'), icon: <BookA size={20} /> },
        { to: '/owner/first-year', label: t('nav.firstYear'), icon: <ListChecks size={20} /> },
        { to: '/owner/research', label: t('nav.research'), icon: <BookOpen size={20} /> },
      ],
    },
    {
      label: t('nav.community', 'Community & Market'),
      icon: <MessageCircle size={20} />,
      items: [
        { to: '/owner/community', label: t('nav.community'), icon: <MessageCircle size={20} /> },
        { to: '/owner/marketplace', label: t('nav.marketplace'), icon: <Store size={20} /> },
        { to: '/owner/professionals', label: t('nav.professionals'), icon: <Users size={20} /> },
      ],
    },
    {
      label: t('nav.compliancePlanning', 'Compliance & Planning'),
      icon: <ClipboardCheck size={20} />,
      items: [
        { to: '/owner/compliance', label: t('nav.compliance'), icon: <ClipboardCheck size={20} /> },
        { to: '/owner/regulatory-radar', label: t('nav.regulatoryRadar'), icon: <RadioTower size={20} /> },
        { to: '/owner/documents', label: t('nav.documents'), icon: <FolderOpen size={20} /> },
        { to: '/owner/succession', label: t('nav.succession'), icon: <HeartHandshake size={20} /> },
        { to: '/owner/knowledge', label: t('nav.knowledge'), icon: <MessageSquareQuote size={20} /> },
        { to: '/owner/archive', label: t('nav.archive'), icon: <Archive size={20} /> },
      ],
    },
    { to: '/owner/news', label: t('nav.news'), icon: <Newspaper size={20} /> },
    { to: '/owner/calendar', label: t('nav.calendar'), icon: <CalendarDays size={20} /> },
    { to: '/owner/billing', label: t('nav.billing', 'Billing'), icon: <CreditCard size={20} /> },
    { to: '/owner/settings', label: t('nav.settings'), icon: <Settings size={20} /> },
  ];
}

function getPilotNav(t: (key: string, options?: any) => string): NavEntry[] {
  return [
    { to: '/pilot/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
    { to: '/pilot/jobs', label: t('nav.jobs'), icon: <Briefcase size={20} /> },
    { to: '/pilot/flight-log', label: t('nav.flightLog', 'Flight Log'), icon: <ScrollText size={20} /> },
    { to: '/pilot/earnings', label: t('nav.earnings'), icon: <Wallet size={20} /> },
    { to: '/pilot/settings', label: t('nav.settings'), icon: <Settings size={20} /> },
  ];
}

function getInspectorNav(t: (key: string, options?: any) => string): NavEntry[] {
  return [
    { to: '/inspector/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} /> },
    { to: '/inspector/surveys', label: t('nav.surveys'), icon: <ClipboardCheck size={20} /> },
    { to: '/inspector/reports', label: t('nav.reports'), icon: <FileBarChart size={20} /> },
    { to: '/inspector/analytics', label: t('nav.analytics', 'Analytics'), icon: <BarChart2 size={20} /> },
    { to: '/inspector/settings', label: t('nav.settings'), icon: <Settings size={20} /> },
  ];
}

function getNavEntries(role: UserRole, t: (key: string, options?: any) => string): NavEntry[] {
  switch (role) {
    case 'owner':
    case 'admin':
      return getOwnerNav(t);
    case 'pilot':
      return getPilotNav(t);
    case 'inspector':
      return getInspectorNav(t);
    default:
      return [];
  }
}

function CollapsibleGroup({ group, location }: { group: NavGroup; location: ReturnType<typeof useLocation> }) {
  const hasActiveChild = group.items.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/'),
  );
  const [open, setOpen] = useState(group.defaultOpen || hasActiveChild);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
          ${hasActiveChild ? 'text-[var(--green)]' : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'}
        `}
      >
        <span className={hasActiveChild ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>
          {group.icon}
        </span>
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="ml-4 pl-3 border-l border-[var(--border)] mt-1 space-y-0.5">
          {group.items.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-all duration-150 relative
                  ${isActive
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                  }
                `}
              >
                <span className={isActive ? 'text-[var(--green)]' : 'text-[var(--text3)] group-hover:text-[var(--text2)]'}>
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const role = profile?.role ?? 'owner';
  const navEntries = getNavEntries(role, t);

  return (
    <nav
      className="flex flex-col w-[var(--sidebar-width)] h-full border-r border-[var(--border)]"
      style={{ background: 'var(--bg2)' }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[var(--topbar-height)] border-b border-[var(--border)]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)]">
          <Bug size={18} className="text-[var(--green)]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-[var(--text)] tracking-tight">
              BeetleSense
            </span>
            {!isSupabaseConfigured && (
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20">
                DEMO
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">
            {role}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navEntries.map((entry, idx) => {
          if (isGroup(entry)) {
            return <CollapsibleGroup key={idx} group={entry} location={location} />;
          }
          const isActive =
            location.pathname === entry.to || location.pathname.startsWith(entry.to + '/');
          return (
            <NavLink
              key={entry.to}
              to={entry.to}
              aria-current={isActive ? 'page' : undefined}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 relative
                ${isActive
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--green)]" />
              )}
              <span className={isActive ? 'text-[var(--green)]' : 'text-[var(--text3)] group-hover:text-[var(--text2)]'}>
                {entry.icon}
              </span>
              {entry.label}
            </NavLink>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center">
            <span className="text-xs font-semibold text-[var(--green)]">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? profile?.email?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text)] truncate">
              {profile?.full_name ?? profile?.email ?? 'User'}
            </p>
            <p className="text-[10px] text-[var(--text3)] truncate">
              {profile?.email ?? ''}
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}
