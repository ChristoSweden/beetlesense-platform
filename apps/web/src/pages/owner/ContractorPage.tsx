import { useState, useCallback } from 'react';
import { useToast } from '@/components/common/Toast';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Truck,
  List,
  Map as MapIcon,
  CalendarDays,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { BaseMap } from '@/components/map/BaseMap';
import { ContractorCard } from '@/components/contractor/ContractorCard';
import { ContractorProfile } from '@/components/contractor/ContractorProfile';
import { QuoteRequestForm } from '@/components/contractor/QuoteRequestForm';
import { BookingTimeline } from '@/components/contractor/BookingTimeline';
import { TerrainAnalysis } from '@/components/contractor/TerrainAnalysis';
import { useContractors, ALL_SERVICE_TYPES } from '@/hooks/useContractors';
import type { Contractor, AvailabilityStatus } from '@/hooks/useContractors';
import type { QuoteFormData } from '@/components/contractor/QuoteRequestForm';
import type maplibregl from 'maplibre-gl';

type TabView = 'search' | 'bookings';

const AVAILABILITY_OPTIONS: Array<{ value: AvailabilityStatus | ''; label: string }> = [
  { value: '', label: 'contractor.filter.allAvailability' },
  { value: 'available', label: 'contractor.availability.available' },
  { value: 'limited', label: 'contractor.availability.limited' },
  { value: 'unavailable', label: 'contractor.availability.unavailable' },
];

const COUNTY_OPTIONS = [
  'Jönköping',
  'Kronoberg',
  'Kalmar',
  'Östergötland',
  'Halland',
  'Västra Götaland',
  'Blekinge',
];

export default function ContractorPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    filteredContractors,
    bookings,
    loading,
    error,
    filters,
    setFilters,
    getDistance,
  } = useContractors();

  const [tab, setTab] = useState<TabView>('search');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [quoteContractor, setQuoteContractor] = useState<Contractor | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [_map, setMap] = useState<maplibregl.Map | null>(null);

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m);
  }, []);

  const handleRequestQuote = (contractor: Contractor) => {
    setSelectedContractor(null);
    setQuoteContractor(contractor);
  };

  const handleViewProfile = (contractor: Contractor) => {
    setSelectedContractor(contractor);
  };

  const handleQuoteSubmit = (data: QuoteFormData) => {
    // In production, this would POST to Supabase
    void data;
    toast(t('contractors.quoteSubmitted', 'Offertförfrågan skickad!'), 'success');
  };

  const activeBookings = bookings.filter((b) => b.status !== 'completed');
  const completedBookings = bookings.filter((b) => b.status === 'completed');

  return (
    <div className="flex h-full relative">
      {/* Left panel */}
      <div
        className="w-full lg:w-[420px] xl:w-[480px] flex-shrink-0 border-r border-[var(--border)] overflow-y-auto"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          {/* Page header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center">
              <Truck size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('contractor.pageTitle')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('contractor.pageSubtitle')}
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-[var(--border)] mt-4 mb-4">
            <button
              onClick={() => setTab('search')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === 'search'
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              <Search size={14} />
              {t('contractor.tabs.search')}
            </button>
            <button
              onClick={() => setTab('bookings')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors relative ${
                tab === 'bookings'
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              <CalendarDays size={14} />
              {t('contractor.tabs.bookings')}
              {activeBookings.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-[var(--green)]/15 text-[var(--green)]">
                  {activeBookings.length}
                </span>
              )}
            </button>
          </div>

          {tab === 'search' && (
            <>
              {/* Search bar */}
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  placeholder={t('contractor.searchPlaceholder')}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
                />
              </div>

              {/* Filter toggle + view mode */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    showFilters
                      ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  {t('contractor.filter.title')}
                </button>

                <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-[var(--green)]/15 text-[var(--green)]' : 'text-[var(--text3)]'
                    }`}
                    aria-label="List view"
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'map' ? 'bg-[var(--green)]/15 text-[var(--green)]' : 'text-[var(--text3)]'
                    }`}
                    aria-label="Map view"
                  >
                    <MapIcon size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <div className="p-3 rounded-xl border border-[var(--border)] mb-4 space-y-3" style={{ background: 'var(--bg)' }}>
                  {/* Service type filters */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      {t('contractor.filter.serviceType')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_SERVICE_TYPES.map((s) => {
                        const active = filters.serviceTypes.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              setFilters({
                                serviceTypes: active
                                  ? filters.serviceTypes.filter((x) => x !== s)
                                  : [...filters.serviceTypes, s],
                              });
                            }}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                              active
                                ? 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30'
                                : 'bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)]'
                            }`}
                          >
                            {t(`contractor.serviceType.${s}`)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* County filter */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      {t('contractor.filter.county')}
                    </label>
                    <select
                      value={filters.county ?? ''}
                      onChange={(e) => setFilters({ county: e.target.value || null })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                    >
                      <option value="">{t('contractor.filter.allCounties')}</option>
                      {COUNTY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Availability filter */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      {t('contractor.filter.availability')}
                    </label>
                    <select
                      value={filters.availability ?? ''}
                      onChange={(e) => setFilters({ availability: (e.target.value as AvailabilityStatus) || null })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                    >
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      {t('contractor.filter.sortBy')}
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({ sortBy: e.target.value as 'distance' | 'rating' | 'name' })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                    >
                      <option value="distance">{t('contractor.filter.sortDistance')}</option>
                      <option value="rating">{t('contractor.filter.sortRating')}</option>
                      <option value="name">{t('contractor.filter.sortName')}</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Results count */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-[var(--text3)]">
                  {t('contractor.resultCount', { count: filteredContractors.length })}
                </span>
              </div>

              {/* Loading / Error / Results */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-40 rounded-xl bg-[var(--bg3)] animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              ) : filteredContractors.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Filter size={32} className="text-[var(--text3)] mb-3" />
                  <p className="text-sm text-[var(--text)] font-medium mb-1">{t('common.noResults')}</p>
                  <p className="text-xs text-[var(--text3)]">{t('contractor.noResultsHint')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContractors.map((contractor) => (
                    <ContractorCard
                      key={contractor.id}
                      contractor={contractor}
                      distance={getDistance(contractor)}
                      onRequestQuote={handleRequestQuote}
                      onViewProfile={handleViewProfile}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'bookings' && (
            <div>
              {/* Active bookings */}
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-3">
                  {t('contractor.bookings.active')}
                </h2>
                <BookingTimeline bookings={activeBookings} />
              </div>

              {/* Terrain analysis for first active booking */}
              {activeBookings.length > 0 && (
                <div className="mb-6">
                  <TerrainAnalysis
                    parcelId={activeBookings[0].parcel_id}
                    parcelName={activeBookings[0].parcel_name}
                  />
                </div>
              )}

              {/* Completed bookings */}
              {completedBookings.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-3">
                    {t('contractor.bookings.completed')}
                  </h2>
                  <BookingTimeline bookings={completedBookings} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map area - visible on large screens or when map mode selected */}
      <div className={`flex-1 relative ${viewMode === 'list' ? 'hidden lg:block' : ''}`}>
        <BaseMap onMapReady={handleMapReady} />

        {/* Contractor markers would be rendered here via MapLibre markers */}
        {/* For now, show an info overlay */}
        <div className="absolute top-4 left-4 z-10 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-[var(--green)]" />
            <span className="text-xs font-medium text-[var(--text)]">
              {filteredContractors.length} {t('contractor.mapOverlay')}
            </span>
          </div>
        </div>
      </div>

      {/* Contractor Profile Modal */}
      {selectedContractor && (
        <ContractorProfile
          contractor={selectedContractor}
          onClose={() => setSelectedContractor(null)}
          onRequestQuote={handleRequestQuote}
        />
      )}

      {/* Quote Request Modal */}
      {quoteContractor && (
        <QuoteRequestForm
          contractor={quoteContractor}
          onClose={() => setQuoteContractor(null)}
          onSubmit={handleQuoteSubmit}
        />
      )}
    </div>
  );
}
