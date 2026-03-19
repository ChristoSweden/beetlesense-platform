import { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  BarChart3,
  DollarSign,
  Plane,
  Cpu,
  MessageCircle,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DEMO DATA — realistic growth curves from launch March 2026
   ═══════════════════════════════════════════════════════════════ */

const MONTHS = ['Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const _MONTH_LABELS_FULL = [
  'Mars 2026', 'April', 'Maj', 'Juni', 'Juli', 'Augusti',
  'September', 'Oktober', 'November', 'December', 'Januari 2027', 'Februari', 'Mars',
];

// -- User Growth
const SIGNUPS_MONTHLY = [24, 38, 52, 71, 63, 89, 105, 92, 78, 114, 131, 146, 162];
const CUMULATIVE_USERS = SIGNUPS_MONTHLY.reduce<number[]>((acc, v) => {
  acc.push((acc.length ? acc[acc.length - 1] : 0) + v);
  return acc;
}, []);
const USERS_BY_ROLE = { owner: 687, pilot: 198, inspector: 120, admin: 10 };
const DAU = 312;
const MAU = 847;

// -- Platform Usage
const WEEKS = ['V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20', 'V21'];
const SURVEYS_CREATED = [42, 56, 68, 81, 73, 95, 112, 104, 89, 127, 143, 158];
const SURVEYS_COMPLETED = [38, 51, 62, 74, 67, 88, 103, 97, 82, 119, 134, 149];
const SURVEYS_FAILED = [2, 3, 4, 5, 4, 5, 6, 5, 4, 6, 7, 7];
const TOTAL_PARCELS = 1843;
const STORAGE_USED_GB = 247.3;
const API_CALLS_TOTAL = 1_284_567;

// -- Revenue
const MRR_MONTHLY = [0, 0, 4200, 8900, 12400, 18600, 24100, 29800, 34500, 41200, 48700, 54300, 61800];
const PLAN_DIST = { free: 412, pro: 367, enterprise: 56 };
const CHURN_RATE = 3.2;
const ARPU = 74;

// -- Drone Activity
const MISSIONS_MONTHLY = [12, 28, 45, 67, 58, 82, 97, 88, 72, 103, 118, 132, 148];
const TOTAL_FLIGHT_HOURS = 2_847;
const COVERAGE_AREA_HA = 42_560;
const MEDIA_PROCESSED_GB = 1_234;
const DRONE_MANUFACTURERS = [
  { name: 'DJI', missions: 642, pct: 58 },
  { name: 'Autel', missions: 331, pct: 30 },
  { name: 'Parrot', missions: 132, pct: 12 },
];

// -- Sensor Processing
const SENSOR_JOBS = [
  { type: 'Multispektral', count: 1023, avgTime: 142, successRate: 99.7, color: '#60a5fa' },
  { type: 'Termisk', count: 784, avgTime: 98, successRate: 99.5, color: '#f59e0b' },
  { type: 'RGB', count: 534, avgTime: 67, successRate: 99.6, color: '#34d399' },
];
const QUEUE_DEPTH = 18;

// -- AI Companion
const AI_QUESTIONS_MONTHLY = [120, 245, 410, 580, 520, 710, 890, 820, 680, 960, 1120, 1280, 1450];
const AVG_RESPONSE_TIME_MS = 1_240;
const AI_SATISFACTION = 4.6;
const TOP_TOPICS = [
  { topic: 'Barkborreidentifiering', count: 892 },
  { topic: 'Trädslags\u00ADrådgivning', count: 634 },
  { topic: 'Avverkningstidpunkt', count: 521 },
  { topic: 'Stormskadeprevention', count: 412 },
  { topic: 'Regelfrågor', count: 389 },
  { topic: 'Kolkrediter', count: 234 },
];

/* ═══════════════════════════════════════════════════
   CHART COMPONENTS — inline SVG, no dependencies
   ═══════════════════════════════════════════════════ */

/* ─── Bar Chart ─── */
function BarChart({
  data,
  labels,
  color = 'var(--green)',
  height = 180,
  labelEvery = 1,
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  labelEvery?: number;
}) {
  const max = Math.max(...data, 1);
  const w = 600;
  const padX = 36;
  const padY = 20;
  const padBottom = 24;
  const chartW = w - padX * 2;
  const chartH = height - padY - padBottom;
  const barW = chartW / data.length * 0.6;
  const gap = chartW / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {/* Y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padY + chartH - frac * chartH;
        const val = Math.round(frac * max);
        return (
          <g key={frac}>
            <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="var(--border)" strokeWidth={0.5} />
            <text x={padX - 6} y={y + 3} textAnchor="end" fill="var(--text3)" fontSize={9} fontFamily="monospace">
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((v, i) => {
        const barH = (v / max) * chartH;
        const x = padX + i * gap + (gap - barW) / 2;
        const y = padY + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.85} />
            {/* Label */}
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={height - 4} textAnchor="middle" fill="var(--text3)" fontSize={8} fontFamily="monospace">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Stacked Bar Chart ─── */
function StackedBarChart({
  datasets,
  labels,
  colors,
  height = 180,
}: {
  datasets: number[][];
  labels: string[];
  colors: string[];
  height?: number;
}) {
  const totals = labels.map((_, i) => datasets.reduce((sum, ds) => sum + ds[i], 0));
  const max = Math.max(...totals, 1);
  const w = 600;
  const padX = 36;
  const padY = 20;
  const padBottom = 24;
  const chartW = w - padX * 2;
  const chartH = height - padY - padBottom;
  const gap = chartW / labels.length;
  const barW = gap * 0.6;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padY + chartH - frac * chartH;
        return <line key={frac} x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="var(--border)" strokeWidth={0.5} />;
      })}
      {labels.map((lbl, i) => {
        const x = padX + i * gap + (gap - barW) / 2;
        let cumH = 0;
        return (
          <g key={i}>
            {datasets.map((ds, di) => {
              const segH = (ds[i] / max) * chartH;
              const y = padY + chartH - cumH - segH;
              cumH += segH;
              return <rect key={di} x={x} y={y} width={barW} height={segH} rx={di === datasets.length - 1 ? 3 : 0} fill={colors[di]} opacity={0.85} />;
            })}
            <text x={x + barW / 2} y={height - 4} textAnchor="middle" fill="var(--text3)" fontSize={8} fontFamily="monospace">
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Area Line Chart ─── */
function AreaChart({
  data,
  labels,
  color = 'var(--green)',
  height = 180,
  prefix = '',
  suffix = '',
  gradientId = 'areaGrad',
}: {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  prefix?: string;
  suffix?: string;
  gradientId?: string;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 600;
  const padX = 50;
  const padY = 20;
  const padBottom = 24;
  const chartW = w - padX * 2;
  const chartH = height - padY - padBottom;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + chartH - ((v - min) / range) * chartH;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${padX},${padY + chartH} ${polyline} ${padX + chartW},${padY + chartH}`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padY + chartH - frac * chartH;
        const val = Math.round(min + frac * range);
        return (
          <g key={frac}>
            <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="var(--border)" strokeWidth={0.5} />
            <text x={padX - 6} y={y + 3} textAnchor="end" fill="var(--text3)" fontSize={9} fontFamily="monospace">
              {prefix}{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}{suffix}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
        <text key={i} x={points[i].x} y={height - 4} textAnchor="middle" fill="var(--text3)" fontSize={8} fontFamily="monospace">
          {labels[i]}
        </text>
      ))}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3.5} fill={color} />
    </svg>
  );
}

/* ─── Donut Chart ─── */
function DonutChart({
  segments,
  size = 140,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const o = offset;
          offset += dash;
          return (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-o}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text)" fontSize={18} fontWeight="bold" fontFamily="monospace">
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text3)" fontSize={9}>
          totalt
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-[var(--text2)]">{seg.label}</span>
            <span className="text-xs font-mono text-[var(--text3)] ml-auto">{seg.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Horizontal Bar ─── */
function HorizontalBar({ label, value, max, color, suffix = '' }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text2)]">{label}</span>
        <span className="text-xs font-mono text-[var(--text3)]">{value.toLocaleString()}{suffix}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider leading-tight">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold text-[var(--text)] font-mono">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[10px] text-[var(--text3)] mt-1">{sub}</p>}
    </div>
  );
}

/* ─── Mini Metric ─── */
function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[var(--bg3)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">{label}</p>
      <p className="text-lg font-mono font-bold text-[var(--text)] mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );
}

/* ─── Section Wrapper ─── */
function Section({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-[var(--bg3)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
        </div>
        <ChevronDown size={16} className={`text-[var(--text3)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 space-y-5">{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */

export default function AnalyticsPage() {
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  // Memoize current month string
  const currentPeriod = useMemo(() => {
    const d = new Date();
    const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--text)]">Plattformsanalys</h1>
          <p className="text-sm text-[var(--text3)] mt-1">Komplett oversikt &mdash; demodata fr.o.m. lansering mars 2026</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          <RefreshCw size={14} />
          Uppdatera
        </button>
      </div>

      {/* ────────────────────────────────────────────
          1. ANVÄNDARTILLVÄXT
          ──────────────────────────────────────────── */}
      <Section title="Användartillväxt" icon={<Users size={16} className="text-blue-400" />}>
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Totalt användare" value={CUMULATIVE_USERS[CUMULATIVE_USERS.length - 1]} icon={<Users size={16} className="text-blue-400" />} color="bg-blue-500/10" />
          <StatCard label="Nya i mars" value={SIGNUPS_MONTHLY[SIGNUPS_MONTHLY.length - 1]} sub="+11% vs förra månaden" icon={<TrendingUp size={16} className="text-emerald-400" />} color="bg-emerald-500/10" />
          <StatCard label="DAU" value={DAU} sub="Dagligen aktiva" icon={<Users size={16} className="text-amber-400" />} color="bg-amber-500/10" />
          <StatCard label="MAU" value={MAU} sub={`DAU/MAU = ${(DAU / MAU * 100).toFixed(0)}%`} icon={<Users size={16} className="text-purple-400" />} color="bg-purple-500/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Monthly signups bar chart */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Nya registreringar per månad</p>
            <BarChart data={SIGNUPS_MONTHLY} labels={MONTHS} color="#60a5fa" />
          </div>
          {/* Role donut */}
          <div>
            <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Användare per roll</p>
            <DonutChart
              segments={[
                { label: 'Skogsägare', value: USERS_BY_ROLE.owner, color: '#34d399' },
                { label: 'Drönarpilot', value: USERS_BY_ROLE.pilot, color: '#60a5fa' },
                { label: 'Inspektör', value: USERS_BY_ROLE.inspector, color: '#f59e0b' },
                { label: 'Admin', value: USERS_BY_ROLE.admin, color: '#a78bfa' },
              ]}
            />
          </div>
        </div>
      </Section>

      {/* ────────────────────────────────────────────
          2. PLATTFORMSANVÄNDNING
          ──────────────────────────────────────────── */}
      <Section title="Plattformsanvändning" icon={<BarChart3 size={16} className="text-emerald-400" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniMetric label="Totalt skiften" value={TOTAL_PARCELS} />
          <MiniMetric label="Lagring" value={`${STORAGE_USED_GB} GB`} />
          <MiniMetric label="API-anrop (totalt)" value={API_CALLS_TOTAL} />
          <MiniMetric label="Period" value={currentPeriod} />
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Inventeringar per vecka (skapade / slutförda / misslyckade)</p>
          <StackedBarChart
            datasets={[SURVEYS_COMPLETED, SURVEYS_FAILED, SURVEYS_CREATED.map((v, i) => Math.max(0, v - SURVEYS_COMPLETED[i] - SURVEYS_FAILED[i]))] }
            labels={WEEKS}
            colors={['#34d399', '#ef4444', '#60a5fa']}
          />
          <div className="flex items-center gap-6 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#34d399]" /><span className="text-[10px] text-[var(--text3)]">Slutförda</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" /><span className="text-[10px] text-[var(--text3)]">Misslyckade</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-[#60a5fa]" /><span className="text-[10px] text-[var(--text3)]">Pågående</span></div>
          </div>
        </div>
      </Section>

      {/* ────────────────────────────────────────────
          3. INTÄKTER
          ──────────────────────────────────────────── */}
      <Section title="Intäkter" icon={<DollarSign size={16} className="text-amber-400" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="MRR" value={`${(MRR_MONTHLY[MRR_MONTHLY.length - 1] / 1000).toFixed(1)}k kr`} sub="+13.8% MoM" icon={<DollarSign size={16} className="text-amber-400" />} color="bg-amber-500/10" />
          <StatCard label="ARR (beräknad)" value={`${(MRR_MONTHLY[MRR_MONTHLY.length - 1] * 12 / 1000).toFixed(0)}k kr`} icon={<TrendingUp size={16} className="text-emerald-400" />} color="bg-emerald-500/10" />
          <StatCard label="Churn" value={`${CHURN_RATE}%`} sub="Månatlig" icon={<TrendingUp size={16} className="text-red-400" />} color="bg-red-500/10" />
          <StatCard label="ARPU" value={`${ARPU} kr`} sub="Per aktiv användare" icon={<Users size={16} className="text-blue-400" />} color="bg-blue-500/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">MRR-utveckling (SEK)</p>
            <AreaChart
              data={MRR_MONTHLY}
              labels={MONTHS}
              color="#f59e0b"
              gradientId="mrrGrad"
              suffix=" kr"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Planfördelning</p>
            <DonutChart
              segments={[
                { label: 'Gratis', value: PLAN_DIST.free, color: '#94a3b8' },
                { label: 'Pro', value: PLAN_DIST.pro, color: '#60a5fa' },
                { label: 'Enterprise', value: PLAN_DIST.enterprise, color: '#f59e0b' },
              ]}
            />
            <div className="mt-4 rounded-lg bg-[var(--bg3)] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Konverteringsgrad</p>
              <p className="text-lg font-mono font-bold text-[var(--text)] mt-1">
                {((PLAN_DIST.pro + PLAN_DIST.enterprise) / (PLAN_DIST.free + PLAN_DIST.pro + PLAN_DIST.enterprise) * 100).toFixed(1)}%
              </p>
              <p className="text-[10px] text-[var(--text3)]">Gratis &rarr; Betald</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ────────────────────────────────────────────
          4. DRÖNARAKTIVITET
          ──────────────────────────────────────────── */}
      <Section title="Drönaraktivitet" icon={<Plane size={16} className="text-cyan-400" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniMetric label="Uppdrag totalt" value={MISSIONS_MONTHLY.reduce((a, b) => a + b, 0)} />
          <MiniMetric label="Flygtimmar" value={`${TOTAL_FLIGHT_HOURS.toLocaleString()} h`} />
          <MiniMetric label="Täckt areal" value={`${(COVERAGE_AREA_HA / 1000).toFixed(1)}k ha`} />
          <MiniMetric label="Media bearbetad" value={`${MEDIA_PROCESSED_GB.toLocaleString()} GB`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Uppdrag per månad</p>
            <BarChart data={MISSIONS_MONTHLY} labels={MONTHS} color="#22d3ee" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Per tillverkare</p>
            <div className="space-y-3">
              {DRONE_MANUFACTURERS.map((m) => (
                <div key={m.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text)]">{m.name}</span>
                    <span className="text-xs font-mono text-[var(--text3)]">{m.missions} uppdrag ({m.pct}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${m.pct}%`, backgroundColor: m.name === 'DJI' ? '#22d3ee' : m.name === 'Autel' ? '#f59e0b' : '#a78bfa' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ────────────────────────────────────────────
          5. SENSORBEARBETNING
          ──────────────────────────────────────────── */}
      <Section title="Sensorbearbetning" icon={<Cpu size={16} className="text-violet-400" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniMetric label="Totalt jobb" value={SENSOR_JOBS.reduce((s, j) => s + j.count, 0)} />
          <MiniMetric label="Ködjup" value={QUEUE_DEPTH} />
          <MiniMetric label="Snitt framgångsgrad" value={`${(SENSOR_JOBS.reduce((s, j) => s + j.successRate, 0) / SENSOR_JOBS.length).toFixed(1)}%`} />
          <MiniMetric label="Totalt bearbetningstid" value={`${Math.round(SENSOR_JOBS.reduce((s, j) => s + j.count * j.avgTime, 0) / 3600)} h`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {SENSOR_JOBS.map((job) => (
            <div key={job.type} className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text)]">{job.type}</h3>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: job.color }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-lg font-mono font-bold text-[var(--text)]">{job.count.toLocaleString()}</p>
                  <p className="text-[10px] text-[var(--text3)]">Jobb</p>
                </div>
                <div>
                  <p className="text-lg font-mono font-bold text-[var(--text)]">{job.avgTime}s</p>
                  <p className="text-[10px] text-[var(--text3)]">Snitt tid</p>
                </div>
              </div>
              {/* Success bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[var(--text3)]">Framgångsgrad</span>
                  <span className="text-[10px] font-mono text-[var(--text3)]">{job.successRate}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${job.successRate}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ────────────────────────────────────────────
          6. AI-KOMPANJON
          ──────────────────────────────────────────── */}
      <Section title="AI-kompanjon" icon={<MessageCircle size={16} className="text-indigo-400" />}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Totalt frågor" value={AI_QUESTIONS_MONTHLY.reduce((a, b) => a + b, 0)} icon={<MessageCircle size={16} className="text-indigo-400" />} color="bg-indigo-500/10" />
          <StatCard label="Snitt svarstid" value={`${(AVG_RESPONSE_TIME_MS / 1000).toFixed(1)}s`} icon={<Cpu size={16} className="text-blue-400" />} color="bg-blue-500/10" />
          <StatCard label="Nöjdhet" value={`${AI_SATISFACTION}/5.0`} sub="Baserat på tumme upp/ned" icon={<TrendingUp size={16} className="text-emerald-400" />} color="bg-emerald-500/10" />
          <StatCard label="Frågor denna månad" value={AI_QUESTIONS_MONTHLY[AI_QUESTIONS_MONTHLY.length - 1]} sub="+13% MoM" icon={<TrendingUp size={16} className="text-amber-400" />} color="bg-amber-500/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Frågor per månad</p>
            <AreaChart
              data={AI_QUESTIONS_MONTHLY}
              labels={MONTHS}
              color="#818cf8"
              gradientId="aiGrad"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Populära ämnen</p>
            <div className="space-y-2">
              {TOP_TOPICS.map((t) => (
                <HorizontalBar
                  key={t.topic}
                  label={t.topic}
                  value={t.count}
                  max={TOP_TOPICS[0].count}
                  color="#818cf8"
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <p className="text-center text-[10px] text-[var(--text3)] pb-4">
        Demodata &mdash; alla siffror ar simulerade for demonstrationssyfte
      </p>
    </div>
  );
}
