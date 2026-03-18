import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import { useNeighborActivity } from '@/hooks/useNeighborActivity';
import { ActivityMap } from '@/components/neighbor/ActivityMap';
import { ActivityCard } from '@/components/neighbor/ActivityCard';
import { ImpactAssessment } from '@/components/neighbor/ImpactAssessment';
import {
  getActivityTypes,
  getActivityColor,
  getImpactColor,
  type ActivityType,
  type ImpactLevel,
  type SortField,
} from '@/services/neighborActivityService';

const RADIUS_OPTIONS = [1, 3, 5, 10];

export default function NeighborActivityPage() {
  const { t } = useTranslation();
  const {
    filtered,
    activities: _activities,
    loading,
    radiusKm,
    setRadiusKm,
    typeFilters,
    setTypeFilters,
    impactFilters,
    setImpactFilters,
    sortBy,
    setSortBy,
    highImpactCount,
    totalCount,
    selectedActivity,
    setSelectedActivity,
  } = useNeighborActivity();

  const [view, setView] = useState<'split' | 'map' | 'list'>('split');
  const [showFilters, setShowFilters] = useState(false);

  const toggleTypeFilter = (type: ActivityType) => {
    setTypeFilters(
      typeFilters.includes(type)
        ? typeFilters.filter((t) => t !== type)
        : [...typeFilters, type],
    );
  };

  const toggleImpactFilter = (level: ImpactLevel) => {
    setImpactFilters(
      impactFilters.includes(level)
        ? impactFilters.filter((l) => l !== level)
        : [...impactFilters, level],
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          <span className="text-sm text-[var(--text3)] font-mono">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--border)] px-6 py-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center">
              <Eye size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('neighbor.page.title')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('neighbor.page.subtitle')}
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div className="hidden md:flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5">
            {(['split', 'map', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  view === v
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                {v === 'split' && <SlidersHorizontal size={14} className="inline mr-1" />}
                {v === 'map' && <MapIcon size={14} className="inline mr-1" />}
                {v === 'list' && <List size={14} className="inline mr-1" />}
                {t(`neighbor.view.${v}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Radius slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
              {t('neighbor.radius')}
            </span>
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                    radiusKm === r
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--text3)] hover:text-[var(--text)]'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={12} className="text-[var(--text3)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="text-xs bg-transparent border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
            >
              <option value="impact">{t('neighbor.sort.impact')}</option>
              <option value="distance">{t('neighbor.sort.distance')}</option>
              <option value="date">{t('neighbor.sort.date')}</option>
            </select>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showFilters || typeFilters.length > 0 || impactFilters.length > 0
                ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5'
                : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text)]'
            }`}
          >
            <Filter size={12} />
            {t('neighbor.filters')}
            {(typeFilters.length + impactFilters.length) > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--green)] text-[#030d05] text-[9px] font-bold flex items-center justify-center">
                {typeFilters.length + impactFilters.length}
              </span>
            )}
          </button>

          {/* Summary badges */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[var(--text3)]">
              {filtered.length} {t('neighbor.of')} {totalCount} {t('neighbor.activities')}
            </span>
            {highImpactCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-[#ef4444] bg-[#ef4444]/10">
                <AlertTriangle size={10} />
                {highImpactCount} {t('neighbor.highImpact')}
              </span>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3">
            {/* Activity type filters */}
            <div>
              <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1.5">
                {t('neighbor.filterByType')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {getActivityTypes().map((type) => {
                  const active = typeFilters.includes(type);
                  const color = getActivityColor(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleTypeFilter(type)}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? 'border-transparent'
                          : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text)]'
                      }`}
                      style={active ? { color, background: `${color}15`, borderColor: `${color}40` } : undefined}
                    >
                      {t(`neighbor.activityType.${type}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Impact level filters */}
            <div>
              <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1.5">
                {t('neighbor.filterByImpact')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(['high', 'medium', 'low', 'none'] as ImpactLevel[]).map((level) => {
                  const active = impactFilters.includes(level);
                  const color = getImpactColor(level);
                  return (
                    <button
                      key={level}
                      onClick={() => toggleImpactFilter(level)}
                      className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? 'border-transparent'
                          : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text)]'
                      }`}
                      style={active ? { color, background: `${color}15`, borderColor: `${color}40` } : undefined}
                    >
                      {t(`neighbor.impact.${level}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear filters */}
            {(typeFilters.length + impactFilters.length) > 0 && (
              <button
                onClick={() => { setTypeFilters([]); setImpactFilters([]); }}
                className="text-[10px] text-[var(--green)] hover:text-[var(--green2)] font-medium"
              >
                {t('neighbor.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map panel */}
        {(view === 'split' || view === 'map') && (
          <div className={`${view === 'split' ? 'flex-1' : 'w-full'} relative`}>
            <ActivityMap
              activities={filtered}
              radiusKm={radiusKm}
              selectedActivity={selectedActivity}
              onSelectActivity={setSelectedActivity}
            />
          </div>
        )}

        {/* List panel */}
        {(view === 'split' || view === 'list') && (
          <div
            className={`${view === 'split' ? 'w-96' : 'w-full max-w-3xl mx-auto'} border-l border-[var(--border)] overflow-y-auto`}
            style={{ background: 'var(--bg)' }}
          >
            {selectedActivity ? (
              <div className="p-4">
                <ImpactAssessment
                  activity={selectedActivity}
                  onClose={() => setSelectedActivity(null)}
                />
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Shield size={32} className="text-[var(--green)] mb-3" />
                    <p className="text-sm font-medium text-[var(--text)]">
                      {t('neighbor.noActivities')}
                    </p>
                    <p className="text-xs text-[var(--text3)] mt-1">
                      {t('neighbor.noActivitiesHint')}
                    </p>
                  </div>
                ) : (
                  filtered.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onSelect={setSelectedActivity}
                      compact={view === 'list'}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
