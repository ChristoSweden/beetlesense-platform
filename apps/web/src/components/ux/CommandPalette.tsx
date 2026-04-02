import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  LayoutDashboard,
  TreePine,
  Scan,
  FileBarChart,
  Settings,
  Bell,
  Camera,
  Eye,
  BrainCircuit,
  Leaf,
  Calculator,
  MessageCircle,
  CalendarDays,
  Newspaper,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Sprout,
  Truck,
  Wind,
  PieChart,
  Fingerprint,
  Users,
  Store,
  ClipboardCheck,
  Command,
  ArrowRight,
  Clock,
  Star,
} from 'lucide-react';
import type { ReactNode } from 'react';

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  action: () => void;
  keywords?: string[];
  section: 'navigation' | 'actions' | 'recent';
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Recent pages from localStorage
  const [recentPages, setRecentPages] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bs-recent-pages');
      if (stored) setRecentPages(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [open]);

  const addRecent = useCallback((path: string) => {
    try {
      const stored = localStorage.getItem('bs-recent-pages');
      const arr: string[] = stored ? JSON.parse(stored) : [];
      const updated = [path, ...arr.filter((p) => p !== path)].slice(0, 5);
      localStorage.setItem('bs-recent-pages', JSON.stringify(updated));
    } catch { /* ignore */ }
  }, []);

  const go = useCallback(
    (path: string) => {
      addRecent(path);
      navigate(path);
      setOpen(false);
    },
    [navigate, addRecent],
  );

  const navItems: PaletteItem[] = useMemo(
    () => [
      { id: 'today', label: t('nav.todayFeed', 'Today'), icon: <Star size={18} />, action: () => go('/owner/today'), keywords: ['feed', 'home'], section: 'navigation' as const },
      { id: 'dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={18} />, action: () => go('/owner/dashboard'), keywords: ['overview', 'stats'], section: 'navigation' as const },
      { id: 'portfolio', label: t('nav.portfolio'), icon: <PieChart size={18} />, action: () => go('/owner/portfolio'), keywords: ['holdings', 'value'], section: 'navigation' as const },
      { id: 'parcels', label: t('nav.parcels'), icon: <TreePine size={18} />, action: () => go('/owner/parcels'), keywords: ['forest', 'plots', 'skiften'], section: 'navigation' as const },
      { id: 'surveys', label: t('nav.surveys'), icon: <Scan size={18} />, action: () => go('/owner/surveys'), keywords: ['drone', 'inspection'], section: 'navigation' as const },
      { id: 'capture', label: t('nav.capture'), icon: <Camera size={18} />, action: () => go('/owner/capture'), keywords: ['photo', 'upload'], section: 'navigation' as const },
      { id: 'vision', label: t('nav.vision'), icon: <Eye size={18} />, action: () => go('/owner/vision'), keywords: ['search', 'ai', 'image'], section: 'navigation' as const },
      { id: 'alerts', label: t('nav.alerts'), icon: <Bell size={18} />, action: () => go('/owner/alerts'), keywords: ['warnings', 'beetle'], section: 'navigation' as const },
      { id: 'early-warning', label: t('nav.earlyWarning'), icon: <AlertTriangle size={18} />, action: () => go('/owner/early-warning'), keywords: ['risk', 'beetle', 'bark'], section: 'navigation' as const },
      { id: 'advisor', label: t('nav.advisor'), icon: <BrainCircuit size={18} />, action: () => go('/owner/advisor'), keywords: ['ai', 'chat', 'ask', 'question'], section: 'navigation' as const },
      { id: 'growth-model', label: t('nav.growthModel'), icon: <Sprout size={18} />, action: () => go('/owner/growth-model'), keywords: ['growth', 'forecast'], section: 'navigation' as const },
      { id: 'timber-market', label: t('nav.timberMarket'), icon: <TrendingUp size={18} />, action: () => go('/owner/timber-market'), keywords: ['price', 'sell', 'market'], section: 'navigation' as const },
      { id: 'carbon', label: t('nav.carbon'), icon: <Leaf size={18} />, action: () => go('/owner/carbon'), keywords: ['carbon', 'credits', 'climate'], section: 'navigation' as const },
      { id: 'storm-risk', label: t('nav.stormRisk'), icon: <Wind size={18} />, action: () => go('/owner/storm-risk'), keywords: ['storm', 'weather', 'wind'], section: 'navigation' as const },
      { id: 'benchmark', label: t('nav.benchmark'), icon: <BarChart3 size={18} />, action: () => go('/owner/benchmark'), keywords: ['compare', 'region'], section: 'navigation' as const },
      { id: 'simulator', label: t('nav.simulator'), icon: <Calculator size={18} />, action: () => go('/owner/simulator'), keywords: ['calculate', 'estimate'], section: 'navigation' as const },
      { id: 'contractors', label: t('nav.contractors'), icon: <Truck size={18} />, action: () => go('/owner/contractors'), keywords: ['hire', 'service'], section: 'navigation' as const },
      { id: 'reports', label: t('nav.reports'), icon: <FileBarChart size={18} />, action: () => go('/owner/reports'), keywords: ['pdf', 'export'], section: 'navigation' as const },
      { id: 'community', label: t('nav.community'), icon: <MessageCircle size={18} />, action: () => go('/owner/community'), keywords: ['forum', 'discuss'], section: 'navigation' as const },
      { id: 'marketplace', label: t('nav.marketplace'), icon: <Store size={18} />, action: () => go('/owner/marketplace'), keywords: ['buy', 'sell', 'equipment'], section: 'navigation' as const },
      { id: 'professionals', label: t('nav.professionals'), icon: <Users size={18} />, action: () => go('/owner/professionals'), keywords: ['expert', 'directory'], section: 'navigation' as const },
      { id: 'compliance', label: t('nav.compliance'), icon: <ClipboardCheck size={18} />, action: () => go('/owner/compliance'), keywords: ['rules', 'legal', 'regulation'], section: 'navigation' as const },
      { id: 'forest-profile', label: t('nav.forestProfile'), icon: <Fingerprint size={18} />, action: () => go('/owner/forest-profile'), keywords: ['profile', 'identity'], section: 'navigation' as const },
      { id: 'calendar', label: t('nav.calendar'), icon: <CalendarDays size={18} />, action: () => go('/owner/calendar'), keywords: ['schedule', 'events'], section: 'navigation' as const },
      { id: 'news', label: t('nav.news'), icon: <Newspaper size={18} />, action: () => go('/owner/news'), keywords: ['updates', 'articles'], section: 'navigation' as const },
      { id: 'research', label: t('nav.research'), icon: <BookOpen size={18} />, action: () => go('/owner/research'), keywords: ['science', 'papers'], section: 'navigation' as const },
      { id: 'settings', label: t('nav.settings'), icon: <Settings size={18} />, action: () => go('/owner/settings'), keywords: ['preferences', 'account', 'profile'], section: 'navigation' as const },
    ],
    [t, go],
  );

  const allItems = useMemo(() => {
    const recent: PaletteItem[] = recentPages
      .map((path) => {
        const nav = navItems.find((n) => {
          const navPath = `/owner/${n.id}`;
          return navPath === path;
        });
        if (!nav) return null;
        return { ...nav, id: `recent-${nav.id}`, section: 'recent' as const, icon: <Clock size={18} /> };
      })
      .filter(Boolean) as PaletteItem[];

    return [...recent, ...navItems];
  }, [navItems, recentPages]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keywords?.some((kw) => kw.includes(q)),
    );
  }, [query, allItems]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      }
    },
    [filtered, selectedIndex],
  );

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  // Group items by section
  const sections = new Map<string, PaletteItem[]>();
  for (const item of filtered) {
    const arr = sections.get(item.section) || [];
    arr.push(item);
    sections.set(item.section, arr);
  }

  const sectionLabels: Record<string, string> = {
    recent: 'Recent',
    navigation: 'Go to',
    actions: 'Actions',
  };

  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/40 animate-in fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed inset-x-0 top-[15vh] z-[101] mx-auto w-full max-w-lg px-4">
        <div
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl"
          role="dialog"
          aria-label="Command palette"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
            <Search size={18} className="text-[var(--text3)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, actions..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none"
            />
            <kbd className="hidden sm:flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text3)]">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-[var(--text3)]">
                No results found
              </div>
            )}
            {Array.from(sections.entries()).map(([section, items]) => (
              <div key={section}>
                <div className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">
                  {sectionLabels[section] || section}
                </div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => item.action()}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`
                        flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors
                        ${isSelected
                          ? 'bg-[var(--green)]/10 text-[var(--green)]'
                          : 'text-[var(--text2)] hover:bg-[var(--bg3)]'
                        }
                      `}
                    >
                      <span className={isSelected ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate font-medium">{item.label}</span>
                      {isSelected && <ArrowRight size={14} className="text-[var(--green)]" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--text3)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-[var(--border)] px-1 py-0.5 font-mono">↵</kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command size={10} />K to toggle
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/** Small button to open the command palette (for TopBar) */
export function CommandPaletteTrigger() {
  const handleClick = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <button
      onClick={handleClick}
      className="hidden sm:flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] px-3 py-1.5 text-xs text-[var(--text3)] transition hover:border-[var(--border2)] hover:text-[var(--text2)]"
      aria-label="Open command palette"
    >
      <Search size={14} />
      <span>Search...</span>
      <kbd className="ml-2 rounded border border-[var(--border)] px-1 py-0.5 text-[10px] font-mono">
        ⌘K
      </kbd>
    </button>
  );
}

export default CommandPalette;
