import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Radar,
  Filter,
  ArrowDownUp,
  Bell,
  BellOff,
  CheckCheck,
  Tag,
} from 'lucide-react';
import { useRegulatoryRadar, type RadarFilter } from '@/hooks/useRegulatoryRadar';
import { RegulatoryChangeCard } from '@/components/radar/RegulatoryChangeCard';
import { RegulatoryTimeline } from '@/components/radar/RegulatoryTimeline';
import { ImpactAnalysis } from '@/components/radar/ImpactAnalysis';
import type { RegulatoryChange, RegulatoryCategory } from '@/data/regulatoryChanges';

const FILTER_OPTIONS: { value: RadarFilter; label_en: string; label_sv: string }[] = [
  { value: 'all', label_en: 'All', label_sv: 'Alla' },
  { value: 'my_parcels', label_en: 'Affects My Parcels', label_sv: 'Berör mina skiften' },
  { value: 'national', label_en: 'National', label_sv: 'Nationellt' },
  { value: 'eu', label_en: 'EU', label_sv: 'EU' },
];

const CATEGORY_OPTIONS: { value: RegulatoryCategory; label_en: string; label_sv: string }[] = [
  { value: 'felling_rules', label_en: 'Felling Rules', label_sv: 'Avverkningsregler' },
  { value: 'environmental_protection', label_en: 'Environmental Protection', label_sv: 'Miljöskydd' },
  { value: 'tax_finance', label_en: 'Tax & Finance', label_sv: 'Skatt & Ekonomi' },
  { value: 'eu_directives', label_en: 'EU Directives', label_sv: 'EU-direktiv' },
  { value: 'biodiversity', label_en: 'Biodiversity', label_sv: 'Biologisk mångfald' },
  { value: 'climate', label_en: 'Climate', label_sv: 'Klimat' },
];

export default function RegulatoryRadarPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const {
    changes,
    filteredChanges,
    filter,
    setFilter,
    sortMode,
    setSortMode,
    selectedCategories,
    toggleCategory,
    clearCategories,
    markAsRead,
    markAllAsRead,
    toggleActionCompleted,
    unreadCount,
    unreadHighImpactCount: _unreadHighImpactCount,
    subscribeToUpdates,
    setSubscribeToUpdates,
    isLoading,
  } = useRegulatoryRadar();

  const [impactChange, setImpactChange] = useState<RegulatoryChange | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <Radar size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('radar.page.title')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('radar.page.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <RegulatoryTimeline
          changes={changes}
          onSelectChange={(c) => setImpactChange(c)}
        />

        {/* Impact Analysis Panel (conditionally shown) */}
        {impactChange && (
          <ImpactAnalysis
            change={impactChange}
            onClose={() => setImpactChange(null)}
          />
        )}

        {/* Toolbar: filters, sort, subscribe */}
        <div className="space-y-3">
          {/* Scope filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-[var(--text3)]" />
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors border ${
                  filter === opt.value
                    ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20'
                    : 'text-[var(--text3)] border-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                }`}
              >
                {lang === 'sv' ? opt.label_sv : opt.label_en}
                {opt.value === 'my_parcels' && (
                  <span className="ml-1 text-[9px] opacity-60">
                    ({changes.filter((c) => c.affectedParcels.length > 0).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Category tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={12} className="text-[var(--text3)]" />
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                onClick={() => toggleCategory(cat.value)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors border ${
                  selectedCategories.includes(cat.value)
                    ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20'
                    : 'text-[var(--text3)] border-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                }`}
              >
                {lang === 'sv' ? cat.label_sv : cat.label_en}
              </button>
            ))}
            {selectedCategories.length > 0 && (
              <button
                onClick={clearCategories}
                className="text-[10px] text-[var(--text3)] hover:text-[var(--text)] underline"
              >
                {lang === 'sv' ? 'Rensa' : 'Clear'}
              </button>
            )}
          </div>

          {/* Bottom toolbar row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {/* Sort toggle */}
              <button
                onClick={() => setSortMode(sortMode === 'date' ? 'severity' : 'date')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[11px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
              >
                <ArrowDownUp size={12} />
                {sortMode === 'date'
                  ? (lang === 'sv' ? 'Sortera: Datum' : 'Sort: Date')
                  : (lang === 'sv' ? 'Sortera: Allvar' : 'Sort: Severity')}
              </button>

              {/* Mark all as read */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[11px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <CheckCheck size={12} />
                  {t('radar.markAllRead')}
                </button>
              )}
            </div>

            {/* Subscribe toggle */}
            <button
              onClick={() => setSubscribeToUpdates(!subscribeToUpdates)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                subscribeToUpdates
                  ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20'
                  : 'text-[var(--text2)] border-[var(--border)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
              }`}
            >
              {subscribeToUpdates ? <Bell size={12} /> : <BellOff size={12} />}
              {subscribeToUpdates
                ? t('radar.subscribed')
                : t('radar.subscribe')}
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[var(--text3)]">
            {filteredChanges.length} {lang === 'sv' ? 'regeländringar' : 'regulatory changes'}
            {unreadCount > 0 && (
              <span className="ml-1">
                ({unreadCount} {lang === 'sv' ? 'olästa' : 'unread'})
              </span>
            )}
          </p>
        </div>

        {/* Change feed */}
        <div className="space-y-3">
          {filteredChanges.length === 0 ? (
            <div className="text-center py-12">
              <Radar size={32} className="text-[var(--text3)] mx-auto mb-3 opacity-50" />
              <p className="text-sm text-[var(--text3)]">
                {t('radar.noResults')}
              </p>
            </div>
          ) : (
            filteredChanges.map((change) => (
              <RegulatoryChangeCard
                key={change.id}
                change={change}
                onMarkAsRead={markAsRead}
                onToggleAction={toggleActionCompleted}
                onShowImpact={(c) => setImpactChange(c)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
