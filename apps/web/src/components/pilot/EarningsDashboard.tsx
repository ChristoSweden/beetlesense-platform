import { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  Clock,
  Loader2,
  BarChart3,
  Calculator,
  Building2,
  CalendarClock,
  Layers,
  MapPin,
  Timer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePilotEarnings, type SensorType } from '@/hooks/usePilotEarnings';

// ─── Helpers ───

const fmtSEK = (v: number) =>
  v.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 });

const SENSOR_COLORS: Record<SensorType, string> = {
  RGB: 'var(--green)',
  Multispectral: '#6366f1',
  Thermal: '#ef4444',
  LiDAR: '#f59e0b',
};

const SENSOR_LABELS: Record<SensorType, string> = {
  RGB: 'RGB',
  Multispectral: 'Multispektral',
  Thermal: 'Termisk',
  LiDAR: 'LiDAR',
};

// ─── Component ───

export function EarningsDashboard() {
  const data = usePilotEarnings();
  const [showAllPayouts, setShowAllPayouts] = useState(false);
  const [showPayoutSettings, setShowPayoutSettings] = useState(false);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  const maxMonthly = Math.max(...data.monthlyData.map((m) => m.total), 1);
  const visiblePayouts = showAllPayouts ? data.earnings : data.earnings.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={Wallet}
          label="Intj\u00e4nat totalt"
          value={fmtSEK(data.totalEarned)}
          color="var(--green)"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Denna m\u00e5nad"
          value={fmtSEK(data.thisMonth)}
          color="var(--green)"
          subtitle={data.lastMonth > 0 ? `F\u00f6rra: ${fmtSEK(data.lastMonth)}` : undefined}
        />
        <SummaryCard
          icon={Clock}
          label="V\u00e4ntande"
          value={fmtSEK(data.pendingPayout)}
          color="var(--amber)"
        />
        <SummaryCard
          icon={BarChart3}
          label="Snitt/uppdrag"
          value={fmtSEK(Math.round(data.avgPerJob))}
          color="var(--green)"
        />
      </div>

      {/* ─── Averages Row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MiniStat icon={MapPin} label="Snitt/hektar" value={`${Math.round(data.avgPerHectare)} kr`} />
        <MiniStat icon={Timer} label="Snitt/timme" value={`${Math.round(data.avgPerHour)} kr`} />
        <MiniStat icon={Layers} label="Antal uppdrag" value={`${data.earnings.length} st`} />
      </div>

      {/* ─── Monthly Bar Chart (SVG) ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">
          M\u00e5natliga int\u00e4kter — Senaste 6 m\u00e5nader
        </h3>

        <svg
          viewBox="0 0 600 180"
          className="w-full"
          style={{ maxHeight: '200px' }}
          role="img"
          aria-label="M\u00e5natliga int\u00e4kter stapeldiagram"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const y = 150 - frac * 130;
            return (
              <line
                key={frac}
                x1={60}
                y1={y}
                x2={580}
                y2={y}
                stroke="var(--border)"
                strokeWidth={0.5}
                strokeDasharray={frac > 0 && frac < 1 ? '4,4' : undefined}
              />
            );
          })}

          {/* Y-axis labels */}
          {[0, 0.5, 1].map((frac) => {
            const y = 150 - frac * 130;
            const val = Math.round(maxMonthly * frac);
            return (
              <text
                key={frac}
                x={55}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="var(--text3)"
                fontFamily="monospace"
              >
                {val > 0 ? `${(val / 1000).toFixed(1)}k` : '0'}
              </text>
            );
          })}

          {/* Bars */}
          {data.monthlyData.map((m, i) => {
            const barWidth = 60;
            const gap = (520 - barWidth * 6) / 5;
            const x = 65 + i * (barWidth + gap);
            const pct = maxMonthly > 0 ? m.total / maxMonthly : 0;
            const barHeight = Math.max(pct * 130, 2);
            const y = 150 - barHeight;

            return (
              <g key={m.month}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill="var(--green)"
                  opacity={0.7}
                  className="hover:opacity-100 transition-opacity"
                />
                {/* Value label above bar */}
                {m.total > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--text2)"
                    fontFamily="monospace"
                  >
                    {fmtSEK(m.total)}
                  </text>
                )}
                {/* Month label */}
                <text
                  x={x + barWidth / 2}
                  y={168}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text3)"
                  className="capitalize"
                >
                  {m.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ─── Sensor Breakdown ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">
          Int\u00e4kter per sensortyp
        </h3>

        <div className="space-y-3">
          {data.sensorBreakdown.map((s) => {
            const pct = data.totalEarned > 0 ? (s.total_sek / data.totalEarned) * 100 : 0;
            const color = SENSOR_COLORS[s.sensor];

            return (
              <div key={s.sensor}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="text-xs text-[var(--text)]">
                      {SENSOR_LABELS[s.sensor]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--text3)]">
                      {s.job_count} uppdrag
                    </span>
                    <span className="text-xs font-mono font-medium text-[var(--text)]">
                      {fmtSEK(s.total_sek)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg3)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 1)}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-[var(--text3)] mt-3 italic">
          Multispektral + termisk ger h\u00f6gre arvode per uppdrag \u00e4n enbart RGB.
        </p>
      </div>

      {/* ─── Tax Estimate ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={14} className="text-[var(--text3)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Skatteuppskattning (F-skatt {Math.round(data.taxEstimate.rate * 100)}%)
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-[var(--text3)] mb-1">Brutto</p>
            <p className="text-sm font-mono font-semibold text-[var(--text)]">
              {fmtSEK(data.taxEstimate.gross)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text3)] mb-1">
              Uppskattad skatt
            </p>
            <p className="text-sm font-mono font-semibold text-red-400">
              &minus;{fmtSEK(data.taxEstimate.tax)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text3)] mb-1">Netto</p>
            <p className="text-sm font-mono font-semibold text-[var(--green)]">
              {fmtSEK(data.taxEstimate.net)}
            </p>
          </div>
        </div>

        <p className="text-[10px] text-[var(--text3)] mt-3 italic">
          Uppskattning baserad p\u00e5 30% egenavgifter + prelimin\u00e4rskatt. Kontakta din revisor f\u00f6r exakt belopp.
        </p>
      </div>

      {/* ─── Payouts Table ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Utbetalningar
          </h3>
        </div>

        {data.earnings.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet size={20} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-xs text-[var(--text3)]">
              Inga utbetalningar \u00e4n. Slutf\u00f6r uppdrag f\u00f6r att b\u00f6rja tj\u00e4na.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
                    <th className="text-left px-4 py-2 font-medium">Datum</th>
                    <th className="text-left px-4 py-2 font-medium">Uppdrag</th>
                    <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Skifte</th>
                    <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Sensorer</th>
                    <th className="text-right px-4 py-2 font-medium">Arvode</th>
                    <th className="text-right px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {visiblePayouts.map((e) => (
                    <tr key={e.id} className="hover:bg-[var(--bg3)] transition-colors">
                      <td className="px-4 py-3 text-xs text-[var(--text3)] font-mono whitespace-nowrap">
                        {new Date(e.completed_at).toLocaleDateString('sv-SE')}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text)]">
                        {e.job_title}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text3)] hidden sm:table-cell">
                        {e.parcel_name}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex gap-1">
                          {e.sensors.map((s) => (
                            <span
                              key={s}
                              className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium"
                              style={{
                                background: `color-mix(in srgb, ${SENSOR_COLORS[s]} 15%, transparent)`,
                                color: SENSOR_COLORS[s],
                              }}
                            >
                              {SENSOR_LABELS[s]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text)] text-right font-mono font-medium">
                        {fmtSEK(e.fee_sek)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            e.status === 'paid'
                              ? 'bg-[var(--green)]/10 text-[var(--green)]'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {e.status === 'paid' ? 'Utbetald' : 'V\u00e4ntande'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.earnings.length > 5 && (
              <button
                onClick={() => setShowAllPayouts((v) => !v)}
                className="w-full px-4 py-2.5 text-xs text-[var(--text3)] hover:text-[var(--text2)] flex items-center justify-center gap-1 border-t border-[var(--border)] transition-colors"
              >
                {showAllPayouts ? (
                  <>Visa f\u00e4rre <ChevronUp size={12} /></>
                ) : (
                  <>Visa alla {data.earnings.length} utbetalningar <ChevronDown size={12} /></>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* ─── Payout Settings ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <button
          onClick={() => setShowPayoutSettings((v) => !v)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[var(--text3)]" />
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              Utbetalningsinst\u00e4llningar
            </h3>
          </div>
          {showPayoutSettings ? (
            <ChevronUp size={14} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text3)]" />
          )}
        </button>

        {showPayoutSettings && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank Account */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
                <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-2">
                  Bankkonto
                </p>
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-[var(--text3)]" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text)]">
                      {data.payoutSettings.bank_name}
                    </p>
                    <p className="text-[10px] text-[var(--text3)] font-mono">
                      Clearing: {data.payoutSettings.clearing} &middot; **** {data.payoutSettings.account_last4}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payout Schedule */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3">
                <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-2">
                  Utbetalningsschema
                </p>
                <div className="flex items-center gap-2">
                  <CalendarClock size={14} className="text-[var(--text3)]" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text)]">
                      {data.payoutSettings.schedule === 'monthly' ? 'M\u00e5natlig' : 'Varannan vecka'}
                    </p>
                    <p className="text-[10px] text-[var(--text3)] font-mono">
                      N\u00e4sta utbetalning: {new Date(data.payoutSettings.next_payout_date).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[var(--text3)] italic">
              Demodata visas. I produktionen kan du uppdatera bankkonto och utbetalningsschema.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary Card ───

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-xl font-semibold font-mono text-[var(--text)]">{value}</p>
      <p className="text-xs text-[var(--text3)]">{label}</p>
      {subtitle && (
        <p className="text-[10px] text-[var(--text3)] mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

// ─── Mini Stat ───

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3 flex items-center gap-3">
      <Icon size={14} className="text-[var(--text3)] shrink-0" />
      <div>
        <p className="text-sm font-mono font-medium text-[var(--text)]">{value}</p>
        <p className="text-[10px] text-[var(--text3)]">{label}</p>
      </div>
    </div>
  );
}
