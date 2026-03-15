import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TreePine, Plus, Search, ChevronRight, MapPin } from 'lucide-react';
import { useState } from 'react';

interface Parcel {
  id: string;
  name: string;
  area_hectares: number;
  status: 'healthy' | 'at_risk' | 'infested' | 'unknown';
  last_survey: string | null;
  municipality: string;
}

// Placeholder data — will be replaced with Supabase query
const MOCK_PARCELS: Parcel[] = [
  { id: '1', name: 'Norra Skogen', area_hectares: 42.5, status: 'at_risk', last_survey: '2026-03-10', municipality: 'Värnamo' },
  { id: '2', name: 'Ekbacken', area_hectares: 18.3, status: 'healthy', last_survey: '2026-03-12', municipality: 'Gislaved' },
  { id: '3', name: 'Tallmon', area_hectares: 67.1, status: 'healthy', last_survey: '2026-02-28', municipality: 'Jönköping' },
  { id: '4', name: 'Granudden', area_hectares: 31.9, status: 'infested', last_survey: '2026-03-08', municipality: 'Värnamo' },
  { id: '5', name: 'Björklund', area_hectares: 55.0, status: 'unknown', last_survey: null, municipality: 'Nässjö' },
];

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

export default function ParcelsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = MOCK_PARCELS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            {t('owner.parcels.title')}
          </h1>
          <p className="text-xs text-[var(--text3)] mt-1">
            {MOCK_PARCELS.length} parcels &middot;{' '}
            <span className="font-mono">
              {MOCK_PARCELS.reduce((s, p) => s + p.area_hectares, 0).toFixed(1)}
            </span>{' '}
            {t('owner.parcels.hectares')} total
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors">
          <Plus size={16} />
          <span className="hidden sm:inline">{t('owner.parcels.addParcel')}</span>
        </button>
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

      {/* Parcels list */}
      <div className="space-y-2">
        {filtered.map((parcel) => (
          <Link
            key={parcel.id}
            to={`/owner/parcels/${parcel.id}`}
            className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg2)] hover:bg-[var(--bg3)] transition-all group"
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

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <TreePine size={32} className="mx-auto text-[var(--text3)] mb-3" />
            <p className="text-sm text-[var(--text2)]">{t('common.noResults')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
