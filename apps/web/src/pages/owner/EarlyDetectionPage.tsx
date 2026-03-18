import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Satellite,
  Users,
  Crosshair,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Bug,
  TrendingDown,
  MapPin,
  CheckCircle2,
  Circle,
  Radio,
  ArrowRight,
  Flame,
  Droplets,
  TreePine,
  Cpu,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useEarlyDetection,
  type DetectionAlert,
  type AlertSeverity,
  type CommunitySighting,
  type TrapData,
  type RiskPropagation,
  type NDVIChangeResult,
  type ActionChecklist,
  type ResponseStats,
} from '@/hooks/useEarlyDetection';
import { useSensorProducts, type FusionProduct } from '@/hooks/useSensorProducts';

// ─── Helpers ───

function severityColor(s: AlertSeverity): string {
  switch (s) {
    case 'critical': return '#ef4444';
    case 'danger': return '#f97316';
    case 'warning': return '#fbbf24';
    case 'info': return '#60a5fa';
  }
}

function severityLabel(s: AlertSeverity): string {
  switch (s) {
    case 'critical': return 'Kritisk';
    case 'danger': return 'Allvarlig';
    case 'warning': return 'Varning';
    case 'info': return 'Information';
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case 'active': return 'Aktiv';
    case 'investigating': return 'Undersöks';
    case 'confirmed': return 'Bekräftad';
    case 'resolved': return 'Löst';
    case 'false_positive': return 'Falsk positiv';
    default: return s;
  }
}

function sourceLabel(s: string): string {
  switch (s) {
    case 'satellite': return 'Satellit';
    case 'community': return 'Rapporterad';
    case 'trap': return 'Fälla';
    case 'drone': return 'Drönare';
    case 'neighbor': return 'Granne';
    default: return s;
  }
}

function sourceIcon(s: string) {
  switch (s) {
    case 'satellite': return Satellite;
    case 'community': return Users;
    case 'trap': return Crosshair;
    case 'drone': return Radio;
    default: return MapPin;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h sedan`;
  const days = Math.floor(hours / 24);
  return `${days}d sedan`;
}

// ─── Alert Card ───

function AlertCard({ alert, expanded, onToggle }: { alert: DetectionAlert; expanded: boolean; onToggle: () => void }) {
  const color = severityColor(alert.severity);
  const Icon = sourceIcon(alert.source);

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{ borderColor: `${color}40`, background: 'var(--bg2)' }}
    >
      <button onClick={onToggle} className="w-full text-left p-3">
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${color}15` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ color, background: `${color}15` }}
              >
                {severityLabel(alert.severity)}
              </span>
              <span className="text-[9px] text-[var(--text3)]">{sourceLabel(alert.source)}</span>
              <span className="text-[9px] text-[var(--text3)]">&middot;</span>
              <span className="text-[9px] text-[var(--text3)]">{statusLabel(alert.status)}</span>
            </div>
            <p className="text-xs font-medium text-[var(--text)] truncate">{alert.title}</p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {alert.parcelName} &middot; {timeAgo(alert.detectedAt)}
              {alert.affectedAreaHa > 0 && ` &middot; ${alert.affectedAreaHa} ha`}
            </p>
          </div>
          <div className="flex-shrink-0">
            {expanded ? <ChevronUp size={14} className="text-[var(--text3)]" /> : <ChevronDown size={14} className="text-[var(--text3)]" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[var(--border)]">
          <p className="text-[11px] text-[var(--text2)] mt-2 mb-2">{alert.description}</p>

          <div className="flex items-center gap-3 mb-2">
            {alert.ndviDrop !== undefined && (
              <div className="flex items-center gap-1">
                <TrendingDown size={10} className="text-[var(--red)]" />
                <span className="text-[10px] font-mono text-[var(--red)]">NDVI -{alert.ndviDrop}%</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Shield size={10} className="text-[var(--text3)]" />
              <span className="text-[10px] font-mono text-[var(--text2)]">Konfidens {alert.confidence}%</span>
            </div>
          </div>

          {alert.responseActions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider">Åtgärder</p>
              {alert.responseActions.map((action, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-[var(--text2)]">
                  <CheckCircle2 size={10} className="text-[var(--green)] flex-shrink-0" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Community Sightings ───

function CommunitySightingsPanel({ sightings }: { sightings: CommunitySighting[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Rapporterade observationer i närheten
          </h3>
        </div>
        <div className="space-y-2">
          {sightings.map((s) => {
            const color = severityColor(s.severity);
            return (
              <div key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--text)]">{s.reporterName}</span>
                    <span className="text-[9px] text-[var(--text3)]">{s.distance} km {s.direction}</span>
                    {s.confirmed && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-[var(--red)]/10 text-[var(--red)]">Bekräftad</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text2)] mt-0.5">{s.description}</p>
                  <span className="text-[9px] text-[var(--text3)]">{timeAgo(s.reportedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Pheromone Trap Data ───

function TrapDataPanel({ traps }: { traps: TrapData[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Feromonfällor
          </h3>
        </div>
        <div className="space-y-2">
          {traps.map((trap) => {
            const aboveColor = trap.isAboveThreshold ? '#ef4444' : '#4ade80';
            const trendIcon = trap.weeklyTrend === 'increasing' ? '↑' : trap.weeklyTrend === 'decreasing' ? '↓' : '→';
            return (
              <div key={trap.id} className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-xs font-medium text-[var(--text)]">{trap.parcelName}</span>
                    <span className="text-[9px] text-[var(--text3)] ml-2">{trap.trapType}</span>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: aboveColor }}>
                    {trap.catchCount} {trendIcon}
                  </span>
                </div>
                {/* Mini bar chart */}
                <div className="flex items-end gap-1 h-8">
                  {trap.weeklyHistory.map((w, i) => {
                    const maxCount = Math.max(...trap.weeklyHistory.map((h) => h.count), trap.threshold);
                    const height = Math.max(2, (w.count / maxCount) * 32);
                    const isAbove = w.count >= trap.threshold;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${height}px`,
                            background: isAbove ? '#ef4444' : 'var(--green)',
                            opacity: 0.7,
                          }}
                        />
                        <span className="text-[7px] text-[var(--text3)] mt-0.5">{w.week}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Threshold line label */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[8px] text-[var(--text3)]">Tröskel: {trap.threshold}</span>
                  {trap.isAboveThreshold && (
                    <span className="text-[8px] text-[var(--red)]">Över tröskel</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Risk Propagation ───

function RiskPropagationPanel({ propagations }: { propagations: RiskPropagation[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Spridningsriskmodell
          </h3>
        </div>
        <div className="space-y-2">
          {propagations.map((p, i) => {
            const probColor = p.probability >= 40 ? '#ef4444' : p.probability >= 20 ? '#f97316' : '#fbbf24';
            return (
              <div key={i} className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] text-[var(--text3)]">{p.sourceParcelName}</span>
                  <ArrowRight size={10} className="text-[var(--text3)]" />
                  <span className="text-[10px] font-semibold text-[var(--text)]">{p.targetParcelName}</span>
                </div>
                <div className="flex items-center gap-4 mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-[var(--text3)]">Avstånd:</span>
                    <span className="text-[10px] font-mono text-[var(--text)]">{p.distance} km</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-[var(--text3)]">Sannolikhet:</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: probColor }}>{p.probability}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-[var(--text3)]">Tidsram:</span>
                    <span className="text-[10px] font-mono text-[var(--text)]">~{p.estimatedWeeks}v</span>
                  </div>
                </div>
                {/* Probability bar */}
                <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden mb-1.5">
                  <div className="h-full rounded-full" style={{ width: `${p.probability}%`, background: probColor }} />
                </div>
                <div className="space-y-0.5">
                  {p.factors.map((f, j) => (
                    <p key={j} className="text-[9px] text-[var(--text3)]">&middot; {f}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Response Time Tracker ───

function ResponseTracker({ stats }: { stats: ResponseStats }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Svarstider
          </h3>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
            <span className="text-lg font-bold font-mono text-[var(--text)]">{stats.avgDetectionToAction}</span>
            <p className="text-[8px] text-[var(--text3)]">Medel dagar<br />Upptäckt → Åtgärd</p>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
            <span className="text-lg font-bold font-mono text-[var(--green)]">{stats.resolvedAlerts}/{stats.totalAlertsThisSeason}</span>
            <p className="text-[8px] text-[var(--text3)]">Lösta<br />denna säsong</p>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
            <span className="text-lg font-bold font-mono text-[var(--text)]">{stats.falsePositiveRate}%</span>
            <p className="text-[8px] text-[var(--text3)]">Falsk<br />positiv-andel</p>
          </div>
        </div>

        {/* Recent responses */}
        <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider mb-1.5">Senaste svarstider</p>
        <div className="space-y-1">
          {stats.recentResponses.map((r) => (
            <div key={r.alertId} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <div>
                <span className="text-[10px] font-medium text-[var(--text)]">{r.parcelName}</span>
                <span className="text-[9px] text-[var(--text3)] ml-2">{r.detectedAt}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={10} className="text-[var(--text3)]" />
                <span className={`text-[10px] font-mono font-bold ${r.daysTaken <= 3 ? 'text-[var(--green)]' : r.daysTaken <= 5 ? 'text-[var(--yellow)]' : 'text-[var(--red)]'}`}>
                  {r.daysTaken}d
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── NDVI Changes ───

function NDVIChangesPanel({ changes }: { changes: NDVIChangeResult[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Satellite size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            NDVI-förändringsdetektion
          </h3>
        </div>
        <div className="space-y-2">
          {changes.map((c) => {
            const changeColor = c.changePct <= -30 ? '#ef4444' : c.changePct <= -15 ? '#f97316' : c.changePct <= -5 ? '#fbbf24' : '#4ade80';
            return (
              <div key={`${c.parcelId}-${c.standNumber}`} className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-medium text-[var(--text)]">{c.parcelName}</span>
                    <span className="text-[9px] text-[var(--text3)] ml-1">{c.standNumber}</span>
                  </div>
                  <span className="text-xs font-mono font-bold" style={{ color: changeColor }}>
                    {c.changePct > 0 ? '+' : ''}{c.changePct.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[9px] text-[var(--text3)]">
                    NDVI: {c.previousNdvi.toFixed(2)} → {c.currentNdvi.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-[var(--text3)]">{formatDate(c.changeDate)}</span>
                </div>
                {c.isSignificant && (
                  <div className="flex flex-wrap gap-1">
                    {c.possibleCauses.map((cause, i) => (
                      <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--text2)]">
                        {cause}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Action Checklists ───

function ActionChecklistPanel({ checklists }: { checklists: ActionChecklist[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Åtgärdschecklista
          </h3>
        </div>
        <div className="space-y-3">
          {checklists.map((cl, i) => {
            const color = severityColor(cl.riskLevel);
            const completed = cl.items.filter((it) => it.completed).length;
            return (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] font-semibold" style={{ color }}>
                    {severityLabel(cl.riskLevel)}
                  </span>
                  <span className="text-[9px] text-[var(--text3)]">
                    {completed}/{cl.items.length} klart
                  </span>
                </div>
                <div className="space-y-1">
                  {cl.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--bg)]">
                      {item.completed ? (
                        <CheckCircle2 size={12} className="text-[var(--green)] flex-shrink-0" />
                      ) : (
                        <Circle size={12} className="text-[var(--text3)] flex-shrink-0" />
                      )}
                      <span className={`text-[10px] ${item.completed ? 'text-[var(--text3)] line-through' : 'text-[var(--text2)]'}`}>
                        {item.label}
                      </span>
                      <span className={`text-[8px] ml-auto flex-shrink-0 px-1 py-0.5 rounded ${
                        item.priority === 'high' ? 'bg-[var(--red)]/10 text-[var(--red)]' :
                        item.priority === 'medium' ? 'bg-[var(--yellow)]/10 text-[var(--yellow)]' :
                        'bg-[var(--bg3)] text-[var(--text3)]'
                      }`}>
                        {item.priority === 'high' ? 'Hög' : item.priority === 'medium' ? 'Medel' : 'Låg'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Fusion Analysis Card ───

function stressScoreColor(score: number): string {
  if (score < 0.3) return '#4ade80';
  if (score <= 0.6) return '#fbbf24';
  return '#ef4444';
}

function stressScoreLabel(score: number): string {
  if (score < 0.3) return 'Låg';
  if (score <= 0.6) return 'Måttlig';
  return 'Hög';
}

function sensorBadgeLabel(sensor: string): string {
  switch (sensor) {
    case 'multispectral': return 'Multispektral';
    case 'thermal': return 'Termisk';
    case 'rgb': return 'RGB';
    case 'lidar': return 'LiDAR';
    default: return sensor;
  }
}

function FusionAnalysisCard({
  beetleStress,
  crownHealth,
  moistureStress,
}: {
  beetleStress: FusionProduct | undefined;
  crownHealth: FusionProduct | undefined;
  moistureStress: FusionProduct | undefined;
}) {
  if (!beetleStress) return null;

  const meta = beetleStress.metadata as Record<string, unknown>;
  const affectedPct = (meta.affected_area_pct as number) ?? 0;
  const confidenceMean = (meta.confidence_mean as number) ?? 0;
  const modelVersion = (meta.model_version as string) ?? '-';
  // Derive a beetle stress index from affected area and confidence
  const stressIndex = Math.min(1, (affectedPct / 100) * 2.5 + confidenceMean * 0.3);
  const stressColor = stressScoreColor(stressIndex);

  // Crown health data
  const crownMeta = crownHealth?.metadata as Record<string, unknown> | undefined;
  const totalCrowns = (crownMeta?.total_crowns as number) ?? 0;
  const healthyPct = (crownMeta?.healthy_pct as number) ?? 0;
  const stressedPct = (crownMeta?.stressed_pct as number) ?? 0;
  const deadPct = (crownMeta?.dead_pct as number) ?? 0;
  const moderatePct = Math.max(0, 100 - healthyPct - stressedPct - deadPct);

  // Moisture stress data
  const moistureMeta = moistureStress?.metadata as Record<string, unknown> | undefined;
  const cwsiMean = (moistureMeta?.cwsi_mean as number) ?? 0;
  const droughtRiskPct = (moistureMeta?.drought_risk_area_pct as number) ?? 0;

  return (
    <div
      className="rounded-xl border-2 overflow-hidden"
      style={{ borderColor: `${stressColor}60`, background: 'var(--bg2)' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${stressColor}15` }}
          >
            <Cpu size={16} style={{ color: stressColor }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">AI Fusionsanalys</h3>
            <p className="text-[9px] text-[var(--text3)]">
              Modell v{modelVersion} &middot; Multisensor barkborreanalys
            </p>
          </div>
        </div>

        {/* Beetle Stress Index - prominent score */}
        <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
              Beetle Stress Index
            </span>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ color: stressColor, background: `${stressColor}15` }}
            >
              {stressScoreLabel(stressIndex)}
            </span>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold font-mono" style={{ color: stressColor }}>
              {stressIndex.toFixed(2)}
            </span>
            <div className="flex-1 mb-1.5">
              <div className="h-2.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${stressIndex * 100}%`,
                    background: `linear-gradient(90deg, #4ade80, #fbbf24 50%, #ef4444)`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[7px] text-[var(--text3)]">0.0</span>
                <span className="text-[7px] text-[var(--text3)]">0.3</span>
                <span className="text-[7px] text-[var(--text3)]">0.6</span>
                <span className="text-[7px] text-[var(--text3)]">1.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Drabbat område</span>
            <p className="text-lg font-bold font-mono text-[var(--text)] mt-0.5">
              {affectedPct}%
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Konfidens</span>
            <p className="text-lg font-bold font-mono text-[var(--text)] mt-0.5">
              {(confidenceMean * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Sensors used badges */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[9px] text-[var(--text3)]">Sensorer:</span>
          {beetleStress.sensors_used.map((sensor) => (
            <span
              key={sensor}
              className="text-[8px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg3)] text-[var(--text2)] flex items-center gap-1"
            >
              {sensor === 'thermal' && <Flame size={8} />}
              {sensor === 'multispectral' && <Satellite size={8} />}
              {sensor === 'rgb' && <Circle size={8} />}
              {sensor === 'lidar' && <Radio size={8} />}
              {sensorBadgeLabel(sensor)}
            </span>
          ))}
        </div>

        {/* Crown health distribution bar */}
        {crownHealth && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <TreePine size={12} className="text-[var(--text2)]" />
                <span className="text-[10px] font-semibold text-[var(--text2)]">Kronhälsa</span>
              </div>
              <span className="text-[9px] text-[var(--text3)]">{totalCrowns} kronor analyserade</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex">
              <div
                className="h-full"
                style={{ width: `${healthyPct}%`, background: '#4ade80' }}
                title={`Frisk: ${healthyPct}%`}
              />
              <div
                className="h-full"
                style={{ width: `${moderatePct}%`, background: '#fbbf24' }}
                title={`Måttlig: ${moderatePct}%`}
              />
              <div
                className="h-full"
                style={{ width: `${stressedPct}%`, background: '#f97316' }}
                title={`Stressad: ${stressedPct}%`}
              />
              <div
                className="h-full"
                style={{ width: `${deadPct}%`, background: '#ef4444' }}
                title={`Kritisk/Död: ${deadPct}%`}
              />
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
                <span className="text-[8px] text-[var(--text3)]">Frisk {healthyPct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
                <span className="text-[8px] text-[var(--text3)]">Måttlig {moderatePct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#f97316' }} />
                <span className="text-[8px] text-[var(--text3)]">Stressad {stressedPct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
                <span className="text-[8px] text-[var(--text3)]">Kritisk {deadPct}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Supporting metrics: crown_health + moisture_stress */}
        <div className="grid grid-cols-2 gap-2">
          {crownHealth && (
            <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <div className="flex items-center gap-1 mb-1">
                <TreePine size={10} className="text-[var(--green)]" />
                <span className="text-[9px] font-semibold text-[var(--text3)] uppercase">Kronhälsopoäng</span>
              </div>
              <span className="text-sm font-bold font-mono text-[var(--green)]">
                {healthyPct}%
              </span>
              <span className="text-[9px] text-[var(--text3)] ml-1">friska</span>
            </div>
          )}
          {moistureStress && (
            <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <div className="flex items-center gap-1 mb-1">
                <Droplets size={10} className="text-[var(--blue, #60a5fa)]" />
                <span className="text-[9px] font-semibold text-[var(--text3)] uppercase">Fuktstress</span>
              </div>
              <span className="text-sm font-bold font-mono" style={{ color: cwsiMean > 0.5 ? '#ef4444' : cwsiMean > 0.3 ? '#fbbf24' : '#4ade80' }}>
                CWSI {cwsiMean.toFixed(2)}
              </span>
              <p className="text-[8px] text-[var(--text3)]">Torkrisk: {droughtRiskPct}% av yta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ───

export default function EarlyDetectionPage() {
  const {
    alerts,
    communitySightings,
    trapData,
    riskPropagations,
    responseStats,
    ndviChanges,
    actionChecklists,
    loading,
    activeAlertCount,
    criticalCount,
  } = useEarlyDetection();

  // Use parcelId from the most critical active alert for fusion product lookup
  const selectedParcel = useMemo(() => {
    const active = alerts.find((a) => a.status !== 'resolved' && a.status !== 'false_positive');
    return active?.parcelId ?? alerts[0]?.parcelId;
  }, [alerts]);

  const { fusionProducts, loading: fusionLoading } = useSensorProducts({ parcelId: selectedParcel });

  const beetleStress = useMemo(
    () => fusionProducts.find((fp) => fp.product_name === 'beetle_stress'),
    [fusionProducts],
  );
  const crownHealth = useMemo(
    () => fusionProducts.find((fp) => fp.product_name === 'crown_health'),
    [fusionProducts],
  );
  const moistureStress = useMemo(
    () => fusionProducts.find((fp) => fp.product_name === 'moisture_stress'),
    [fusionProducts],
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(alerts[0]?.id ?? null);
  const [view, setView] = useState<'alerts' | 'detection' | 'response'>('alerts');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-pulse flex flex-col items-center gap-3">
          <AlertTriangle size={32} className="text-[var(--yellow)]" />
          <span className="text-sm text-[var(--text3)]">Laddar detektionsdata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full relative">
      {/* Left sidebar */}
      <div
        className={`absolute top-0 left-0 bottom-0 z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 xl:w-[28rem] border-r border-[var(--border)] overflow-y-auto`}
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Link to="/owner/dashboard" className="p-1 rounded hover:bg-[var(--bg3)] transition-colors">
                <ArrowLeft size={16} className="text-[var(--text3)]" />
              </Link>
              <Bug size={18} className="text-[var(--yellow)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Tidig Detektion
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:flex hidden items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            >
              <PanelLeftClose size={16} className="text-[var(--text3)]" />
            </button>
          </div>
          <p className="text-xs text-[var(--text3)] mb-4 ml-8">
            Satellitdetektion, grannskapsobservationer och spridningsmodell
          </p>

          {/* Summary badges */}
          <div className="flex items-center gap-2 mb-4">
            {criticalCount > 0 && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--red)]/10 text-[var(--red)]">
                {criticalCount} kritisk{criticalCount > 1 ? 'a' : ''}
              </span>
            )}
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--yellow)]/10 text-[var(--yellow)]">
              {activeAlertCount} aktiv{activeAlertCount > 1 ? 'a' : ''} varning{activeAlertCount > 1 ? 'ar' : ''}
            </span>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--bg3)] text-[var(--text3)]">
              Svarstid: medel {responseStats.avgDetectionToAction}d
            </span>
          </div>

          {/* View tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-lg bg-[var(--bg)]">
            {([
              { key: 'alerts', label: 'Larm', icon: AlertTriangle },
              { key: 'detection', label: 'Detektion', icon: Satellite },
              { key: 'response', label: 'Svarstid', icon: Clock },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-medium transition-colors ${
                  view === key
                    ? 'bg-[var(--surface)] text-[var(--green)] shadow-sm'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Alerts view */}
          {view === 'alerts' && (
            <div className="space-y-3">
              {/* AI Fusion Analysis Card */}
              {!fusionLoading && beetleStress && (
                <FusionAnalysisCard
                  beetleStress={beetleStress}
                  crownHealth={crownHealth}
                  moistureStress={moistureStress}
                />
              )}

              {/* Active alerts */}
              <div className="space-y-2">
                {alerts.filter((a) => a.status !== 'resolved' && a.status !== 'false_positive').map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    expanded={expandedAlertId === alert.id}
                    onToggle={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
                  />
                ))}
              </div>

              {/* Community sightings */}
              <CommunitySightingsPanel sightings={communitySightings} />

              {/* Pheromone traps */}
              <TrapDataPanel traps={trapData} />

              {/* Risk propagation */}
              <RiskPropagationPanel propagations={riskPropagations} />

              {/* Action checklists */}
              <ActionChecklistPanel checklists={actionChecklists} />

              {/* Resolved alerts */}
              {alerts.filter((a) => a.status === 'resolved' || a.status === 'false_positive').length > 0 && (
                <div>
                  <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
                    Lösta / Avfärdade
                  </p>
                  <div className="space-y-2">
                    {alerts.filter((a) => a.status === 'resolved' || a.status === 'false_positive').map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        expanded={expandedAlertId === alert.id}
                        onToggle={() => setExpandedAlertId(expandedAlertId === alert.id ? null : alert.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detection view */}
          {view === 'detection' && (
            <div className="space-y-3">
              {/* AI Fusion Analysis Card */}
              {!fusionLoading && beetleStress && (
                <FusionAnalysisCard
                  beetleStress={beetleStress}
                  crownHealth={crownHealth}
                  moistureStress={moistureStress}
                />
              )}
              <NDVIChangesPanel changes={ndviChanges} />
              <TrapDataPanel traps={trapData} />
              <CommunitySightingsPanel sightings={communitySightings} />
            </div>
          )}

          {/* Response view */}
          {view === 'response' && (
            <div className="space-y-3">
              <ResponseTracker stats={responseStats} />
              <RiskPropagationPanel propagations={riskPropagations} />
              <ActionChecklistPanel checklists={actionChecklists} />
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            style={{ background: 'var(--surface)' }}
          >
            <PanelLeftOpen size={18} />
          </button>
        )}

        <div className={`transition-opacity ${sidebarOpen ? 'opacity-40' : 'opacity-100'} max-w-2xl mx-auto p-8`}>
          <div className="text-center mb-8">
            <AlertTriangle size={40} className="text-[var(--yellow)] mx-auto mb-3" />
            <h2 className="text-xl font-serif font-bold text-[var(--text)] mb-1">Tidig Detektion & Varning</h2>
            <p className="text-sm text-[var(--text3)]">
              Satellitbaserad förändringsdetektion, grannskapsrapportering och riskspridningsmodell
              med feromonfälledata i realtid.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border)] text-center" style={{ background: 'var(--bg2)' }}>
              <p className="text-3xl font-bold font-mono text-[var(--yellow)]">{activeAlertCount}</p>
              <p className="text-[10px] text-[var(--text3)] mt-1">Aktiva larm</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border)] text-center" style={{ background: 'var(--bg2)' }}>
              <p className="text-3xl font-bold font-mono text-[var(--text)]">{responseStats.avgDetectionToAction}d</p>
              <p className="text-[10px] text-[var(--text3)] mt-1">Medel svarstid</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border)] text-center" style={{ background: 'var(--bg2)' }}>
              <p className="text-3xl font-bold font-mono text-[var(--green)]">{100 - responseStats.falsePositiveRate}%</p>
              <p className="text-[10px] text-[var(--text3)] mt-1">Precision</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
