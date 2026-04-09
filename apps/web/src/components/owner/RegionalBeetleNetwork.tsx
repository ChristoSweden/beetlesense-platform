/**
 * RegionalBeetleNetwork — Map view of community + Skogsstyrelsen bark beetle alerts.
 *
 * Shows nearby alerts within 25 km, colour-coded by severity.
 * Lets the user submit their own observations to the community network.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bug,
  MapPin,
  AlertTriangle,
  Radio,
  Satellite,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Loader2,
  RefreshCw,
  Send,
  Info,
} from 'lucide-react';
import {
  getNearbyBeetleAlerts,
  submitBeetleObservation,
  type RegionalBeetleAlert,
} from '@/services/barkBeetleNetworkService';

// ─── Constants ───

// Default centre: Småland/Kronoberg region (typical demo user area)
const DEFAULT_LAT = 57.15;
const DEFAULT_LNG = 14.90;

const SEVERITY_CONFIG = {
  watch: {
    label: 'Watch',
    labelSv: 'Bevakning',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  warning: {
    label: 'Warning',
    labelSv: 'Varning',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.35)',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  critical: {
    label: 'Critical',
    labelSv: 'Kritisk',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-800 border-red-300',
  },
} as const;

const SOURCE_ICONS: Record<RegionalBeetleAlert['source'], React.ReactNode> = {
  skogsstyrelsen: <Radio size={12} />,
  community: <Users size={12} />,
  satellite: <Satellite size={12} />,
};

const SOURCE_LABELS: Record<RegionalBeetleAlert['source'], string> = {
  skogsstyrelsen: 'Skogsstyrelsen',
  community: 'Community',
  satellite: 'Satellite AI',
};

const SPECIES_OPTIONS = [
  'Ips typographus (European Spruce Bark Beetle)',
  'Pityogenes chalcographus (Six-toothed Spruce Bark Beetle)',
  'Hylobius abietis (Pine Weevil)',
  'Tomicus piniperda (Common Pine Shoot Beetle)',
  'Hylurgops palliatus (Striped Ambrosia Beetle)',
  'Other bark beetle species',
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Simple SVG map visualisation ───

function AlertMap({
  alerts,
  selected,
  onSelect,
}: {
  alerts: RegionalBeetleAlert[];
  selected: RegionalBeetleAlert | null;
  onSelect: (a: RegionalBeetleAlert) => void;
}) {
  // Map bounds: 25 km radius ≈ ~0.45° lat/lng at 57°N
  const RANGE = 0.5;
  const cx = DEFAULT_LNG;
  const cy = DEFAULT_LAT;

  // Convert lat/lng to SVG coordinates (400x400 viewBox)
  function toSvg(lat: number, lng: number): [number, number] {
    const x = ((lng - (cx - RANGE)) / (2 * RANGE)) * 400;
    const y = (1 - (lat - (cy - RANGE)) / (2 * RANGE)) * 400;
    return [x, y];
  }

  const [ux, uy] = toSvg(cy, cx);

  return (
    <div className="relative w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden" style={{ aspectRatio: '4/3' }}>
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
        style={{ background: 'var(--bg)' }}
      >
        {/* Grid lines */}
        {[100, 200, 300].map((v) => (
          <g key={v}>
            <line x1={v} y1={0} x2={v} y2={400} stroke="var(--border)" strokeWidth={0.5} />
            <line x1={0} y1={v} x2={400} y2={v} stroke="var(--border)" strokeWidth={0.5} />
          </g>
        ))}

        {/* 25 km radius ring */}
        <circle
          cx={ux}
          cy={uy}
          r={176}
          fill="none"
          stroke="var(--border2)"
          strokeWidth={1}
          strokeDasharray="6 4"
        />

        {/* Radius label */}
        <text x={ux + 8} y={uy - 166} fontSize={9} fill="var(--text3)">
          25 km radius
        </text>

        {/* Alert pins */}
        {alerts.map((a) => {
          const [ax, ay] = toSvg(a.lat, a.lng);
          const cfg = SEVERITY_CONFIG[a.severity];
          const isSelected = selected?.id === a.id;
          return (
            <g
              key={a.id}
              transform={`translate(${ax},${ay})`}
              onClick={() => onSelect(a)}
              style={{ cursor: 'pointer' }}
            >
              {isSelected && (
                <circle r={16} fill={cfg.color} opacity={0.2} />
              )}
              <circle
                r={isSelected ? 9 : 7}
                fill={cfg.color}
                stroke="white"
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text
                y={1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fill="white"
                fontWeight="bold"
              >
                !
              </text>
            </g>
          );
        })}

        {/* User parcel location */}
        <g transform={`translate(${ux},${uy})`}>
          <circle r={8} fill="var(--green)" stroke="white" strokeWidth={2} />
          <text
            y={1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={7}
            fill="white"
          >
            ★
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1 bg-[var(--bg2)] border border-[var(--border)] rounded-lg p-2 text-[10px]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[var(--green)]" />
          <span className="text-[var(--text3)]">Your parcels</span>
        </div>
        {(['watch', 'warning', 'critical'] as const).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${SEVERITY_CONFIG[s].dot}`} />
            <span className="text-[var(--text3)] capitalize">{SEVERITY_CONFIG[s].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Submit Form ───

function SubmitReportForm({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [severity, setSeverity] = useState<'watch' | 'warning' | 'critical'>('watch');
  const [species, setSpecies] = useState(SPECIES_OPTIONS[0]);
  const [trees, setTrees] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await submitBeetleObservation({
      parcelId: '',
      severity,
      speciesAffected: species,
      treesAffected: parseInt(trees) || 0,
      photos: [],
    });

    setSubmitting(false);

    if (result.success) {
      onSubmitted();
    } else {
      setError(result.error ?? 'Submission failed. Please try again.');
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Submit an Observation</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Severity */}
        <div>
          <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">Severity level</label>
          <div className="flex gap-2">
            {(['watch', 'warning', 'critical'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  severity === s
                    ? `border-[${SEVERITY_CONFIG[s].color}]`
                    : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
                }`}
                style={
                  severity === s
                    ? {
                        background: SEVERITY_CONFIG[s].bg,
                        color: SEVERITY_CONFIG[s].color,
                        borderColor: SEVERITY_CONFIG[s].color,
                      }
                    : {}
                }
              >
                {SEVERITY_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Species */}
        <div>
          <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">Affected species</label>
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)] transition-colors"
          >
            {SPECIES_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Trees affected */}
        <div>
          <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">Estimated trees affected</label>
          <input
            type="number"
            min="1"
            value={trees}
            onChange={(e) => setTrees(e.target.value)}
            placeholder="e.g. 15"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--green)] transition-colors"
          />
        </div>

        {/* Photo upload note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <Info size={14} className="text-[var(--text3)] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[var(--text3)]">
            Photo upload is available in the mobile app. Your report will be visible to forest owners within 5 km and will be forwarded to Skogsstyrelsen for verification.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)] text-white text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Alert Row ───

function AlertRow({
  alert,
  isSelected,
  onClick,
}: {
  alert: RegionalBeetleAlert;
  isSelected: boolean;
  onClick: () => void;
}) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
          : 'border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg2)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg }}
        >
          <Bug size={14} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
              {SOURCE_ICONS[alert.source]}
              {SOURCE_LABELS[alert.source]}
            </span>
          </div>
          <p className="text-xs font-medium text-[var(--text)] mt-1 truncate">
            {alert.affectedSpecies}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
              <MapPin size={10} />
              {alert.distanceKm} km away
            </span>
            <span className="text-[10px] text-[var(--text3)]">{formatDate(alert.reportedAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Detail Panel ───

function AlertDetail({
  alert,
  onClose,
}: {
  alert: RegionalBeetleAlert;
  onClose: () => void;
}) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      <div className="h-1" style={{ background: cfg.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: cfg.bg }}
            >
              <Bug size={18} style={{ color: cfg.color }} />
            </div>
            <div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge}`}
              >
                {cfg.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{alert.affectedSpecies}</h3>
        <p className="text-xs text-[var(--text2)] leading-relaxed mb-4">{alert.description}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Distance</p>
            <p className="text-sm font-semibold text-[var(--text)]">{alert.distanceKm} km</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Reported</p>
            <p className="text-sm font-semibold text-[var(--text)]">{formatDate(alert.reportedAt)}</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] col-span-2">
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Data source</p>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text3)]">{SOURCE_ICONS[alert.source]}</span>
              <p className="text-sm font-semibold text-[var(--text)]">{SOURCE_LABELS[alert.source]}</p>
            </div>
          </div>
        </div>

        {alert.severity === 'critical' && (
          <div
            className="p-3 rounded-lg border text-xs leading-relaxed"
            style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}
          >
            <strong>Immediate action recommended:</strong> Inspect your spruce-dominant parcels for fresh bore dust, resin flow, and needle discolouration. Contact Skogsstyrelsen if infestation is confirmed.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───

export function RegionalBeetleNetwork() {
  const [alerts, setAlerts] = useState<RegionalBeetleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RegionalBeetleAlert | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [listExpanded, setListExpanded] = useState(true);

  const criticalNearby = alerts.filter((a) => a.severity === 'critical' && a.distanceKm <= 5);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNearbyBeetleAlerts(DEFAULT_LAT, DEFAULT_LNG, 25);
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitted = () => {
    setShowForm(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    load();
  };

  return (
    <div className="space-y-4">
      {/* Critical proximity banner */}
      {criticalNearby.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="text-sm font-semibold">
              {criticalNearby.length} critical outbreak{criticalNearby.length > 1 ? 's' : ''} within 5 km of your parcels
            </p>
            <p className="text-xs mt-0.5 text-red-700">
              Inspect your spruce stands immediately. Early intervention significantly reduces spread risk.
            </p>
          </div>
        </div>
      )}

      {/* Submission success */}
      {submitted && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 text-[var(--green)]">
          <Check size={16} />
          <p className="text-xs font-medium">Report submitted. It will be visible to nearby forest owners shortly.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
            <Radio size={16} className="text-[var(--green)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Regional Beetle Network</h2>
            <p className="text-[10px] text-[var(--text3)]">
              {loading ? 'Loading…' : `${alerts.length} alert${alerts.length !== 1 ? 's' : ''} within 25 km`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)] text-white text-xs font-semibold hover:brightness-110 transition"
            >
              <Bug size={13} />
              Submit report
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      {loading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] flex items-center justify-center" style={{ aspectRatio: '4/3' }}>
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
        </div>
      ) : (
        <AlertMap alerts={alerts} selected={selected} onSelect={setSelected} />
      )}

      {/* Submit form */}
      {showForm && (
        <SubmitReportForm onClose={() => setShowForm(false)} onSubmitted={handleSubmitted} />
      )}

      {/* Alert detail */}
      {selected && !showForm && (
        <AlertDetail alert={selected} onClose={() => setSelected(null)} />
      )}

      {/* Alert list */}
      {!loading && alerts.length > 0 && (
        <div>
          <button
            onClick={() => setListExpanded((v) => !v)}
            className="flex items-center gap-2 w-full text-xs font-semibold text-[var(--text2)] py-2 hover:text-[var(--text)] transition-colors"
          >
            {listExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            All regional alerts ({alerts.length})
          </button>

          {listExpanded && (
            <div className="space-y-2 mt-1">
              {alerts.map((a) => (
                <AlertRow
                  key={a.id}
                  alert={a}
                  isSelected={selected?.id === a.id}
                  onClick={() => setSelected(a.id === selected?.id ? null : a)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="text-center py-8 text-[var(--text3)]">
          <Bug size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No alerts within 25 km</p>
          <p className="text-xs mt-1">Your area appears clear. Continue regular monitoring.</p>
        </div>
      )}
    </div>
  );
}
