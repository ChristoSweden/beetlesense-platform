import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  BarChart3,
  PieChart,
  MapPin,
  TreePine,
  Clock,
  Shield,
  TrendingUp,
  Calendar,
} from 'lucide-react';

/* ── Demo data ─────────────────────────────────────────── */

const MONTHLY_INSPECTIONS = [
  { month: 'Okt', count: 12 },
  { month: 'Nov', count: 8 },
  { month: 'Dec', count: 5 },
  { month: 'Jan', count: 7 },
  { month: 'Feb', count: 14 },
  { month: 'Mar', count: 18 },
];

const DAMAGE_DISTRIBUTION = [
  { type: 'Barkborreangrepp', count: 34, pct: 38, color: '#ef4444' },
  { type: 'Stormskada', count: 18, pct: 20, color: '#f97316' },
  { type: 'Svampangrepp', count: 12, pct: 13, color: '#a855f7' },
  { type: 'Torka', count: 11, pct: 12, color: '#f59e0b' },
  { type: 'Viltskada', count: 9, pct: 10, color: '#3b82f6' },
  { type: 'Övrigt', count: 6, pct: 7, color: '#6b7280' },
];

const COUNTY_RISK = [
  { county: 'Jönköpings län', inspections: 28, avgSeverity: 3.2, risk: 'high' as const },
  { county: 'Kronobergs län', inspections: 22, avgSeverity: 2.8, risk: 'medium' as const },
  { county: 'Kalmar län', inspections: 15, avgSeverity: 3.5, risk: 'high' as const },
  { county: 'Östergötlands län', inspections: 12, avgSeverity: 2.1, risk: 'medium' as const },
  { county: 'Hallands län', inspections: 8, avgSeverity: 1.6, risk: 'low' as const },
  { county: 'Västra Götalands län', inspections: 5, avgSeverity: 1.4, risk: 'low' as const },
];

const SPECIES_SCORES = [
  { species: 'Gran (Norway Spruce)', avgScore: 42, trend: -8, samples: 52 },
  { species: 'Tall (Scots Pine)', avgScore: 71, trend: 2, samples: 38 },
  { species: 'Löv (Broadleaf)', avgScore: 83, trend: 5, samples: 24 },
];

const TIME_STATS = {
  avgDuration: 47,
  medianDuration: 42,
  fastest: 22,
  slowest: 95,
  thisMonth: 44,
  lastMonth: 51,
};

const COMPLIANCE_METRICS = {
  reportsOnTime: 92,
  photoDocumentation: 98,
  gpsAccuracy: 96,
  regulatoryChecks: 100,
  signOffComplete: 95,
};

/* ── Helpers ──────────────────────────────────────────────── */

const RISK_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Hög' },
  medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Medel' },
  low: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Låg' },
};

/* ── Component ───────────────────────────────────────────── */

export default function InspectorAnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<'6m' | '12m' | 'all'>('6m');

  const maxCount = Math.max(...MONTHLY_INSPECTIONS.map((m) => m.count));

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/inspector/dashboard" className="hover:text-[var(--text2)]">
          Inspektörspanel
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Analys</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            Inspektionsanalys
          </h1>
          <p className="text-xs text-[var(--text3)]">
            Statistik och trender för dina inspektioner
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5">
          {(['6m', '12m', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setTimePeriod(p)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                timePeriod === p
                  ? 'bg-[var(--green)]/15 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {p === '6m' ? '6 mån' : p === '12m' ? '12 mån' : 'Allt'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Bar Chart: Inspection Volume ─── */}
      <AnalyticsSection icon={BarChart3} title="Inspektionsvolym över tid">
        <div className="flex items-end gap-3 h-48 px-2">
          {MONTHLY_INSPECTIONS.map((m) => {
            const heightPct = (m.count / maxCount) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-[var(--text)] font-semibold">
                  {m.count}
                </span>
                <div className="w-full relative" style={{ height: `${heightPct}%`, minHeight: 8 }}>
                  <div
                    className="absolute inset-0 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400"
                    style={{ opacity: 0.7 + (m.count / maxCount) * 0.3 }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text3)]">{m.month}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-[11px] text-[var(--text3)]">
          <span className="flex items-center gap-1">
            <TrendingUp size={12} className="text-[var(--green)]" />
            +28% jämfört med föregående period
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} />
            Totalt: {MONTHLY_INSPECTIONS.reduce((s, m) => s + m.count, 0)} inspektioner
          </span>
        </div>
      </AnalyticsSection>

      {/* Two-column: Pie Chart + County Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* ─── Pie Chart: Damage Distribution (CSS only) ─── */}
        <AnalyticsSection icon={PieChart} title="Skadetypsfördelning">
          <div className="flex items-center gap-6">
            {/* CSS conic gradient pie */}
            <div className="shrink-0">
              <div
                className="w-36 h-36 rounded-full"
                style={{
                  background: `conic-gradient(${DAMAGE_DISTRIBUTION.map((d, i) => {
                    const start = DAMAGE_DISTRIBUTION.slice(0, i).reduce((s, x) => s + x.pct, 0);
                    return `${d.color} ${start}% ${start + d.pct}%`;
                  }).join(', ')})`,
                }}
              />
            </div>
            {/* Legend */}
            <div className="space-y-2 flex-1">
              {DAMAGE_DISTRIBUTION.map((d) => (
                <div key={d.type} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-[11px] text-[var(--text)] truncate">{d.type}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-[var(--text2)]">{d.count}</span>
                    <span className="text-[9px] text-[var(--text3)]">({d.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnalyticsSection>

        {/* ─── Regional Risk Map ─── */}
        <AnalyticsSection icon={MapPin} title="Regional risknivå">
          <div className="space-y-2">
            {COUNTY_RISK.map((county) => {
              const risk = RISK_STYLES[county.risk];
              return (
                <div
                  key={county.county}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--text)] truncate">
                      {county.county}
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">
                      {county.inspections} inspektioner
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-[var(--text2)]">
                      Snitt: {county.avgSeverity.toFixed(1)}/5
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${risk.bg} ${risk.text}`}>
                      {risk.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </AnalyticsSection>
      </div>

      {/* ─── Species Scores ─── */}
      <div className="mt-6">
        <AnalyticsSection icon={TreePine} title="Genomsnittlig hälsovärde per art">
          <div className="space-y-4">
            {SPECIES_SCORES.map((sp) => {
              const color =
                sp.avgScore >= 70 ? '#10b981' : sp.avgScore >= 40 ? '#f59e0b' : '#ef4444';
              return (
                <div key={sp.species}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[var(--text)]">{sp.species}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono ${sp.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {sp.trend > 0 ? '+' : ''}{sp.trend}%
                      </span>
                      <span className="text-sm font-bold font-mono" style={{ color }}>
                        {sp.avgScore}/100
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${sp.avgScore}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="text-[9px] text-[var(--text3)] mt-0.5">
                    Baserat på {sp.samples} bedömningar
                  </p>
                </div>
              );
            })}
          </div>
        </AnalyticsSection>
      </div>

      {/* Two-column: Time Tracking + Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* ─── Time Tracking ─── */}
        <AnalyticsSection icon={Clock} title="Tidsuppföljning">
          <div className="grid grid-cols-2 gap-3">
            <TimeCard label="Snittid" value={`${TIME_STATS.avgDuration} min`} />
            <TimeCard label="Mediantid" value={`${TIME_STATS.medianDuration} min`} />
            <TimeCard label="Snabbast" value={`${TIME_STATS.fastest} min`} />
            <TimeCard label="Längst" value={`${TIME_STATS.slowest} min`} />
          </div>
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[var(--text3)]">Denna månad vs förra</span>
              <span className="text-[10px] font-mono text-emerald-400">
                -{TIME_STATS.lastMonth - TIME_STATS.thisMonth} min ({Math.round(((TIME_STATS.lastMonth - TIME_STATS.thisMonth) / TIME_STATS.lastMonth) * 100)}% snabbare)
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="w-full h-2 rounded-full bg-[var(--bg3)]">
                  <div
                    className="h-full rounded-full bg-[var(--green)]"
                    style={{ width: `${(TIME_STATS.thisMonth / TIME_STATS.slowest) * 100}%` }}
                  />
                </div>
                <p className="text-[9px] text-[var(--text3)] mt-0.5">Mars ({TIME_STATS.thisMonth} min)</p>
              </div>
              <div className="flex-1">
                <div className="w-full h-2 rounded-full bg-[var(--bg3)]">
                  <div
                    className="h-full rounded-full bg-zinc-500"
                    style={{ width: `${(TIME_STATS.lastMonth / TIME_STATS.slowest) * 100}%` }}
                  />
                </div>
                <p className="text-[9px] text-[var(--text3)] mt-0.5">Feb ({TIME_STATS.lastMonth} min)</p>
              </div>
            </div>
          </div>
        </AnalyticsSection>

        {/* ─── Compliance Metrics ─── */}
        <AnalyticsSection icon={Shield} title="Kvalitets- och efterlevnadsmått">
          <div className="space-y-3">
            {[
              { label: 'Rapporter i tid', value: COMPLIANCE_METRICS.reportsOnTime },
              { label: 'Fotodokumentation', value: COMPLIANCE_METRICS.photoDocumentation },
              { label: 'GPS-noggrannhet', value: COMPLIANCE_METRICS.gpsAccuracy },
              { label: 'Regelverkskontroller', value: COMPLIANCE_METRICS.regulatoryChecks },
              { label: 'Signering komplett', value: COMPLIANCE_METRICS.signOffComplete },
            ].map((metric) => {
              const color = metric.value >= 95 ? '#10b981' : metric.value >= 80 ? '#f59e0b' : '#ef4444';
              return (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[var(--text)]">{metric.label}</span>
                    <span className="text-xs font-mono font-bold" style={{ color }}>
                      {metric.value}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg3)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${metric.value}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </AnalyticsSection>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function AnalyticsSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BarChart3;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
      <h2 className="text-sm font-serif font-bold text-[var(--text)] flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[var(--green)]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function TimeCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-center">
      <p className="text-lg font-semibold font-mono text-[var(--text)]">{value}</p>
      <p className="text-[10px] text-[var(--text3)]">{label}</p>
    </div>
  );
}
