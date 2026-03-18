import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Plus,
  Filter,
  Map,
  List,
  Search,
  X,
  Axe,
  Sprout,
  CloudLightning,
  Route,
  MapPin,
  Eye,
  Heart,
  Users,
} from 'lucide-react';
import {
  useForestArchive,
  type ArchiveEventType,
  EVENT_TYPE_COLORS,
} from '@/hooks/useForestArchive';
import { TimelineEvent } from '@/components/archive/TimelineEvent';
import { AddEventModal } from '@/components/archive/AddEventModal';
import { ArchiveMap } from '@/components/archive/ArchiveMap';
import { FamilyTree } from '@/components/archive/FamilyTree';

type ViewMode = 'timeline' | 'map' | 'family';

const EVENT_TYPE_OPTIONS: { type: ArchiveEventType; icon: React.ReactNode }[] = [
  { type: 'harvest', icon: <Axe size={14} /> },
  { type: 'planting', icon: <Sprout size={14} /> },
  { type: 'storm_damage', icon: <CloudLightning size={14} /> },
  { type: 'road_built', icon: <Route size={14} /> },
  { type: 'boundary_change', icon: <MapPin size={14} /> },
  { type: 'observation', icon: <Eye size={14} /> },
  { type: 'family_note', icon: <Heart size={14} /> },
];

export default function ForestArchivePage() {
  const { t } = useTranslation();
  const {
    events,
    allEvents,
    stewards,
    typeFilter,
    setTypeFilter,
    dateRange,
    setDateRange,
    standFilter,
    setStandFilter,
    searchQuery,
    setSearchQuery,
    addEvent,
    deleteEvent,
    totalYears,
    stands,
    isLoading,
    error,
  } = useForestArchive();

  const [view, setView] = useState<ViewMode>('timeline');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Group events by decade for timeline
  const eventsByDecade = useMemo(() => {
    const groups: Record<string, typeof events> = {};
    events.forEach((event) => {
      const year = new Date(event.date).getFullYear();
      const decade = `${Math.floor(year / 10) * 10}`;
      if (!groups[decade]) groups[decade] = [];
      groups[decade].push(event);
    });
    // Sort decades ascending
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  const hasActiveFilters = typeFilter || dateRange[0] || dateRange[1] || standFilter || searchQuery;

  const clearFilters = () => {
    setTypeFilter(null);
    setDateRange([null, null]);
    setStandFilter('');
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          <span className="text-sm text-[var(--text2)] font-mono">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BookOpen size={22} className="text-[var(--green)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('archive.page.title')}
              </h1>
            </div>
            <p className="text-xs text-[var(--text3)]">
              {t('archive.page.subtitle')}
            </p>
            {totalYears > 0 && (
              <p className="text-[11px] font-mono text-[var(--green)] mt-1">
                {totalYears} {t('archive.widget.yearsOfForestry')} &middot; {allEvents.length} {t('archive.widget.events')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setView('timeline')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  view === 'timeline'
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text3)] hover:text-[var(--text)]'
                }`}
                aria-label={t('archive.page.timelineView')}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-3 py-2 text-xs font-medium transition-colors border-l border-[var(--border)] ${
                  view === 'map'
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text3)] hover:text-[var(--text)]'
                }`}
                aria-label={t('archive.page.mapView')}
              >
                <Map size={16} />
              </button>
              <button
                onClick={() => setView('family')}
                className={`px-3 py-2 text-xs font-medium transition-colors border-l border-[var(--border)] ${
                  view === 'family'
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text3)] hover:text-[var(--text)]'
                }`}
                aria-label={t('archive.page.familyView')}
              >
                <Users size={16} />
              </button>
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)]'
              }`}
            >
              <Filter size={16} />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--green)]" />
              )}
            </button>

            {/* Add event */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)] text-sm font-semibold text-forest-950 hover:bg-[var(--green2)] transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t('archive.addEvent')}</span>
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('archive.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
              />
            </div>

            {/* Type filter */}
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPE_OPTIONS.map((opt) => {
                const color = EVENT_TYPE_COLORS[opt.type];
                const isActive = typeFilter === opt.type;
                return (
                  <button
                    key={opt.type}
                    onClick={() => setTypeFilter(isActive ? null : opt.type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                      isActive
                        ? ''
                        : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                    }`}
                    style={
                      isActive
                        ? { borderColor: `${color}60`, background: `${color}15`, color }
                        : {}
                    }
                  >
                    {opt.icon}
                    {t(`archive.types.${opt.type}`)}
                  </button>
                );
              })}
            </div>

            {/* Date range + stand */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-mono text-[var(--text3)] uppercase">{t('archive.from')}</label>
                <input
                  type="date"
                  value={dateRange[0] ?? ''}
                  onChange={(e) => setDateRange([e.target.value || null, dateRange[1]])}
                  className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-mono text-[var(--text3)] uppercase">{t('archive.to')}</label>
                <input
                  type="date"
                  value={dateRange[1] ?? ''}
                  onChange={(e) => setDateRange([dateRange[0], e.target.value || null])}
                  className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-mono text-[var(--text3)] uppercase">{t('archive.stand')}</label>
                <select
                  value={standFilter}
                  onChange={(e) => setStandFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                >
                  <option value="">{t('archive.allStands')}</option>
                  {stands.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-red-400 hover:text-red-300 transition-colors"
                >
                  <X size={12} />
                  {t('archive.clearFilters')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 mx-6 mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {view === 'timeline' && (
          <div className="max-w-3xl mx-auto px-6 py-8">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen size={40} className="text-[var(--text3)] mb-4" />
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                  {hasActiveFilters ? t('archive.noFilterResults') : t('archive.noEvents')}
                </h3>
                <p className="text-xs text-[var(--text3)] mb-4">
                  {hasActiveFilters ? t('archive.tryDifferentFilters') : t('archive.startRecording')}
                </p>
                {!hasActiveFilters && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)] text-sm font-semibold text-forest-950 hover:bg-[var(--green2)] transition-colors"
                  >
                    <Plus size={16} />
                    {t('archive.addEvent')}
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Decade markers + events */}
                {eventsByDecade.map(([decade, decadeEvents]) => (
                  <div key={decade}>
                    {/* Decade header */}
                    <div className="flex items-center gap-3 mb-6 mt-2">
                      <div className="h-px flex-1 bg-[var(--border)]" />
                      <span className="text-lg font-mono font-bold text-[var(--green)] px-3 py-1 rounded-full border border-[var(--green)]/20 bg-[var(--green)]/5">
                        {decade}s
                      </span>
                      <div className="h-px flex-1 bg-[var(--border)]" />
                    </div>

                    {/* Events in this decade */}
                    {decadeEvents.map((event) => (
                      <TimelineEvent
                        key={event.id}
                        event={event}
                        onDelete={deleteEvent}
                      />
                    ))}
                  </div>
                ))}

                {/* End of timeline */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-px flex-1 bg-[var(--border)]" />
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase">
                    {t('archive.endOfTimeline')}
                  </span>
                  <div className="h-px flex-1 bg-[var(--border)]" />
                </div>
              </>
            )}
          </div>
        )}

        {view === 'map' && (
          <div className="p-6 h-full min-h-[500px]">
            <ArchiveMap events={allEvents} />
          </div>
        )}

        {view === 'family' && (
          <div className="max-w-2xl mx-auto px-6 py-8">
            <FamilyTree stewards={stewards} events={allEvents} />
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addEvent}
        stands={stands}
      />
    </div>
  );
}
