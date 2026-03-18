import { useState } from 'react';
import {
  AlertTriangle,
  Info,
  AlertOctagon,
  Radar,
  Settings2,
  Satellite,
  Users,
  Layers,
  Clock,
  Navigation,
} from 'lucide-react';
import {
  type NeighborAlert,
  type AlertSeverity,
  type AlertRadius,
} from '@/hooks/useCommunity';

// ─── Severity config ───

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: React.ReactNode; color: string; label: string; borderColor: string }> = {
  info: {
    icon: <Info size={14} />,
    color: '#60a5fa',
    label: 'Information',
    borderColor: 'border-blue-500/20',
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    color: '#fbbf24',
    label: 'Varning',
    borderColor: 'border-amber-500/20',
  },
  critical: {
    icon: <AlertOctagon size={14} />,
    color: '#ef4444',
    label: 'Kritisk',
    borderColor: 'border-red-500/20',
  },
};

const SOURCE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  community: { icon: <Users size={10} />, label: 'Grannrapport' },
  satellite: { icon: <Satellite size={10} />, label: 'Satellitdata' },
  combined: { icon: <Layers size={10} />, label: 'Kombinerad' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return 'just nu';
  if (diffH < 24) return `${diffH}h sedan`;
  if (diffD < 30) return `${diffD}d sedan`;
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

// ─── Props ───

interface NeighborAlertsProps {
  alerts: NeighborAlert[];
  isLoading: boolean;
  alertRadius: AlertRadius;
  onRadiusChange: (r: AlertRadius) => void;
}

const RADII: AlertRadius[] = [2, 5, 10];

export function NeighborAlerts({ alerts, isLoading, alertRadius, onRadiusChange }: NeighborAlertsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | null>(null);

  const filtered = severityFilter ? alerts.filter((a) => a.severity === severityFilter) : alerts;

  // Stats
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => a.severity === 'info').length;

  return (
    <div>
      {/* Mini heatmap visualization */}
      <div
        className="rounded-xl border border-[var(--border)] p-4 mb-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radar size={16} className="text-[var(--green)]" />
            <span className="text-xs font-semibold text-[var(--text)]">Varningszon</span>
            <span className="text-[10px] text-[var(--text3)]">({alertRadius} km radie)</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${
              showSettings ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
            }`}
          >
            <Settings2 size={14} />
          </button>
        </div>

        {/* Simple radial visualization */}
        <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-3">
          {/* Rings */}
          {RADII.map((r) => (
            <div
              key={r}
              className="absolute rounded-full border"
              style={{
                width: `${(r / 10) * 100}%`,
                height: `${(r / 10) * 100}%`,
                top: `${50 - (r / 10) * 50}%`,
                left: `${50 - (r / 10) * 50}%`,
                borderColor: r <= alertRadius ? 'var(--green)' : 'var(--border)',
                opacity: r <= alertRadius ? 0.3 : 0.15,
                background: r <= alertRadius ? 'rgba(74, 222, 128, 0.03)' : 'transparent',
              }}
            />
          ))}

          {/* Center dot (you) */}
          <div
            className="absolute w-3 h-3 rounded-full bg-[var(--green)] shadow-lg shadow-[var(--green)]/30"
            style={{ top: 'calc(50% - 6px)', left: 'calc(50% - 6px)' }}
          />

          {/* Alert dots */}
          {filtered.slice(0, 8).map((alert, i) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            // Spread dots around the center within radius
            const angle = (i / Math.max(filtered.length, 1)) * 2 * Math.PI;
            const normalizedDist = (alert.distance_km / 10) * 45; // % from center
            const x = 50 + Math.cos(angle) * normalizedDist;
            const y = 50 + Math.sin(angle) * normalizedDist;

            return (
              <div
                key={alert.id}
                className="absolute w-2.5 h-2.5 rounded-full animate-pulse"
                style={{
                  background: cfg.color,
                  top: `calc(${y}% - 5px)`,
                  left: `calc(${x}% - 5px)`,
                  boxShadow: `0 0 6px ${cfg.color}40`,
                }}
                title={alert.title}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span className="text-[var(--text3)]">Kritisk ({criticalCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
            <span className="text-[var(--text3)]">Varning ({warningCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#60a5fa]" />
            <span className="text-[var(--text3)]">Info ({infoCount})</span>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div
          className="rounded-xl border border-[var(--border)] p-4 mb-4"
          style={{ background: 'var(--bg2)' }}
        >
          <h3 className="text-xs font-semibold text-[var(--text)] mb-3">Inställningar</h3>

          {/* Radius selector */}
          <label className="text-[10px] font-medium text-[var(--text3)] mb-2 block">Varningsradie</label>
          <div className="flex gap-2 mb-3">
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => onRadiusChange(r)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  alertRadius === r
                    ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                    : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
                }`}
              >
                {r} km
              </button>
            ))}
          </div>

          {/* Severity filter */}
          <label className="text-[10px] font-medium text-[var(--text3)] mb-2 block">Filtrera allvarlighet</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSeverityFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                severityFilter === null
                  ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                  : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
              }`}
            >
              Alla
            </button>
            {(['critical', 'warning', 'info'] as AlertSeverity[]).map((sev) => {
              const cfg = SEVERITY_CONFIG[sev];
              return (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(severityFilter === sev ? null : sev)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                    severityFilter === sev
                      ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                      : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
                  }`}
                >
                  <span style={{ color: cfg.color }}>{cfg.icon}</span>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] p-4 animate-pulse"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="h-3 w-48 bg-[var(--bg3)] rounded mb-2" />
              <div className="h-3 w-full bg-[var(--bg3)] rounded mb-1" />
              <div className="h-3 w-2/3 bg-[var(--bg3)] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Alerts list */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <Radar size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-30" />
          <p className="text-sm text-[var(--text3)]">Inga varningar inom {alertRadius} km</p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const source = SOURCE_CONFIG[alert.source];

            return (
              <article
                key={alert.id}
                className={`rounded-xl border p-4 ${cfg.borderColor} hover:border-[var(--border2)] transition-colors`}
                style={{ background: 'var(--bg2)' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${cfg.color}15`, color: cfg.color }}
                    >
                      {cfg.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--text)]">{alert.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: `${cfg.color}15`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <div className="flex items-center gap-0.5 text-[10px] text-[var(--text3)]">
                          {source.icon}
                          <span>{source.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
                  {alert.description}
                </p>

                {/* Footer: distance + direction + time */}
                <div className="flex items-center justify-between text-[10px] text-[var(--text3)]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Navigation size={10} />
                      <span>{alert.distance_km} km {alert.direction}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{timeAgo(alert.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="mt-4 text-center text-[10px] text-[var(--text3)]">
          {filtered.length} varningar inom {alertRadius} km radie
        </p>
      )}
    </div>
  );
}
