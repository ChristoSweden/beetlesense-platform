import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TreePine, Plus, Search, ChevronRight, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

interface Parcel {
  id: string;
  name: string;
  area_hectares: number;
  status: 'healthy' | 'at_risk' | 'infested' | 'unknown';
  last_survey: string | null;
  municipality: string;
}

function statusBadge(status: string, t: (key: string) => string) {
  const styles: Record<string, string> = {
    healthy: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
    at_risk: 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20',
    infested: 'bg-red-500/10 text-red-400 border-red-500/20',
    unknown: 'bg-[var(--text3)]/10 text-[var(--text3)] border-[var(--text3)]/20',
  };
  const labels: Record<string, string> = {
    healthy: t('owner.parcels.healthy'),
    at_risk: t('owner.parcels.atRisk'),
    infested: t('owner.parcels.infested'),
    unknown: t('owner.parcels.unknown'),
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status] ?? styles.unknown}`}>
      {labels[status] ?? labels.unknown}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
      <div className="w-10 h-10 rounded-lg skeleton-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded skeleton-shimmer" />
        <div className="h-3 w-1/2 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function ParcelsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadParcels() {
      setLoading(true);
      setError(null);

      try {
        if (isDemo() || !isSupabaseConfigured) {
          const mapped: Parcel[] = DEMO_PARCELS.map((dp) => ({
            id: dp.id,
            name: dp.name,
            area_hectares: dp.area_hectares,
            status: dp.status,
            last_survey: dp.last_survey,
            municipality: dp.municipality,
          }));
          if (!cancelled) setParcels(mapped);
        } else {
          const { data, error: dbError } = await supabase
            .from('parcels')
            .select('id, name, area_ha, status, municipality, updated_at')
            .order('name');

          if (dbError) throw dbError;

          if (!cancelled) {
            setParcels(
              (data ?? []).map((row) => ({
                id: row.id,
                name: row.name,
                area_hectares: row.area_ha,
                status: row.status ?? 'unknown',
                last_survey: row.updated_at ?? null,
                municipality: row.municipality ?? '',
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load parcels');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadParcels();
    return () => { cancelled = true; };
  }, []);

  const filtered = parcels.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalHectares = parcels.reduce((s, p) => s + p.area_hectares, 0);

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            {t('owner.parcels.title')}
          </h1>
          <p className="text-xs text-[var(--text3)] mt-1">
            {parcels.length} parcels &middot;{' '}
            <span className="font-mono">
              {totalHectares.toFixed(1)}
            </span>{' '}
            {t('owner.parcels.hectares')} total
          </p>
        </div>
        <Link
          to="/owner/parcels/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">{t('owner.parcels.addParcel')}</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg2)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text3)]
            focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)]/30 outline-none transition-colors"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4">
          <ErrorMessage
            message={error}
            code="LOAD_PARCELS_ERROR"
            onRetry={() => window.location.reload()}
          />
        </div>
      )}

      {/* Parcels list */}
      <div className="space-y-2">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && filtered.map((parcel, i) => (
          <Link
            key={parcel.id}
            to={`/owner/parcels/${parcel.id}`}
            className={`card-depth flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] group animate-slide-up stagger-${Math.min(i + 1, 12)}`}
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 border border-[var(--border)] flex items-center justify-center flex-shrink-0">
              <TreePine size={20} className="text-[var(--green-dim)]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-[var(--text)] truncate">{parcel.name}</p>
                {statusBadge(parcel.status, t)}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[var(--text3)]">
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {parcel.municipality}
                </span>
                <span className="font-mono">
                  {parcel.area_hectares.toFixed(1)} {t('owner.parcels.hectares')}
                </span>
                {parcel.last_survey && (
                  <span>
                    {t('owner.parcels.lastSurvey')}: {parcel.last_survey}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight
              size={16}
              className="text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors flex-shrink-0"
            />
          </Link>
        ))}

        {!loading && filtered.length === 0 && !error && (
          <EmptyState
            icon="🌲"
            title={t('common.noResults')}
            description={search ? 'No parcels match your search. Try adjusting your filters.' : 'No parcels yet. Create your first parcel to get started.'}
            actionLabel={!search ? t('owner.parcels.addParcel') : undefined}
            onAction={!search ? () => window.location.href = '/owner/parcels/new' : undefined}
          />
        )}
      </div>
    </div>
  );
}
