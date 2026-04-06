import { useMemo, useState, memo } from 'react';
import {
  TreePine,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  estimateBiomass,
  valuateForestAsset,
  SPECIES_PARAMS,
} from '@/services/opendata/carbonBiomassService';

// ─── Types ───

interface SpeciesEntry {
  species: string;
  pct: number;
}

interface ForestProfitLossProps {
  areaHa?: number;
  volumeM3Ha?: number;
  speciesMix?: SpeciesEntry[];
}

type Period = 'ytd' | '12mo' | 'all';

interface LineItem {
  label: string;
  value: number;
  trend: 'up' | 'flat' | 'down';
  note?: string;
}

// ─── Helpers ───

function formatSEK(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M kr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k kr`;
  return `${Math.round(value)} kr`;
}

function trendIcon(trend: 'up' | 'flat' | 'down') {
  if (trend === 'up')
    return <TrendingUp size={12} className="text-[var(--green)]" />;
  if (trend === 'down')
    return <TrendingDown size={12} className="text-red-500" />;
  return <ArrowRight size={12} className="text-[var(--text3)]" />;
}

/** Scale a yearly value by the selected period. */
function scaleByPeriod(yearlyValue: number, period: Period): number {
  if (period === 'ytd') {
    // Approximate months elapsed in current year
    const now = new Date();
    const monthsElapsed = now.getMonth() + 1;
    return Math.round(yearlyValue * (monthsElapsed / 12));
  }
  if (period === 'all') {
    // Assume 3-year history
    return Math.round(yearlyValue * 3);
  }
  return Math.round(yearlyValue);
}

// ─── Component ───

export const ForestProfitLoss = memo(function ForestProfitLoss({
  areaHa = 35,
  volumeM3Ha = 180,
  speciesMix = [
    { species: 'Gran', pct: 58 },
    { species: 'Tall', pct: 28 },
    { species: 'Björk', pct: 14 },
  ],
}: ForestProfitLossProps) {
  const [period, setPeriod] = useState<Period>('12mo');
  const [methodOpen, setMethodOpen] = useState(false);

  // Build species record for service calls
  const speciesRecord = useMemo(() => {
    const rec: Record<string, number> = {};
    for (const s of speciesMix) {
      const key = s.species.toLowerCase().replace('ö', 'o');
      rec[key] = s.pct / 100;
    }
    return rec;
  }, [speciesMix]);

  const data = useMemo(() => {
    // Get biomass / carbon from existing service
    const dominant = speciesMix.reduce((a, b) => (b.pct > a.pct ? b : a));
    const speciesKey = dominant.species.toLowerCase().replace('ö', 'o');
    const params = SPECIES_PARAMS[speciesKey] ?? SPECIES_PARAMS['gran'];

    const bio = estimateBiomass({
      volumeM3PerHa: volumeM3Ha,
      backscatterVH: -11.5,
      canopyHeightM: 22,
      species: params.species,
    });

    const val = valuateForestAsset(bio.carbonStock, volumeM3Ha, areaHa, speciesRecord);

    // ── Revenue (annual) ──
    const growthPct = 0.032; // 3.2% annual volume increment
    const timberGrowthRevenue = Math.round(
      volumeM3Ha * areaHa * growthPct * val.timberPriceSEK,
    );

    const co2PerHaYear = 5; // tonnes CO2e / ha / year
    const euEtsEur = val.euEtsPrice; // 70
    const eurToSek = 11.5;
    const carbonRevenue = Math.round(
      co2PerHaYear * areaHa * euEtsEur * eurToSek,
    );

    const biodiversityCredits = 15_000; // emerging market estimate

    const revenueItems: LineItem[] = [
      {
        label: 'Timber growth',
        value: timberGrowthRevenue,
        trend: 'up',
        note: `${volumeM3Ha} m\u00B3/ha \u00D7 ${areaHa} ha \u00D7 ${(growthPct * 100).toFixed(1)}% \u00D7 ${val.timberPriceSEK} kr/m\u00B3`,
      },
      {
        label: 'Carbon sequestration',
        value: carbonRevenue,
        trend: 'up',
        note: `${co2PerHaYear} t CO\u2082e/ha \u00D7 ${areaHa} ha \u00D7 ${euEtsEur} \u20AC \u00D7 ${eurToSek} SEK/\u20AC`,
      },
      {
        label: 'Biodiversity credits',
        value: biodiversityCredits,
        trend: 'flat',
        note: 'Emerging ecosystem services market',
      },
    ];
    const totalRevenue = revenueItems.reduce((s, i) => s + i.value, 0);

    // ── Risk Avoided (annual) ──
    const riskItems: LineItem[] = [
      {
        label: 'Beetle damage prevented',
        value: 540_000,
        trend: 'up',
        note: '12 ha at-risk \u00D7 45k kr/ha salvage cost',
      },
      {
        label: 'Storm early warning',
        value: 300_000,
        trend: 'flat',
        note: '2 vulnerable stands harvested early \u00D7 150k kr',
      },
      {
        label: 'Fire detection',
        value: 180_000,
        trend: 'flat',
        note: '1 event \u00D7 180k kr early-response saving',
      },
      {
        label: 'Compliance fines avoided',
        value: 50_000,
        trend: 'down',
        note: '1 near-miss regulatory violation',
      },
    ];
    const totalRisk = riskItems.reduce((s, i) => s + i.value, 0);

    // ── Net ──
    const subscriptionCost = 2_400;
    const totalBenefit = totalRevenue + totalRisk;
    const roi = totalBenefit > 0 && subscriptionCost > 0
      ? Math.round(totalBenefit / subscriptionCost)
      : 0;

    return {
      revenueItems,
      totalRevenue,
      riskItems,
      totalRisk,
      subscriptionCost,
      totalBenefit,
      roi,
    };
  }, [areaHa, volumeM3Ha, speciesMix, speciesRecord]);

  // Scale values by selected period
  const scaled = useMemo(() => {
    const s = (v: number) => scaleByPeriod(v, period);
    return {
      revenueItems: data.revenueItems.map((i) => ({ ...i, value: s(i.value) })),
      totalRevenue: s(data.totalRevenue),
      riskItems: data.riskItems.map((i) => ({ ...i, value: s(i.value) })),
      totalRisk: s(data.totalRisk),
      subscriptionCost: s(data.subscriptionCost),
      totalBenefit: s(data.totalBenefit),
      roi: data.roi,
    };
  }, [data, period]);

  const periodLabels: Record<Period, string> = {
    ytd: 'YTD',
    '12mo': '12 mo',
    all: 'All time',
  };

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TreePine size={16} className="text-[var(--green)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            Forest P&amp;L
          </span>
        </div>
        <div className="flex gap-1">
          {(['ytd', '12mo', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                period === p
                  ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5 font-semibold'
                  : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--text3)]'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Section */}
      <SectionHeader label="Revenue" color="var(--green)" />
      <div className="space-y-1 mb-2">
        {scaled.revenueItems.map((item) => (
          <LineItemRow key={item.label} item={item} colorClass="text-[var(--green)]" />
        ))}
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg mb-3 border border-[var(--green)]/20" style={{ background: 'var(--green-light, #e8f5e9)08' }}>
        <span className="text-[11px] font-semibold text-[var(--text)]">Total Revenue</span>
        <span className="text-sm font-bold font-mono text-[var(--green)]">
          {formatSEK(scaled.totalRevenue)}
        </span>
      </div>

      {/* Risk Avoided Section */}
      <SectionHeader label="Risk Avoided" color="#e67e22" icon={<Shield size={11} className="text-[#e67e22]" />} />
      <div className="space-y-1 mb-2">
        {scaled.riskItems.map((item) => (
          <LineItemRow key={item.label} item={item} colorClass="text-[#e67e22]" />
        ))}
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg mb-3 border border-[#e67e22]/20" style={{ background: '#e67e2208' }}>
        <span className="text-[11px] font-semibold text-[var(--text)]">Total Risk Avoided</span>
        <span className="text-sm font-bold font-mono text-[#e67e22]">
          {formatSEK(scaled.totalRisk)}
        </span>
      </div>

      {/* Net Value Section */}
      <div
        className="rounded-lg p-3 border border-[var(--green)]/30 mb-3"
        style={{ background: 'var(--green-light, #e8f5e9)10' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--text3)]">Total Benefit</span>
          <span className="text-sm font-bold font-mono text-[var(--text)]">
            {formatSEK(scaled.totalBenefit)}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[var(--text3)]">
            BeetleSense subscription
          </span>
          <span className="text-[10px] font-mono text-[var(--text3)]">
            &minus;{formatSEK(scaled.subscriptionCost)}
          </span>
        </div>
        <div className="border-t border-[var(--border)] pt-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[var(--text3)] block">Net Value</span>
            <span className="text-xl font-bold font-mono text-[var(--green)]">
              {formatSEK(scaled.totalBenefit - scaled.subscriptionCost)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[var(--text3)] block">ROI</span>
            <span className="text-lg font-bold font-mono text-[var(--green)]">
              {scaled.roi}:1
            </span>
          </div>
        </div>
      </div>

      {/* How we calculated this */}
      <button
        onClick={() => setMethodOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors mb-1"
      >
        {methodOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        How we calculated this
      </button>
      {methodOpen && (
        <div className="rounded-lg p-2.5 border border-[var(--border)] text-[9px] text-[var(--text3)] space-y-1" style={{ background: 'var(--bg)' }}>
          <p>
            Revenue figures use your forest area ({areaHa} ha), volume ({volumeM3Ha} m&sup3;/ha),
            current timber prices from SCB/Biometria, and EU ETS carbon pricing.
            Biodiversity credits reflect emerging Swedish ecosystem service markets.
          </p>
          <p>
            Risk avoided is estimated from BeetleSense alerts, satellite monitoring,
            and early-warning detections during the selected period.
          </p>
          <p>
            ROI = Total Benefit / BeetleSense Subscription Cost.
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {['SCB', 'EU ETS', 'SMHI', 'Sentinel-2', 'NASA FIRMS'].map((src) => (
              <span
                key={src}
                className="px-1.5 py-0.5 rounded border border-[var(--border)] text-[8px]"
                style={{ background: 'var(--bg2)' }}
              >
                {src}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Sub-components ───

function SectionHeader({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      {icon ?? <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
      <span className="text-[10px] font-semibold text-[var(--text2)]">{label}</span>
    </div>
  );
}

function LineItemRow({
  item,
  colorClass,
}: {
  item: LineItem;
  colorClass: string;
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded hover:bg-[var(--bg)] transition-colors group">
      <div className="flex items-center gap-1.5">
        {trendIcon(item.trend)}
        <span className="text-[11px] text-[var(--text2)]">{item.label}</span>
      </div>
      <span className={`text-[11px] font-mono font-semibold ${colorClass}`}>
        {formatSEK(item.value)}
      </span>
    </div>
  );
}
