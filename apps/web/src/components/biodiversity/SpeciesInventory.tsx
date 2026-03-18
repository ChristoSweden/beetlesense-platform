/**
 * SpeciesInventory — What lives in your forest.
 *
 * Tab groups by species type, conservation status badges,
 * detection method indicators, red-listed species highlighting.
 */

import { useState, useMemo } from 'react';
import {
  TreePine,
  Bird,
  Squirrel,
  Bug,
  Leaf,
  Flower2,
  AlertTriangle,
  Eye,
  Satellite,
  Camera,
  Users,
  Search,
} from 'lucide-react';
import type { Species, SpeciesGroup, ConservationStatus, DetectionMethod } from '@/hooks/useBiodiversity';

// ─── Helpers ───

const GROUP_ICONS: Record<SpeciesGroup, React.ReactNode> = {
  'Träd': <TreePine size={14} />,
  'Fåglar': <Bird size={14} />,
  'Däggdjur': <Squirrel size={14} />,
  'Insekter': <Bug size={14} />,
  'Svampar': <Leaf size={14} />,
  'Växter': <Flower2 size={14} />,
};

const GROUPS: SpeciesGroup[] = ['Träd', 'Fåglar', 'Däggdjur', 'Insekter', 'Svampar', 'Växter'];

function statusColor(status: ConservationStatus): string {
  switch (status) {
    case 'CR': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'EN': return 'bg-red-500/15 text-red-400 border-red-500/25';
    case 'VU': return 'bg-orange-500/15 text-orange-400 border-orange-500/25';
    case 'NT': return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
    case 'LC': return 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20';
    default: return 'bg-[var(--bg3)] text-[var(--text3)] border-[var(--border)]';
  }
}

function statusLabel(status: ConservationStatus): string {
  switch (status) {
    case 'CR': return 'Akut hotad';
    case 'EN': return 'Starkt hotad';
    case 'VU': return 'Sårbar';
    case 'NT': return 'Nära hotad';
    case 'LC': return 'Livskraftig';
    default: return status;
  }
}

function DetectionBadge({ method }: { method: DetectionMethod }) {
  const config: Record<DetectionMethod, { icon: React.ReactNode; label: string }> = {
    satellite: { icon: <Satellite size={10} />, label: 'Satellit' },
    drone: { icon: <Camera size={10} />, label: 'Drönare' },
    community: { icon: <Users size={10} />, label: 'Rapporterad' },
    field: { icon: <Eye size={10} />, label: 'Fältbesök' },
  };
  const { icon, label } = config[method];
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)]">
      {icon} {label}
    </span>
  );
}

// ─── Species Card ───

function SpeciesCard({ species }: { species: Species }) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        species.isRedListed
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-[var(--border)]'
      }`}
      style={species.isRedListed ? undefined : { background: 'var(--bg2)' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3">
          {/* Photo placeholder */}
          <div className="w-12 h-12 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
            <span className="text-[var(--text3)]">{GROUP_ICONS[species.group]}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[var(--text)]">{species.nameSv}</p>
              {species.isRedListed && <AlertTriangle size={12} className="text-amber-400" />}
              {species.oldGrowthIndicator && <TreePine size={12} className="text-[var(--green)]" />}
            </div>
            <p className="text-[11px] text-[var(--text3)] italic">{species.nameLatin}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColor(species.conservationStatus)}`}>
          {species.conservationStatus} — {statusLabel(species.conservationStatus)}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <DetectionBadge method={species.detectionMethod} />
        <span className="text-[10px] text-[var(--text3)]">
          Senast observerad: <span className="font-mono">{species.lastObserved}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───

interface SpeciesInventoryProps {
  species: Species[];
  allSpecies: Species[];
}

export function SpeciesInventory({ species, allSpecies }: SpeciesInventoryProps) {
  const [activeGroup, setActiveGroup] = useState<SpeciesGroup | 'all'>('all');
  const [showAllSpecies, setShowAllSpecies] = useState(false);

  const sourceList = showAllSpecies ? allSpecies : species;

  const filtered = useMemo(
    () => activeGroup === 'all' ? sourceList : sourceList.filter(s => s.group === activeGroup),
    [sourceList, activeGroup],
  );

  const redListedCount = useMemo(
    () => sourceList.filter(s => s.isRedListed).length,
    [sourceList],
  );

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sourceList.length };
    GROUPS.forEach(g => { counts[g] = sourceList.filter(s => s.group === g).length; });
    return counts;
  }, [sourceList]);

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-3 text-center">
          <p className="text-xl font-bold font-mono text-[var(--green)]">{sourceList.length}</p>
          <p className="text-[10px] text-[var(--text3)]">Arter totalt</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
          <p className="text-xl font-bold font-mono text-amber-400">{redListedCount}</p>
          <p className="text-[10px] text-[var(--text3)]">Rödlistade</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg2)' }}>
          <p className="text-xl font-bold font-mono text-[var(--text)]">{GROUPS.filter(g => groupCounts[g] > 0).length}</p>
          <p className="text-[10px] text-[var(--text3)]">Artgrupper</p>
        </div>
      </div>

      {/* Toggle: parcel vs all */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAllSpecies(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            !showAllSpecies
              ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
              : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          Detta skifte ({species.length})
        </button>
        <button
          onClick={() => setShowAllSpecies(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            showAllSpecies
              ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
              : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          Alla skiften ({allSpecies.length})
        </button>
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveGroup('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
            activeGroup === 'all'
              ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
              : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          <Search size={12} />
          Alla ({groupCounts.all})
        </button>
        {GROUPS.map(group => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              activeGroup === group
                ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            {GROUP_ICONS[group]}
            {group} ({groupCounts[group]})
          </button>
        ))}
      </div>

      {/* Species list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text3)] text-xs">
            Inga arter registrerade i denna kategori.
          </div>
        ) : (
          filtered.map(s => <SpeciesCard key={s.id} species={s} />)
        )}
      </div>
    </div>
  );
}
