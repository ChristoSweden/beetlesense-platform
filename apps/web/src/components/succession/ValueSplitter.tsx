import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Wand2,
  TreePine,
  MapPin,
  Route,
  TrendingUp,
} from 'lucide-react';
import {
  type ForestParcel,
  type Heir,
  DEMO_PARCELS,
  getParcelTotalValue,
  calculateSplitResults,
  fairSplit,
  formatSEK,
} from '@/services/successionService';

const LOCATION_COLORS: Record<string, string> = {
  premium: '#22c55e',
  good: '#3b82f6',
  average: '#f59e0b',
  remote: '#ef4444',
};

const GROWTH_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const HEIR_COLORS = [
  'var(--green)',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

export function ValueSplitter() {
  const { t, i18n } = useTranslation();
  const _isSv = i18n.language === 'sv';

  const [heirCount, setHeirCount] = useState(2);
  const [heirs, setHeirs] = useState<Heir[]>(() =>
    Array.from({ length: 2 }, (_, i) => ({
      id: `heir-${i}`,
      name: `${t('succession.splitter.heir')} ${i + 1}`,
      assignedParcelIds: [],
    })),
  );
  const [parcels] = useState<ForestParcel[]>(DEMO_PARCELS);
  const [dragParcel, setDragParcel] = useState<string | null>(null);

  const totalValue = useMemo(
    () => parcels.reduce((s, p) => s + getParcelTotalValue(p), 0),
    [parcels],
  );

  // Update heirs when count changes
  const updateHeirCount = useCallback(
    (count: number) => {
      const clamped = Math.max(2, Math.min(6, count));
      setHeirCount(clamped);
      setHeirs((prev) => {
        if (clamped > prev.length) {
          return [
            ...prev,
            ...Array.from({ length: clamped - prev.length }, (_, i) => ({
              id: `heir-${prev.length + i}`,
              name: `${t('succession.splitter.heir')} ${prev.length + i + 1}`,
              assignedParcelIds: [] as string[],
            })),
          ];
        }
        // When reducing, unassign parcels from removed heirs
        return prev.slice(0, clamped);
      });
    },
    [t],
  );

  // Assign a parcel to an heir
  const assignParcel = useCallback((parcelId: string, heirIdx: number) => {
    setHeirs((prev) =>
      prev.map((h, i) => ({
        ...h,
        assignedParcelIds:
          i === heirIdx
            ? [...h.assignedParcelIds.filter((id) => id !== parcelId), parcelId]
            : h.assignedParcelIds.filter((id) => id !== parcelId),
      })),
    );
  }, []);

  // Auto fair split
  const handleFairSplit = useCallback(() => {
    const assignments = fairSplit(parcels, heirCount);
    setHeirs((prev) =>
      prev.map((h, i) => ({
        ...h,
        assignedParcelIds: assignments.get(i) ?? [],
      })),
    );
  }, [parcels, heirCount]);

  const splitResults = useMemo(
    () => calculateSplitResults(parcels, heirs),
    [parcels, heirs],
  );

  // Unassigned parcels
  const assignedIds = new Set(heirs.flatMap((h) => h.assignedParcelIds));
  const _unassigned = parcels.filter((p) => !assignedIds.has(p.id));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[var(--text3)]" />
          <label className="text-xs text-[var(--text3)]">
            {t('succession.splitter.numberOfHeirs')}
          </label>
          <div className="flex items-center gap-1">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => updateHeirCount(n)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  heirCount === n
                    ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                    : 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleFairSplit}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)]/10 text-[var(--green)] text-xs font-medium border border-[var(--green)]/20 hover:bg-[var(--green)]/20 transition-colors"
        >
          <Wand2 size={14} />
          {t('succession.splitter.fairSplit')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parcels pool */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <TreePine size={14} className="text-[var(--green)]" />
            {t('succession.splitter.parcels')}
            <span className="text-[var(--text3)] font-normal">
              ({t('succession.splitter.totalValue')}: {formatSEK(totalValue)})
            </span>
          </h4>

          <div className="space-y-2">
            {parcels.map((parcel) => {
              const val = getParcelTotalValue(parcel);
              const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
              const assignedToIdx = heirs.findIndex((h) =>
                h.assignedParcelIds.includes(parcel.id),
              );
              const isDragging = dragParcel === parcel.id;

              return (
                <div
                  key={parcel.id}
                  draggable
                  onDragStart={() => setDragParcel(parcel.id)}
                  onDragEnd={() => setDragParcel(null)}
                  className={`rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all ${
                    isDragging
                      ? 'opacity-50 border-[var(--green)]'
                      : assignedToIdx >= 0
                        ? 'border-[var(--border)] opacity-70'
                        : 'border-[var(--border)]'
                  }`}
                  style={{
                    background: 'var(--bg2)',
                    borderLeftWidth: '3px',
                    borderLeftColor:
                      assignedToIdx >= 0
                        ? HEIR_COLORS[assignedToIdx % HEIR_COLORS.length]
                        : 'var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--text)]">{parcel.name}</span>
                    <span className="text-xs font-mono text-[var(--text)]">{formatSEK(val)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
                    <span className="flex items-center gap-1">
                      <TreePine size={10} /> {parcel.areaHa} ha
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={10} style={{ color: LOCATION_COLORS[parcel.locationQuality] }} />
                      {parcel.locationQuality}
                    </span>
                    <span className="flex items-center gap-1">
                      <Route size={10} /> {parcel.accessRoadQuality}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp size={10} /> {GROWTH_LABELS[parcel.futureGrowthPotential]}
                    </span>
                  </div>

                  {/* Value breakdown bar */}
                  <div className="mt-2 h-1 rounded-full bg-[var(--bg3)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--green)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Mobile: dropdown assign */}
                  <div className="mt-2 lg:hidden">
                    <select
                      value={assignedToIdx >= 0 ? assignedToIdx : ''}
                      onChange={(e) => {
                        const idx = e.target.value === '' ? -1 : Number(e.target.value);
                        if (idx >= 0) assignParcel(parcel.id, idx);
                      }}
                      className="w-full text-xs bg-[var(--bg3)] text-[var(--text)] border border-[var(--border)] rounded-lg px-2 py-1.5"
                    >
                      <option value="">{t('succession.splitter.assignTo')}</option>
                      {heirs.map((h, i) => (
                        <option key={h.id} value={i}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heir drop zones */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--text)] mb-3">
            {t('succession.splitter.heirAssignments')}
          </h4>

          <div className="space-y-3">
            {heirs.map((heir, heirIdx) => {
              const result = splitResults[heirIdx];
              const color = HEIR_COLORS[heirIdx % HEIR_COLORS.length];

              return (
                <div
                  key={heir.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragParcel) assignParcel(dragParcel, heirIdx);
                  }}
                  className="rounded-xl border border-[var(--border)] p-4 min-h-[80px] transition-colors"
                  style={{
                    background: 'var(--bg2)',
                    borderTopWidth: '3px',
                    borderTopColor: color,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <input
                      value={heir.name}
                      onChange={(e) =>
                        setHeirs((prev) =>
                          prev.map((h, i) =>
                            i === heirIdx ? { ...h, name: e.target.value } : h,
                          ),
                        )
                      }
                      className="text-sm font-semibold text-[var(--text)] bg-transparent border-none outline-none focus:ring-1 focus:ring-[var(--green)] rounded px-1"
                    />
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold text-[var(--text)]">
                        {formatSEK(result?.totalValue ?? 0)}
                      </p>
                      <p className="text-[10px] text-[var(--text3)]">
                        {(result?.percentOfTotal ?? 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {result && result.parcels.length > 0 ? (
                    <div className="space-y-1">
                      {result.parcels.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-2 py-1 rounded bg-[var(--bg3)] text-xs"
                        >
                          <span className="text-[var(--text2)]">{p.name}</span>
                          <span className="font-mono text-[var(--text3)]">
                            {formatSEK(getParcelTotalValue(p))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text3)] text-center py-3">
                      {t('succession.splitter.dragHere')}
                    </p>
                  )}

                  {/* Value bar relative to fair share */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-[var(--text3)] mb-1">
                      <span>{t('succession.splitter.fairShare')}</span>
                      <span>{(100 / heirCount).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(result?.percentOfTotal ?? 0, 100)}%`,
                          backgroundColor: color,
                          opacity:
                            Math.abs((result?.percentOfTotal ?? 0) - 100 / heirCount) < 5
                              ? 1
                              : 0.6,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fairness indicator */}
          {splitResults.every((r) => r.parcels.length > 0) && (
            <div className="mt-4 rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
              <p className="text-xs font-medium text-[var(--text)] mb-2">
                {t('succession.splitter.fairnessScore')}
              </p>
              <div className="space-y-1">
                {splitResults.map((r, i) => {
                  const fairPct = 100 / heirCount;
                  const diff = Math.abs(r.percentOfTotal - fairPct);
                  return (
                    <div key={r.heirId} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: HEIR_COLORS[i % HEIR_COLORS.length] }}
                      />
                      <span className="text-[var(--text2)] flex-1">{r.heirName}</span>
                      <span
                        className={`font-mono ${
                          diff < 3 ? 'text-[var(--green)]' : diff < 10 ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                        }`}
                      >
                        {diff < 3 ? '~' : r.percentOfTotal > fairPct ? '+' : '-'}
                        {diff.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
