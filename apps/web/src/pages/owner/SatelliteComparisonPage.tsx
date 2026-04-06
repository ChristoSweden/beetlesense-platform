import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScanEye,
  GitCompareArrows,
  MapPin,
  ChevronRight,
  Clock,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { SatelliteComparison } from '@/components/satellite/SatelliteComparison';

/* ─── Demo Data ─── */

interface DemoParcel {
  id: string;
  name: string;
  area: number; // hectares
  region: string;
  lat: number;
  lng: number;
}

interface ChangeEvent {
  id: string;
  parcelId: string;
  date: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  ndviDelta: number;
}

const DEMO_PARCELS: DemoParcel[] = [
  { id: 'parcel-norrby', name: 'Norrby Skog', area: 42.5, region: 'Småland', lat: 57.04, lng: 15.12 },
  { id: 'parcel-granvik', name: 'Granvik Norr', area: 28.3, region: 'Östergötland', lat: 58.41, lng: 15.62 },
  { id: 'parcel-tallmon', name: 'Tallmon Öst', area: 65.1, region: 'Dalarna', lat: 60.48, lng: 14.93 },
];

const DEMO_TIMELINE_DATES = [
  '2026-04-01', '2026-03-15', '2026-02-28', '2026-01-10',
  '2025-11-20', '2025-09-05', '2025-07-15', '2025-05-01',
  '2025-03-10', '2024-12-01', '2024-09-15', '2024-06-01',
];

const DEMO_CHANGES: ChangeEvent[] = [
  {
    id: 'ch-1',
    parcelId: 'parcel-norrby',
    date: '2026-03-15',
    description: 'NDVI drop detected in northwest sector — possible bark beetle activity',
    severity: 'high',
    ndviDelta: -14.2,
  },
  {
    id: 'ch-2',
    parcelId: 'parcel-granvik',
    date: '2026-01-10',
    description: 'Winter storm damage visible in eastern section',
    severity: 'moderate',
    ndviDelta: -8.6,
  },
  {
    id: 'ch-3',
    parcelId: 'parcel-tallmon',
    date: '2025-09-05',
    description: 'Seasonal greenup stronger than baseline — healthy recovery',
    severity: 'low',
    ndviDelta: 5.3,
  },
  {
    id: 'ch-4',
    parcelId: 'parcel-norrby',
    date: '2025-07-15',
    description: 'Drought stress detected across central area',
    severity: 'moderate',
    ndviDelta: -11.0,
  },
  {
    id: 'ch-5',
    parcelId: 'parcel-tallmon',
    date: '2025-03-10',
    description: 'Clear-cut area showing early regeneration',
    severity: 'low',
    ndviDelta: 3.1,
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: '#a3e635',
  moderate: '#facc15',
  high: '#f97316',
  critical: '#ef4444',
};

/* ─── Page Component ─── */

export default function SatelliteComparisonPage() {
  const { t } = useTranslation();
  const [selectedParcel, setSelectedParcel] = useState<DemoParcel | null>(null);

  const parcelChanges = useMemo(() => {
    if (!selectedParcel) return DEMO_CHANGES;
    return DEMO_CHANGES.filter((c) => c.parcelId === selectedParcel.id);
  }, [selectedParcel]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* ─── Header ─── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10 border border-[var(--green)]/20">
            <GitCompareArrows size={18} className="text-[var(--green)]" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold text-[var(--text)]">
              Satellite Comparison
            </h1>
            <p className="text-xs text-[var(--text3)]">
              Compare satellite imagery over time to detect changes in your forest
            </p>
          </div>
        </div>

        {/* ─── Parcel Selector ─── */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider mb-3">
            Select Parcel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DEMO_PARCELS.map((parcel) => {
              const isSelected = selectedParcel?.id === parcel.id;
              const changeCount = DEMO_CHANGES.filter(
                (c) => c.parcelId === parcel.id,
              ).length;

              return (
                <button
                  key={parcel.id}
                  onClick={() => setSelectedParcel(parcel)}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-[var(--green)] ring-1 ring-[var(--green)]/30'
                      : 'border-[var(--border)] hover:border-[var(--border2)]'
                  }`}
                  style={{ background: isSelected ? 'var(--green-bg, var(--bg2))' : 'var(--bg2)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-[var(--text)]">
                      {parcel.name}
                    </span>
                    <ChevronRight
                      size={14}
                      className={isSelected ? 'text-[var(--green)]' : 'text-[var(--text3)]'}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {parcel.region}
                    </span>
                    <span>{parcel.area} ha</span>
                    {changeCount > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-600">
                        <AlertTriangle size={10} />
                        {changeCount} changes
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Comparison View ─── */}
        {selectedParcel ? (
          <div className="space-y-6">
            <SatelliteComparison
              parcelId={selectedParcel.id}
              parcelName={selectedParcel.name}
            />

            {/* ─── Timeline ─── */}
            <div
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} className="text-[var(--text3)]" />
                <span className="text-sm font-semibold text-[var(--text)]">
                  Available Imagery Dates
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_TIMELINE_DATES.map((dateStr) => {
                  const hasChange = DEMO_CHANGES.some(
                    (c) =>
                      c.date === dateStr &&
                      (c.parcelId === selectedParcel.id || !selectedParcel),
                  );
                  return (
                    <div
                      key={dateStr}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono border ${
                        hasChange
                          ? 'border-amber-400/40 bg-amber-50 text-amber-700'
                          : 'border-[var(--border)] text-[var(--text3)]'
                      }`}
                      style={!hasChange ? { background: 'var(--bg)' } : undefined}
                      title={hasChange ? 'Change detected on this date' : ''}
                    >
                      {new Date(dateStr).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                      {hasChange && (
                        <AlertTriangle size={8} className="inline ml-1 -mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Change History ─── */}
            <div
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-[var(--text3)]" />
                <span className="text-sm font-semibold text-[var(--text)]">
                  Detected Changes
                </span>
                <span className="ml-auto text-[10px] text-[var(--text3)] font-mono">
                  {parcelChanges.length} events
                </span>
              </div>

              {parcelChanges.length === 0 ? (
                <p className="text-xs text-[var(--text3)] py-4 text-center">
                  No significant changes detected for this parcel
                </p>
              ) : (
                <div className="space-y-2">
                  {parcelChanges.map((change) => (
                    <div
                      key={change.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)]"
                      style={{ background: 'var(--bg)' }}
                    >
                      {/* Severity dot */}
                      <div
                        className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: SEVERITY_COLORS[change.severity] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-[var(--text)]">
                            {new Date(change.date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
                            style={{
                              background: `${SEVERITY_COLORS[change.severity]}18`,
                              color: SEVERITY_COLORS[change.severity],
                            }}
                          >
                            {change.severity}
                          </span>
                          <span className="ml-auto text-[10px] font-mono text-[var(--text3)]">
                            {change.ndviDelta > 0 ? '+' : ''}
                            {change.ndviDelta.toFixed(1)}% NDVI
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                          {change.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ─── Empty state: no parcel selected ─── */
          <div
            className="rounded-xl border border-[var(--border)] p-8 text-center"
            style={{ background: 'var(--bg2)' }}
          >
            <ScanEye size={32} className="mx-auto text-[var(--text3)] mb-3" />
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
              Select a parcel to begin
            </h3>
            <p className="text-xs text-[var(--text3)] max-w-md mx-auto">
              Choose one of your forest parcels above to compare satellite imagery
              over time and detect vegetation changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
