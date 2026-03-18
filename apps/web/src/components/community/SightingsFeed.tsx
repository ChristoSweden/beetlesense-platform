import { useState } from 'react';
import {
  CheckCircle2,
  Filter,
  Plus,
  X,
  MapPin,
  Clock,
  Send,
} from 'lucide-react';
import {
  type Sighting,
  type SightingType,
  type NewSightingPayload,
  SIGHTING_TYPE_CONFIG,
} from '@/hooks/useCommunity';

// ─── Time formatting ───

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just nu';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 30) return `${diffD}d`;
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

// ─── Props ───

interface SightingsFeedProps {
  sightings: Sighting[];
  isLoading: boolean;
  verifiedSet: Set<string>;
  onVerify: (id: string) => void;
  onAdd: (payload: NewSightingPayload) => void;
}

const ALL_TYPES: SightingType[] = ['barkborre', 'stormskada', 'algskada', 'brand', 'svampangrepp', 'invasiv_art'];

export function SightingsFeed({ sightings, isLoading, verifiedSet, onVerify, onAdd }: SightingsFeedProps) {
  const [typeFilter, setTypeFilter] = useState<SightingType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formType, setFormType] = useState<SightingType>('barkborre');
  const [formDesc, setFormDesc] = useState('');
  const [formLocation, setFormLocation] = useState('');

  const filtered = typeFilter ? sightings.filter((s) => s.type === typeFilter) : sightings;

  const handleSubmit = () => {
    if (formDesc.trim().length < 10) return;
    onAdd({
      type: formType,
      description: formDesc.trim(),
      location_label: formLocation.trim() || 'Okänd plats',
    });
    setFormDesc('');
    setFormLocation('');
    setShowForm(false);
  };

  return (
    <div>
      {/* Controls bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
            showFilters || typeFilter
              ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
              : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
          }`}
        >
          <Filter size={12} />
          Filtrera
        </button>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[#030d05] hover:brightness-110 transition-all ml-auto"
        >
          <Plus size={14} />
          Rapportera observation
        </button>
      </div>

      {/* Type filter pills */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              typeFilter === null
                ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
            }`}
          >
            Alla
          </button>
          {ALL_TYPES.map((t) => {
            const cfg = SIGHTING_TYPE_CONFIG[t];
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  typeFilter === t
                    ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                    : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
                }`}
              >
                <span>{cfg.icon}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick-entry form */}
      {showForm && (
        <div
          className="rounded-xl border border-[var(--green)]/20 p-4 mb-4"
          style={{ background: 'var(--bg2)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--text)]">Ny observation</h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]"
            >
              <X size={14} />
            </button>
          </div>

          {/* Type selector */}
          <label className="text-[10px] font-medium text-[var(--text3)] mb-1.5 block">Typ</label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ALL_TYPES.map((t) => {
              const cfg = SIGHTING_TYPE_CONFIG[t];
              return (
                <button
                  key={t}
                  onClick={() => setFormType(t)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                    formType === t
                      ? 'text-[var(--text)] border-[var(--green)]/30 bg-[var(--green)]/10'
                      : 'text-[var(--text3)] border-[var(--border)] hover:border-[var(--border2)]'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Description */}
          <label className="text-[10px] font-medium text-[var(--text3)] mb-1.5 block">Beskrivning</label>
          <textarea
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Beskriv vad du observerat..."
            rows={3}
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40 resize-none mb-3"
          />

          {/* Location */}
          <label className="text-[10px] font-medium text-[var(--text3)] mb-1.5 block">Plats (ungefärlig)</label>
          <input
            type="text"
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
            placeholder="t.ex. Värnamo NV"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40 mb-3"
          />

          <button
            onClick={handleSubmit}
            disabled={formDesc.trim().length < 10}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[#030d05] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={13} />
            Rapportera
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] p-4 animate-pulse"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--bg3)]" />
                <div className="h-3 w-24 bg-[var(--bg3)] rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-[var(--bg3)] rounded" />
                <div className="h-3 w-3/4 bg-[var(--bg3)] rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sightings list */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text3)]">Inga observationer hittade</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((sighting) => {
            const cfg = SIGHTING_TYPE_CONFIG[sighting.type];
            const isVerified = verifiedSet.has(sighting.id);
            return (
              <article
                key={sighting.id}
                className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-colors"
                style={{ background: 'var(--bg2)' }}
              >
                {/* Header: type icon + badge + time */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: `${cfg.color}15` }}
                    >
                      {cfg.icon}
                    </div>
                    <div>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: `${cfg.color}15`, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[var(--text3)]">{sighting.reporter_label}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text3)] flex-shrink-0">
                    <Clock size={10} />
                    {timeAgo(sighting.timestamp)}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--text)] leading-relaxed mb-3">
                  {sighting.description}
                </p>

                {/* Location + verification */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <MapPin size={11} className="text-[var(--text3)]" />
                    <span className="text-[10px] text-[var(--text3)]">{sighting.location_label}</span>
                  </div>

                  <button
                    onClick={() => onVerify(sighting.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                      isVerified
                        ? 'bg-[var(--green)]/15 text-[var(--green)]'
                        : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                    }`}
                  >
                    <CheckCircle2 size={12} />
                    <span>{sighting.verification_count} bekräftade</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {!isLoading && filtered.length > 0 && (
        <p className="mt-4 text-center text-[10px] text-[var(--text3)]">
          Visar {filtered.length} observationer i Smålandsregionen
        </p>
      )}
    </div>
  );
}
