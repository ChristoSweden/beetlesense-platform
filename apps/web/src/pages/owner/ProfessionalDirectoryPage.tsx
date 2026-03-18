/**
 * ProfessionalDirectoryPage — "Find a Professional" directory for forest owners.
 *
 * Features:
 *   - Search bar with text matching
 *   - Category filter chips
 *   - County (Län) dropdown
 *   - Sort by distance / rating / name
 *   - Toggle between list and map views
 *   - Professional profile modal
 *   - Request quote modal
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Users,
  MapPin,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  useProfessionals,
  ALL_CATEGORIES,
  SWEDISH_COUNTIES,
  type Professional,
  type ProfessionalCategory,
} from '@/hooks/useProfessionals';
import { ProfessionalCard } from '@/components/directory/ProfessionalCard';
import { ProfessionalProfile } from '@/components/directory/ProfessionalProfile';
import { RequestQuoteModal } from '@/components/directory/RequestQuoteModal';

// ─── Category i18n map ───

const CATEGORY_I18N: Record<ProfessionalCategory, string> = {
  forest_inspector: 'professionals.categories.forestInspector',
  logging_contractor: 'professionals.categories.loggingContractor',
  planting_service: 'professionals.categories.plantingService',
  drone_pilot: 'professionals.categories.dronePilot',
  forest_advisor: 'professionals.categories.forestAdvisor',
  transport_company: 'professionals.categories.transportCompany',
};

// ─── Map view component ───

function ProfessionalMapView({
  professionals,
  getDistance: _getDistance,
  onSelect,
}: {
  professionals: Professional[];
  getDistance: (p: Professional) => number | null;
  onSelect: (p: Professional) => void;
}) {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let map: unknown = null;

    // Dynamic import of MapLibre GL
    import('maplibre-gl').then((maplibregl) => {
      // Import CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
      document.head.appendChild(link);

      map = new maplibregl.Map({
        container,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
            },
          ],
        },
        center: [14.5, 57.5], // Center on Småland
        zoom: 7,
      });

      mapRef.current = map;

      // Add markers for professionals
      const m = map as { on: (e: string, cb: () => void) => void };
      m.on('load', () => {
        professionals.forEach((pro) => {
          const el = document.createElement('div');
          el.className = 'professional-marker';
          el.style.cssText = `
            width: 32px; height: 32px; border-radius: 50%;
            background: #22c55e; border: 2px solid #030d05;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; font-size: 12px; font-weight: 700; color: #030d05;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          `;
          el.textContent = pro.name.charAt(0);
          el.title = `${pro.name} — ${pro.company}`;
          el.addEventListener('click', () => onSelect(pro));

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat(pro.coordinates)
            .setPopup(
              new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
                <div style="padding:8px;font-family:system-ui;max-width:200px">
                  <strong style="font-size:13px">${pro.name}</strong><br/>
                  <span style="font-size:11px;color:#666">${pro.company}</span><br/>
                  <span style="font-size:11px">⭐ ${pro.rating.toFixed(1)} (${pro.review_count})</span>
                </div>
              `),
            );

          marker.addTo(map as InstanceType<typeof maplibregl.Map>);
          markersRef.current.push(marker);
        });
      });
    }).catch(() => {
      // MapLibre not available — show fallback
      if (container) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-xs text-[var(--text3)]">
          <span>${t('professionals.map.unavailable')}</span>
        </div>`;
      }
    });

    return () => {
      if (map && typeof (map as { remove: () => void }).remove === 'function') {
        (map as { remove: () => void }).remove();
      }
      markersRef.current = [];
    };
  }, [professionals, onSelect, t]);

  return (
    <div
      ref={mapContainerRef}
      className="h-[400px] lg:h-[500px] rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg)]"
    />
  );
}

// ─── Skeleton card ───

function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-[var(--border)]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-[var(--border)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--border)]" />
          <div className="h-3 w-2/3 rounded bg-[var(--border)]" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ───

export default function ProfessionalDirectoryPage() {
  const { t } = useTranslation();
  const {
    filteredProfessionals,
    loading,
    error,
    filters,
    setFilters,
    getDistance,
  } = useProfessionals();

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<Professional | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggleCategory = useCallback(
    (cat: ProfessionalCategory) => {
      setFilters({
        categories: filters.categories.includes(cat)
          ? filters.categories.filter((c) => c !== cat)
          : [...filters.categories, cat],
      });
    },
    [filters.categories, setFilters],
  );

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            {t('professionals.title')}
          </h1>
          <p className="text-xs text-[var(--text3)] mt-1">
            {filteredProfessionals.length} {t('professionals.professionalsFound')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
              aria-label={t('professionals.listView')}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 transition-colors ${
                viewMode === 'map'
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
              aria-label={t('professionals.mapView')}
            >
              <MapIcon size={16} />
            </button>
          </div>
          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden p-2 rounded-lg border border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
            aria-label={t('professionals.filters')}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder={t('professionals.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
            focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
        />
      </div>

      {/* Filters */}
      <div className={`space-y-3 mb-4 ${showFilters ? '' : 'hidden lg:block'}`}>
        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((cat) => {
            const isActive = filters.categories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors
                  ${
                    isActive
                      ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                      : 'text-[var(--text3)] border-[var(--border)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
                  }`}
              >
                {t(CATEGORY_I18N[cat])}
              </button>
            );
          })}
          {filters.categories.length > 0 && (
            <button
              onClick={() => setFilters({ categories: [] })}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
            >
              <X size={10} />
              {t('professionals.clearFilters')}
            </button>
          )}
        </div>

        {/* County + Sort row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* County filter */}
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-[var(--text3)]" />
            <select
              value={filters.county ?? ''}
              onChange={(e) => setFilters({ county: e.target.value || null })}
              className="px-2 py-1.5 rounded-lg bg-[var(--bg2)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[var(--green)] outline-none transition-colors"
            >
              <option value="">{t('professionals.allCounties')}</option>
              {SWEDISH_COUNTIES.map((county) => (
                <option key={county} value={county}>{county}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text3)]">{t('professionals.sortBy')}:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ sortBy: e.target.value as 'distance' | 'rating' | 'name' })}
              className="px-2 py-1.5 rounded-lg bg-[var(--bg2)] border border-[var(--border)] text-xs text-[var(--text)] focus:border-[var(--green)] outline-none transition-colors"
            >
              <option value="distance">{t('professionals.sort.distance')}</option>
              <option value="rating">{t('professionals.sort.rating')}</option>
              <option value="name">{t('professionals.sort.name')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Map view */}
      {viewMode === 'map' && (
        <div className="mb-4">
          <ProfessionalMapView
            professionals={filteredProfessionals}
            getDistance={getDistance}
            onSelect={setSelectedProfessional}
          />
        </div>
      )}

      {/* List view */}
      <div className="space-y-2">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading &&
          filteredProfessionals.map((pro) => (
            <ProfessionalCard
              key={pro.id}
              professional={pro}
              distance={getDistance(pro)}
              onSelect={setSelectedProfessional}
              onRequestQuote={setQuoteTarget}
            />
          ))}

        {!loading && filteredProfessionals.length === 0 && !error && (
          <div className="text-center py-12">
            <Users size={32} className="mx-auto text-[var(--text3)] mb-3" />
            <p className="text-sm text-[var(--text2)]">{t('common.noResults')}</p>
            <p className="text-xs text-[var(--text3)] mt-1">
              {t('professionals.noResultsHint')}
            </p>
          </div>
        )}
      </div>

      {/* Professional Profile Modal */}
      {selectedProfessional && (
        <ProfessionalProfile
          professional={selectedProfessional}
          distance={getDistance(selectedProfessional)}
          onClose={() => setSelectedProfessional(null)}
          onRequestQuote={(pro) => {
            setSelectedProfessional(null);
            setQuoteTarget(pro);
          }}
        />
      )}

      {/* Request Quote Modal */}
      {quoteTarget && (
        <RequestQuoteModal
          professional={quoteTarget}
          onClose={() => setQuoteTarget(null)}
        />
      )}
    </div>
  );
}
