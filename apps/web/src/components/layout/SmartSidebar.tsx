import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, type UserRole } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  LayoutDashboard,
  TreePine,
  Map,
  Bell,
  BrainCircuit,
  FileBarChart,
  Settings,
  Bug,
  Search,
  MoreHorizontal,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
  Flame,
  X,
  Briefcase,
  Wallet,
  ScrollText,
  ClipboardCheck,
  BarChart2,
  Fingerprint,
  Scan,
  Camera,
  ImageIcon,
  Eye,
  ScanEye,
  AlertTriangle,
  Wind,
  Radar,
  Thermometer,
  Sprout,
  GitBranch,
  Leaf,
  Timer,
  TrendingUp,
  BarChart3,
  Calculator,
  Smartphone,
  Truck,
  Route,
  BookMarked,
  FileText,
  Download,
  GraduationCap,
  Video,
  BookA,
  ListChecks,
  BookOpen,
  MessageCircle,
  Store,
  Users,
  RadioTower,
  FolderOpen,
  HeartHandshake,
  MessageSquareQuote,
  Archive,
  Newspaper,
  CalendarDays,
  CreditCard,
  PieChart,
  Factory,
  Trees,
  Hammer,
  ThermometerSun,
  Globe,
  Brain,
  Shield,
  Banknote,
  Workflow,
  Link,
  Layers,
  Cloudy,
  Plane,
  Plus,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  id: string;
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const PINNED_KEY = 'beetlesense-pinned-nav';
const COLLAPSED_KEY = 'beetlesense-sidebar-collapsed';
const RECENT_KEY = 'beetlesense-recent-nav';
const MAX_PINNED = 5;
const MAX_RECENT = 5;

function loadPinned(): string[] {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePinned(ids: string[]) {
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveCollapsed(v: boolean) {
  localStorage.setItem(COLLAPSED_KEY, String(v));
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(ids: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
}

// ---------------------------------------------------------------------------
// Navigation definitions
// ---------------------------------------------------------------------------

function getCoreOwnerNav(t: (k: string, o?: any) => string): NavItem[] {
  return [
    { id: 'dashboard', to: '/owner/dashboard', label: t('nav.dashboard', 'Idag'), icon: LayoutDashboard },
    { id: 'map', to: '/owner/map', label: t('nav.map', 'Karta'), icon: Map },
    { id: 'advisor', to: '/owner/advisor', label: t('nav.advisor', 'AI Kompanjon'), icon: BrainCircuit },
    { id: 'alerts', to: '/owner/alerts', label: t('nav.alerts', 'Aviseringar'), icon: Bell },
    { id: 'parcels', to: '/owner/parcels', label: t('nav.parcels', 'Skiften'), icon: TreePine },
    { id: 'reports', to: '/owner/reports', label: t('nav.reports', 'Rapporter'), icon: FileBarChart },
  ];
}

function getMoreOwnerCategories(t: (k: string, o?: any) => string): NavCategory[] {
  return [
    {
      label: t('nav.forestManagement', 'Forest Management'),
      items: [
        { id: 'forest-profile', to: '/owner/forest-profile', label: t('nav.forestProfile', 'Forest Profile'), icon: Fingerprint },
        { id: 'portfolio', to: '/owner/portfolio', label: t('nav.portfolio', 'Portfolio'), icon: PieChart },
        { id: 'surveys', to: '/owner/surveys', label: t('nav.surveys', 'Surveys'), icon: Scan },
        { id: 'capture', to: '/owner/capture', label: t('nav.capture', 'Capture'), icon: Camera },
        { id: 'gallery', to: '/owner/gallery', label: t('nav.gallery', 'Gallery'), icon: ImageIcon },
        { id: 'vision', to: '/owner/vision', label: t('nav.vision', 'Vision'), icon: Eye },
        { id: 'silviculture', to: '/owner/silviculture', label: t('nav.silviculture', 'Silviculture'), icon: Trees },
      ],
    },
    {
      label: t('nav.monitoring', 'Monitoring & Alerts'),
      items: [
        { id: 'notifications', to: '/owner/notifications', label: t('nav.notifications', 'Notifications'), icon: Bell },
        { id: 'satellite-check', to: '/owner/satellite-check', label: t('nav.satelliteCheck', 'Satellite Check'), icon: ScanEye },
        { id: 'early-warning', to: '/owner/early-warning', label: t('nav.earlyWarning', 'Early Warning'), icon: AlertTriangle },
        { id: 'storm-risk', to: '/owner/storm-risk', label: t('nav.stormRisk', 'Storm Risk'), icon: Wind },
        { id: 'neighbor-activity', to: '/owner/neighbor-activity', label: t('nav.neighborActivity', 'Neighbor Activity'), icon: Radar },
        { id: 'microclimate', to: '/owner/microclimate', label: t('nav.microclimate', 'Microclimate'), icon: Thermometer },
        { id: 'microclimate-model', to: '/owner/microclimate-model', label: t('nav.microclimateModel', 'Microclimate Modeling'), icon: ThermometerSun },
        { id: 'early-detection', to: '/owner/early-detection', label: t('nav.earlyDetection', 'Early Detection'), icon: ScanEye },
        { id: 'cross-border', to: '/owner/cross-border', label: t('nav.crossBorder', 'Cross-Border Alert'), icon: Globe },
        { id: 'auto-monitor', to: '/owner/auto-monitor', label: t('nav.autoMonitor', 'Autonomous Monitoring'), icon: Workflow },
        { id: 'animal-inventory', to: '/owner/animal-inventory', label: t('nav.animalInventory', 'Animal Inventory'), icon: Scan },
      ],
    },
    {
      label: t('nav.analysisTools', 'Analysis & Tools'),
      items: [
        { id: 'growth-model', to: '/owner/growth-model', label: t('nav.growthModel', 'Growth Model'), icon: Sprout },
        { id: 'scenarios', to: '/owner/scenarios', label: t('nav.scenarios', 'Scenarios'), icon: GitBranch },
        { id: 'carbon', to: '/owner/carbon', label: t('nav.carbon', 'Carbon'), icon: Leaf },
        { id: 'long-rotation', to: '/owner/long-rotation', label: t('nav.longRotation', 'Long Rotation'), icon: Timer },
        { id: 'timber-market', to: '/owner/timber-market', label: t('nav.timberMarket', 'Timber Market'), icon: TrendingUp },
        { id: 'contract-optimizer', to: '/owner/contract-optimizer', label: t('nav.contractOptimizer', 'Contract Optimizer'), icon: ScrollText },
        { id: 'mill-radar', to: '/owner/mill-radar', label: t('nav.millRadar', 'Mill Radar'), icon: Factory },
        { id: 'benchmark', to: '/owner/benchmark', label: t('nav.benchmark', 'Benchmark'), icon: BarChart3 },
        { id: 'simulator', to: '/owner/simulator', label: t('nav.simulator', 'Simulator'), icon: Calculator },
        { id: 'digital-twin', to: '/owner/digital-twin', label: t('nav.digitalTwin', 'Digital Twin'), icon: Layers },
        { id: 'forest-plan', to: '/owner/forest-plan', label: t('nav.forestPlan', 'AI Forest Plan'), icon: Brain },
        { id: 'hedging', to: '/owner/hedging', label: t('nav.hedging', 'Timber Hedging'), icon: TrendingUp },
        { id: 'external-data', to: '/owner/external-data', label: t('nav.externalData', 'External Data'), icon: Globe },
        { id: 'climate-adaptation', to: '/owner/climate-adaptation', label: t('nav.climateAdaptation', 'Climate Adaptation'), icon: Cloudy },
      ],
    },
    {
      label: t('nav.fieldWork', 'Field & Operations'),
      items: [
        { id: 'field-mode', to: '/owner/field-mode', label: t('nav.fieldMode', 'Field Mode'), icon: Smartphone },
        { id: 'contractors', to: '/owner/contractors', label: t('nav.contractors', 'Contractors'), icon: Truck },
        { id: 'contractor-marketplace', to: '/owner/contractor-marketplace', label: t('nav.contractorMarketplace', 'Contractor Marketplace'), icon: Hammer },
        { id: 'harvest-logistics', to: '/owner/harvest-logistics', label: t('nav.harvestLogistics', 'Harvest Logistics'), icon: Route },
        { id: 'field-guides', to: '/owner/field-guides', label: t('nav.fieldGuides', 'Field Guides'), icon: BookMarked },
      ],
    },
    {
      label: t('nav.reportsExport', 'Reports & Export'),
      items: [
        { id: 'report-builder', to: '/owner/report-builder', label: t('nav.reportBuilder', 'Report Builder'), icon: FileText },
        { id: 'export', to: '/owner/export', label: t('nav.export', 'Data Export'), icon: Download },
      ],
    },
    {
      label: t('nav.learning', 'Learning'),
      items: [
        { id: 'academy', to: '/owner/academy', label: t('nav.academy', 'Academy'), icon: GraduationCap },
        { id: 'tutorials', to: '/owner/tutorials', label: t('nav.tutorials', 'Video Tutorials'), icon: Video },
        { id: 'glossary', to: '/owner/glossary', label: t('nav.glossary', 'Glossary'), icon: BookA },
        { id: 'first-year', to: '/owner/first-year', label: t('nav.firstYear', 'First Year'), icon: ListChecks },
        { id: 'research', to: '/owner/research', label: t('nav.research', 'Research'), icon: BookOpen },
      ],
    },
    {
      label: t('nav.community', 'Community & Market'),
      items: [
        { id: 'community', to: '/owner/community', label: t('nav.community', 'Community'), icon: MessageCircle },
        { id: 'group-selling', to: '/owner/group-selling', label: t('nav.groupSelling', 'Group Selling'), icon: Users },
        { id: 'marketplace', to: '/owner/marketplace', label: t('nav.marketplace', 'Marketplace'), icon: Store },
        { id: 'professionals', to: '/owner/professionals', label: t('nav.professionals', 'Professionals'), icon: Users },
        { id: 'ecosystem-services', to: '/owner/ecosystem-services', label: t('nav.ecosystemServices', 'Ecosystem Services'), icon: Leaf },
        { id: 'biodiversity', to: '/owner/biodiversity', label: t('nav.biodiversity', 'Biodiversity Credits'), icon: Sprout },
        { id: 'forest-finance', to: '/owner/forest-finance', label: t('nav.forestFinance', 'Forest Finance'), icon: Banknote },
        { id: 'insurance', to: '/owner/insurance', label: t('nav.insurance', 'Insurance'), icon: Shield },
        { id: 'non-timber', to: '/owner/non-timber', label: t('nav.nonTimber', 'Non-Timber Income'), icon: Store },
      ],
    },
    {
      label: t('nav.compliancePlanning', 'Compliance & Planning'),
      items: [
        { id: 'compliance', to: '/owner/compliance', label: t('nav.compliance', 'Compliance'), icon: ClipboardCheck },
        { id: 'provenance', to: '/owner/provenance', label: t('nav.provenance', 'Timber Provenance'), icon: Link },
        { id: 'certifications', to: '/owner/certifications', label: t('nav.certifications', 'Certifications'), icon: Shield },
        { id: 'regulatory-radar', to: '/owner/regulatory-radar', label: t('nav.regulatoryRadar', 'Regulatory Radar'), icon: RadioTower },
        { id: 'documents', to: '/owner/documents', label: t('nav.documents', 'Documents'), icon: FolderOpen },
        { id: 'succession', to: '/owner/succession', label: t('nav.succession', 'Succession'), icon: HeartHandshake },
        { id: 'succession-plan', to: '/owner/succession-plan', label: t('nav.successionPlan', 'Succession Plan'), icon: HeartHandshake },
        { id: 'knowledge', to: '/owner/knowledge', label: t('nav.knowledge', 'Knowledge'), icon: MessageSquareQuote },
        { id: 'archive', to: '/owner/archive', label: t('nav.archive', 'Archive'), icon: Archive },
      ],
    },
    {
      label: t('nav.other', 'Other'),
      items: [
        { id: 'news', to: '/owner/news', label: t('nav.news', 'News'), icon: Newspaper },
        { id: 'calendar', to: '/owner/calendar', label: t('nav.calendar', 'Calendar'), icon: CalendarDays },
        { id: 'billing', to: '/owner/billing', label: t('nav.billing', 'Billing'), icon: CreditCard },
      ],
    },
  ];
}

function getPilotCore(t: (k: string, o?: any) => string): NavItem[] {
  return [
    { id: 'dashboard', to: '/pilot/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'jobs', to: '/pilot/jobs', label: t('nav.jobs', 'Missions'), icon: Briefcase },
    { id: 'mission-control', to: '/pilot/mission-control', label: t('nav.missionControl', 'Uppdragskontroll'), icon: Plane },
    { id: 'drone-registration', to: '/pilot/drone-registration', label: t('nav.droneRegistration', 'Registrera drönare'), icon: Plus },
    { id: 'flight-log', to: '/pilot/flight-log', label: t('nav.flightLog', 'Flight Log'), icon: ScrollText },
    { id: 'earnings', to: '/pilot/earnings', label: t('nav.earnings', 'Earnings'), icon: Wallet },
    { id: 'settings', to: '/pilot/settings', label: t('nav.settings', 'Settings'), icon: Settings },
  ];
}

function getInspectorCore(t: (k: string, o?: any) => string): NavItem[] {
  return [
    { id: 'dashboard', to: '/inspector/dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'surveys', to: '/inspector/surveys', label: t('nav.surveys', 'Inspections'), icon: ClipboardCheck },
    { id: 'reports', to: '/inspector/reports', label: t('nav.reports', 'Reports'), icon: FileBarChart },
    { id: 'analytics', to: '/inspector/analytics', label: t('nav.analytics', 'Analytics'), icon: BarChart2 },
    { id: 'settings', to: '/inspector/settings', label: t('nav.settings', 'Settings'), icon: Settings },
  ];
}

// ---------------------------------------------------------------------------
// Flattened lookup: id -> NavItem  (for resolving pinned items)
// ---------------------------------------------------------------------------

function flattenCategories(categories: NavCategory[]): NavItem[] {
  return categories.flatMap((c) => c.items);
}

// ---------------------------------------------------------------------------
// Drag & drop helpers (minimal, no library)
// ---------------------------------------------------------------------------

function usePinnedDrag(pinned: string[], setPinned: (ids: string[]) => void) {
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const onDragStart = (index: number) => {
    dragItem.current = index;
  };

  const onDragEnter = (index: number) => {
    dragOver.current = index;
  };

  const onDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    const copy = [...pinned];
    const [removed] = copy.splice(dragItem.current, 1);
    copy.splice(dragOver.current, 0, removed);
    dragItem.current = null;
    dragOver.current = null;
    setPinned(copy);
    savePinned(copy);
  };

  return { onDragStart, onDragEnter, onDragEnd };
}

// ---------------------------------------------------------------------------
// Component: NavItemLink
// ---------------------------------------------------------------------------

function NavItemLink({
  item,
  collapsed,
  active,
  onNavigate,
  trailing,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
  trailing?: ReactNode;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`
        group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 relative
        ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
        ${active
          ? 'bg-[var(--green)]/10 text-[var(--green)]'
          : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
        }
      `}
    >
      {active && !collapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--green)]" />
      )}
      <Icon
        size={20}
        className={active ? 'text-[var(--green)]' : 'text-[var(--text3)] group-hover:text-[var(--text2)]'}
      />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && trailing}
    </NavLink>
  );
}

// ---------------------------------------------------------------------------
// Component: MorePanel (overlay)
// ---------------------------------------------------------------------------

function MorePanel({
  categories,
  allItems,
  pinned,
  recentIds,
  onTogglePin,
  onClose,
  onNavigate,
}: {
  categories: NavCategory[];
  allItems: NavItem[];
  pinned: string[];
  recentIds: string[];
  onTogglePin: (id: string) => void;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const lowerFilter = filter.toLowerCase();

  // Recent items (only non-core ones that exist in allItems)
  const recentItems = recentIds
    .map((id) => allItems.find((i) => i.id === id))
    .filter((i): i is NavItem => !!i);

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        item.label.toLowerCase().includes(lowerFilter) || item.id.toLowerCase().includes(lowerFilter),
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="absolute left-full top-0 bottom-0 z-50 w-72 bg-[var(--bg2)] border-r border-[var(--border)] shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-sm font-semibold text-[var(--text)]">Mer</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)]"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Filter */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            ref={inputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-[var(--bg3)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {/* Recent */}
        {!filter && recentItems.length > 0 && (
          <div className="mb-3">
            <p className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
              Senaste
            </p>
            {recentItems.map((item) => {
              const Icon = item.icon;
              const isPinned = pinned.includes(item.id);
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <div key={item.id} className="group flex items-center">
                  <NavLink
                    to={item.to}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors
                      ${isActive
                        ? 'text-[var(--green)] bg-[var(--green)]/5'
                        : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                      }
                    `}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                  <button
                    onClick={() => onTogglePin(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--green)] transition-opacity"
                    title={isPinned ? 'Unpin' : 'Pin'}
                    aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                  >
                    {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Categories */}
        {filteredCategories.map((cat) => (
          <div key={cat.label} className="mb-3">
            <p className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
              {cat.label}
            </p>
            {cat.items.map((item) => {
              const Icon = item.icon;
              const isPinned = pinned.includes(item.id);
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <div key={item.id} className="group flex items-center">
                  <NavLink
                    to={item.to}
                    onClick={() => onNavigate(item.id)}
                    className={`
                      flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-colors
                      ${isActive
                        ? 'text-[var(--green)] bg-[var(--green)]/5'
                        : 'text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                      }
                    `}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                  <button
                    onClick={() => onTogglePin(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--green)] transition-opacity"
                    title={isPinned ? 'Unpin' : 'Pin'}
                    aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
                  >
                    {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <p className="text-xs text-[var(--text3)] text-center py-6">Inga resultat</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SmartSidebar
// ---------------------------------------------------------------------------

export default function SmartSidebar() {
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const location = useLocation();
  const _navigate = useNavigate();
  const role: UserRole = profile?.role ?? 'owner';

  // State
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pinned, setPinned] = useState<string[]>(loadPinned);
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);

  // Derived nav data based on role
  const isOwner = role === 'owner' || role === 'admin';
  const coreItems = isOwner
    ? getCoreOwnerNav(t)
    : role === 'pilot'
      ? getPilotCore(t)
      : getInspectorCore(t);

  const moreCategories = isOwner ? getMoreOwnerCategories(t) : [];
  const allMoreItems = flattenCategories(moreCategories);

  // Resolve pinned NavItems
  const pinnedItems = pinned
    .map((id) => allMoreItems.find((i) => i.id === id))
    .filter((i): i is NavItem => !!i);

  // Drag & drop for pinned
  const { onDragStart, onDragEnter, onDragEnd } = usePinnedDrag(pinned, setPinned);

  // Track recent pages
  useEffect(() => {
    const match = allMoreItems.find(
      (i) => location.pathname === i.to || location.pathname.startsWith(i.to + '/'),
    );
    if (match) {
      setRecentIds((prev) => {
        const next = [match.id, ...prev.filter((id) => id !== match.id)].slice(0, MAX_RECENT);
        saveRecent(next);
        return next;
      });
    }
  }, [location.pathname]);

  // Pin / unpin
  const togglePin = useCallback(
    (id: string) => {
      setPinned((prev) => {
        const next = prev.includes(id)
          ? prev.filter((p) => p !== id)
          : prev.length < MAX_PINNED
            ? [...prev, id]
            : prev;
        savePinned(next);
        return next;
      });
    },
    [],
  );

  // Collapse toggle
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      saveCollapsed(!prev);
      return !prev;
    });
    setMoreOpen(false);
  }, []);

  // Quick search — just fire Cmd+K
  const openCommandPalette = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  }, []);

  // Close more panel when navigating
  const handleMoreNavigate = useCallback((_id: string) => {
    setMoreOpen(false);
    // Recent tracking happens via the location effect
  }, []);

  // Active detection helper
  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  // Streak (placeholder — would come from a store in production)
  const streak = 5;

  return (
    <nav
      className={`relative flex flex-col h-full border-r border-[var(--border)] transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-[var(--sidebar-width)]'
      }`}
      style={{ background: 'var(--bg2)' }}
      aria-label="Main navigation"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Logo area                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={`flex items-center gap-3 h-[var(--topbar-height)] border-b border-[var(--border)] ${
          collapsed ? 'justify-center px-2' : 'px-5'
        }`}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)] shrink-0">
          <Bug size={18} className="text-[var(--green)]" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-[var(--text)] tracking-tight truncate">
              BeetleSense
            </span>
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase tracking-widest">
              {role}
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Quick search trigger                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className={`px-3 pt-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          onClick={openCommandPalette}
          className={`
            flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg3)] text-[var(--text3)]
            hover:text-[var(--text2)] hover:border-[var(--border2)] transition-colors
            ${collapsed ? 'p-2' : 'w-full px-3 py-1.5 text-xs'}
          `}
          aria-label="Search (Cmd+K)"
        >
          <Search size={14} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Sok...</span>
              <kbd className="text-[10px] font-mono bg-[var(--bg)] px-1 py-0.5 rounded border border-[var(--border)]">
                ⌘K
              </kbd>
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Core nav                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-2 pt-3 space-y-0.5">
        {coreItems.map((item) => (
          <NavItemLink
            key={item.id}
            item={item}
            collapsed={collapsed}
            active={isActive(item.to)}
          />
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pinned favorites (owner/admin only)                                 */}
      {/* ------------------------------------------------------------------ */}
      {isOwner && (
        <div className="px-2 pt-4">
          {!collapsed && (
            <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
              Favoriter
            </p>
          )}
          {pinnedItems.length > 0 ? (
            <div className="space-y-0.5">
              {pinnedItems.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragEnter={() => onDragEnter(idx)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="group relative"
                >
                  <NavItemLink
                    item={item}
                    collapsed={collapsed}
                    active={isActive(item.to)}
                    trailing={
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          togglePin(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-opacity"
                        aria-label={`Unpin ${item.label}`}
                      >
                        <PinOff size={12} />
                      </button>
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            !collapsed && (
              <p className="px-3 py-2 text-[11px] text-[var(--text3)] italic">
                Fast favoriter har
              </p>
            )
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* "Mer" button (owner/admin only)                                     */}
      {/* ------------------------------------------------------------------ */}
      {isOwner && (
        <div className="px-2 pt-2">
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`
              flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 w-full
              ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
              ${moreOpen
                ? 'bg-[var(--bg3)] text-[var(--text)]'
                : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
              }
            `}
            aria-expanded={moreOpen}
            aria-label="More pages"
            title={collapsed ? 'Mer' : undefined}
          >
            <MoreHorizontal size={20} />
            {!collapsed && <span>Mer</span>}
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* ------------------------------------------------------------------ */}
      {/* Bottom section                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className={`border-t border-[var(--border)] ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}>
        {/* Streak + Settings row */}
        <div className={`flex items-center mb-2 ${collapsed ? 'flex-col gap-2' : 'gap-2'}`}>
          {/* Streak badge */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold shrink-0"
            title={`${streak} day streak`}
          >
            <Flame size={12} />
            {streak}
          </div>

          {!collapsed && <div className="flex-1" />}

          {/* Settings */}
          <NavLink
            to={`/${role === 'admin' ? 'owner' : role}/settings`}
            className={`p-1.5 rounded-lg transition-colors ${
              isActive(`/${role === 'admin' ? 'owner' : role}/settings`)
                ? 'text-[var(--green)] bg-[var(--green)]/10'
                : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
            }`}
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={18} />
          </NavLink>

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* User avatar + name */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[var(--green)]">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? profile?.email?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text)] truncate">
                {profile?.full_name ?? profile?.email ?? 'User'}
              </p>
              <p className="text-[10px] text-[var(--text3)] truncate">
                {profile?.email ?? ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* More overlay panel                                                  */}
      {/* ------------------------------------------------------------------ */}
      {moreOpen && !collapsed && (
        <MorePanel
          categories={moreCategories}
          allItems={allMoreItems}
          pinned={pinned}
          recentIds={recentIds}
          onTogglePin={togglePin}
          onClose={() => setMoreOpen(false)}
          onNavigate={handleMoreNavigate}
        />
      )}

      {/* Collapsed more: open as overlay on click */}
      {moreOpen && collapsed && (
        <div className="absolute left-full top-0 bottom-0 z-50">
          <MorePanel
            categories={moreCategories}
            allItems={allMoreItems}
            pinned={pinned}
            recentIds={recentIds}
            onTogglePin={togglePin}
            onClose={() => setMoreOpen(false)}
            onNavigate={handleMoreNavigate}
          />
        </div>
      )}
    </nav>
  );
}
