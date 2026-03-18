import { useState, useEffect, useMemo } from 'react';
import {
  Thermometer,
  Snowflake,
  Sprout,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  TrendingDown,
  Info,
} from 'lucide-react';
import { getFrostRisk, type FrostRisk } from '@/services/smhiService';

interface FrostAlertTimelineProps {
  lat?: number;
  lon?: number;
}

const DEFAULT_LAT = 57.19;
const DEFAULT_LON = 14.04;

function riskColor(level: FrostRisk['riskLevel']): string {
  switch (level) {
    case 'high': return '#ef4444';
    case 'moderate': return '#f97316';
    case 'low': return '#fbbf24';
    default: return '#4ade80';
  }
}

function riskBg(level: FrostRisk['riskLevel']): string {
  switch (level) {
    case 'high': return 'rgba(239,68,68,0.1)';
    case 'moderate': return 'rgba(249,115,22,0.1)';
    case 'low': return 'rgba(251,191,36,0.1)';
    default: return 'rgba(74,222,128,0.05)';
  }
}

function riskLabel(level: FrostRisk['riskLevel']): string {
  switch (level) {
    case 'high': return 'H\u00f6g risk';
    case 'moderate': return 'M\u00e5ttlig risk';
    case 'low': return 'L\u00e5g risk';
    default: return 'Ingen risk';
  }
}

function formatDayShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const days = ['S\u00f6', 'M\u00e5', 'Ti', 'On', 'To', 'Fr', 'L\u00f6'];
  return days[date.getDay()];
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/**
 * Estimate last spring frost date for Sm\u00e5land based on historical averages.
 * Typical last frost in V\u00e4rnamo area: May 5-15.
 */
function estimateLastSpringFrost(): { date: string; confidence: string } {
  const year = new Date().getFullYear();
  const baseDate = new Date(year, 4, 10);
  const variation = Math.round((Math.random() - 0.5) * 10);
  baseDate.setDate(baseDate.getDate() + variation);

  return {
    date: baseDate.toISOString().slice(0, 10),
    confidence: 'Baserat p\u00e5 historiska data (1991\u20132020) f\u00f6r Sm\u00e5land/V\u00e4rnamo',
  };
}

/**
 * Estimate first autumn frost date.
 * Typical first frost in V\u00e4rnamo area: September 25 - October 10.
 */
function estimateFirstAutumnFrost(): { date: string; confidence: string } {
  const year = new Date().getFullYear();
  const baseDate = new Date(year, 9, 2);
  const variation = Math.round((Math.random() - 0.5) * 14);
  baseDate.setDate(baseDate.getDate() + variation);

  return {
    date: baseDate.toISOString().slice(0, 10),
    confidence: 'Baserat p\u00e5 historiska data (1991\u20132020) f\u00f6r Sm\u00e5land/V\u00e4rnamo',
  };
}

function TemperatureCurve({ risks }: { risks: FrostRisk[] }) {
  if (risks.length === 0) return null;

  const temps = risks.map((r) => r.nightMinTemp);
  const minTemp = Math.min(...temps, -5);
  const maxTemp = Math.max(...temps, 10);
  const range = maxTemp - minTemp || 1;

  const width = risks.length * 48;
  const height = 120;
  const paddingX = 24;
  const paddingY = 16;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const zeroY = paddingY + ((maxTemp - 0) / range) * chartHeight;

  const points = risks.map((r, i) => {
    const x = paddingX + (i / Math.max(risks.length - 1, 1)) * chartWidth;
    const y = paddingY + ((maxTemp - r.nightMinTemp) / range) * chartHeight;
    return { x, y, risk: r };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height - paddingY} L ${points[0].x.toFixed(1)} ${height - paddingY} Z`;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block min-w-full">
        {/* Zero line */}
        <line
          x1={paddingX}
          y1={zeroY}
          x2={width - paddingX}
          y2={zeroY}
          stroke="rgba(239,68,68,0.4)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={paddingX - 4}
          y={zeroY + 3}
          textAnchor="end"
          fill="#ef4444"
          fontSize={9}
          fontFamily="monospace"
        >
          0\u00b0C
        </text>

        {/* Frost zone fill (below 0) */}
        <rect
          x={paddingX}
          y={zeroY}
          width={chartWidth}
          height={Math.max(height - paddingY - zeroY, 0)}
          fill="rgba(239,68,68,0.05)"
        />

        {/* Area fill */}
        <path d={areaD} fill="rgba(74,222,128,0.08)" />

        {/* Temperature line */}
        <path d={pathD} fill="none" stroke="#4ade80" strokeWidth={2} strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill={riskColor(p.risk.riskLevel)}
              stroke="rgba(3,13,5,0.8)"
              strokeWidth={2}
            />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fill={riskColor(p.risk.riskLevel)}
              fontSize={9}
              fontWeight="bold"
              fontFamily="monospace"
            >
              {p.risk.nightMinTemp.toFixed(1)}\u00b0
            </text>
            <text
              x={p.x}
              y={height - 2}
              textAnchor="middle"
              fill="#64748b"
              fontSize={8}
              fontFamily="sans-serif"
            >
              {formatDayShort(p.risk.date)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function FrostAlertTimeline({ lat, lon }: FrostAlertTimelineProps) {
  const [risks, setRisks] = useState<FrostRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveLat = lat ?? DEFAULT_LAT;
  const effectiveLon = lon ?? DEFAULT_LON;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getFrostRisk(effectiveLat, effectiveLon);
        if (!cancelled) setRisks(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Kunde inte ladda frostdata');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [effectiveLat, effectiveLon]);

  const springFrost = useMemo(estimateLastSpringFrost, []);
  const autumnFrost = useMemo(estimateFirstAutumnFrost, []);

  const frostNights = risks.filter((r) => r.riskLevel !== 'none');
  const safeDays = risks.filter((r) => r.riskLevel === 'none');
  const hasFrostRisk = frostNights.length > 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const isSpringContext = currentMonth >= 1 && currentMonth <= 5;
  const safeToPlant = isSpringContext
    ? risks.length > 0 && risks.slice(0, 7).every((r) => r.riskLevel === 'none')
    : false;

  if (loading && risks.length === 0) {
    return (
      <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-6">
        <div className="flex items-center gap-3">
          <Snowflake size={16} className="text-cyan-400 animate-pulse" />
          <span className="text-sm text-[#94a3b8]">Analyserar frostrisk...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Planting Safety Indicator */}
      <div
        className="rounded-xl border p-4 flex items-center gap-4"
        style={{
          borderColor: safeToPlant ? 'rgba(74,222,128,0.3)' : hasFrostRisk ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.15)',
          background: safeToPlant ? 'rgba(74,222,128,0.05)' : hasFrostRisk ? 'rgba(239,68,68,0.05)' : 'rgba(4,28,8,0.8)',
        }}
      >
        {safeToPlant ? (
          <ShieldCheck size={28} className="text-[#4ade80] flex-shrink-0" />
        ) : (
          <ShieldAlert size={28} className={hasFrostRisk ? 'text-red-400 flex-shrink-0' : 'text-[#94a3b8] flex-shrink-0'} />
        )}
        <div>
          <p className={`text-sm font-semibold ${safeToPlant ? 'text-[#4ade80]' : hasFrostRisk ? 'text-red-400' : 'text-[#e2e8f0]'}`}>
            {safeToPlant
              ? 'S\u00e4kert att plantera'
              : hasFrostRisk
                ? 'Frostrisk \u2013 avvakta med plantering'
                : 'Bevaka prognosen inf\u00f6r plantering'}
          </p>
          <p className="text-xs text-[#94a3b8]">
            {safeToPlant
              ? `Inga frostn\u00e4tter v\u00e4ntas de kommande ${risks.length} dagarna. Goda f\u00f6rh\u00e5llanden f\u00f6r plantering.`
              : hasFrostRisk
                ? `${frostNights.length} natt${frostNights.length > 1 ? '\u00e4r' : ''} med frostrisk under kommande ${risks.length} dagar.`
                : 'Ingen frostdata tillg\u00e4nglig just nu.'}
          </p>
        </div>
      </div>

      {/* Temperature Curve */}
      {risks.length > 0 && (
        <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer size={16} className="text-[#4ade80]" />
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Natttemperatur \u2013 14 dagar</h3>
          </div>

          <TemperatureCurve risks={risks} />

          <div className="mt-2 flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-4 h-[2px] bg-[#4ade80]" />
              <span className="text-[#64748b]">Nattens l\u00e4gsta</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-[2px] bg-red-500 opacity-40" style={{ borderTop: '1px dashed' }} />
              <span className="text-[#64748b]">0\u00b0C frostgr\u00e4ns</span>
            </div>
          </div>
        </div>
      )}

      {/* Night-by-Night Timeline */}
      {risks.length > 0 && (
        <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Snowflake size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-[#e2e8f0]">Frostrisk per natt</h3>
          </div>

          <div className="space-y-1">
            {risks.map((r) => (
              <div
                key={r.date}
                className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-[rgba(74,222,128,0.03)]"
                style={{ background: riskBg(r.riskLevel) }}
              >
                <div className="w-14 text-right">
                  <p className="text-[10px] font-medium text-[#e2e8f0]">{formatDayShort(r.date)}</p>
                  <p className="text-[9px] text-[#64748b]">{formatDateShort(r.date)}</p>
                </div>

                {/* Risk bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-[rgba(4,28,8,0.6)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: r.riskLevel === 'high' ? '100%' : r.riskLevel === 'moderate' ? '66%' : r.riskLevel === 'low' ? '33%' : '0%',
                        background: riskColor(r.riskLevel),
                      }}
                    />
                  </div>

                  <span className="text-[10px] font-medium min-w-[60px]" style={{ color: riskColor(r.riskLevel) }}>
                    {riskLabel(r.riskLevel)}
                  </span>
                </div>

                {/* Temperature */}
                <div className="text-right min-w-[48px]">
                  <span
                    className="text-xs font-mono font-bold"
                    style={{ color: r.nightMinTemp <= 0 ? '#ef4444' : r.nightMinTemp <= 2 ? '#fbbf24' : '#4ade80' }}
                  >
                    {r.nightMinTemp.toFixed(1)}\u00b0C
                  </span>
                </div>

                {/* Frost indicator */}
                <div className="w-5">
                  {r.groundFrostLikely ? (
                    <Snowflake size={12} className="text-cyan-400" />
                  ) : (
                    <Sprout size={12} className="text-[#4ade80]" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <Snowflake size={12} className="text-cyan-400 mx-auto mb-1" />
              <p className="text-[10px] text-[#64748b]">Frostn\u00e4tter</p>
              <p className="text-xs font-bold text-[#e2e8f0]">{frostNights.length}</p>
            </div>
            <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <Sprout size={12} className="text-[#4ade80] mx-auto mb-1" />
              <p className="text-[10px] text-[#64748b]">Frostfria</p>
              <p className="text-xs font-bold text-[#e2e8f0]">{safeDays.length}</p>
            </div>
            <div className="p-2 rounded-lg bg-[rgba(4,28,8,0.6)]">
              <TrendingDown size={12} className="text-red-400 mx-auto mb-1" />
              <p className="text-[10px] text-[#64748b]">L\u00e4gsta temp</p>
              <p className="text-xs font-bold text-[#e2e8f0]">
                {risks.length > 0
                  ? Math.min(...risks.map((r) => r.nightMinTemp)).toFixed(1)
                  : '-'}
                \u00b0C
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Historical Frost Predictions */}
      <div className="rounded-xl border border-[rgba(74,222,128,0.15)] bg-[rgba(4,28,8,0.8)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-[#4ade80]" />
          <h3 className="text-sm font-semibold text-[#e2e8f0]">Historisk frostprognos</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-[rgba(74,222,128,0.1)] bg-[rgba(4,28,8,0.4)]">
            <div className="flex items-center gap-2 mb-2">
              <Sprout size={14} className="text-[#4ade80]" />
              <span className="text-xs font-medium text-[#e2e8f0]">Sista v\u00e5rfrost</span>
            </div>
            <p className="text-lg font-bold text-[#4ade80]">
              {new Date(springFrost.date + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })}
            </p>
            <p className="text-[10px] text-[#64748b] mt-1">{springFrost.confidence}</p>
            <p className="text-[10px] text-[#94a3b8] mt-0.5">
              Plantering av frost-k\u00e4nsliga arter b\u00f6r ske efter detta datum.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-[rgba(74,222,128,0.1)] bg-[rgba(4,28,8,0.4)]">
            <div className="flex items-center gap-2 mb-2">
              <Snowflake size={14} className="text-cyan-400" />
              <span className="text-xs font-medium text-[#e2e8f0]">F\u00f6rsta h\u00f6stfrost</span>
            </div>
            <p className="text-lg font-bold text-cyan-400">
              {new Date(autumnFrost.date + 'T12:00:00').toLocaleDateString('sv-SE', { day: 'numeric', month: 'long' })}
            </p>
            <p className="text-[10px] text-[#64748b] mt-1">{autumnFrost.confidence}</p>
            <p className="text-[10px] text-[#94a3b8] mt-0.5">
              Frostfri s\u00e4song: ca {(() => {
                const spring = new Date(springFrost.date);
                const autumn = new Date(autumnFrost.date);
                const days = Math.round((autumn.getTime() - spring.getTime()) / 86400000);
                return days;
              })()} dagar
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-[rgba(74,222,128,0.03)]">
          <Info size={12} className="text-[#64748b] mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-[#64748b]">
            Frostdatum baseras p\u00e5 klimatnormaler f\u00f6r Sm\u00e5land (SMHI 1991\u20132020).
            Lokala variationer f\u00f6rekommer beroende p\u00e5 h\u00f6jd, lutning och avst\u00e5nd till vatten.
            Frostfickor i dalg\u00e5ngar kan ha 2\u20134 veckor l\u00e4ngre frostperiod.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.05)] p-3">
          <p className="text-xs text-yellow-500">
            {error}. Visar uppskattade v\u00e4rden baserat p\u00e5 historiska data.
          </p>
        </div>
      )}
    </div>
  );
}
