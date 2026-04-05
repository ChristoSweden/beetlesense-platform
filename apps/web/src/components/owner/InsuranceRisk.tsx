import { useMemo, memo } from 'react';
import { Shield, Bug, Wind, Flame } from 'lucide-react';
import { isDemoMode } from '@/lib/dataMode';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// ─── Risk scoring ───

interface ParcelRisk {
  parcelId: string;
  parcelName: string;
  areaHa: number;
  beetleRisk: number;   // 1-10
  stormRisk: number;    // 1-10
  fireRisk: number;     // 1-10
  overall: number;      // 1-10
}

type CoverageLevel = 'Basic' | 'Standard' | 'Premium';

interface PortfolioSummary {
  parcelRisks: ParcelRisk[];
  totalArea: number;
  portfolioScore: number;       // 1-10
  coverageLevel: CoverageLevel;
  premiumRange: { low: number; high: number };
}

function scoreBeetleRisk(parcel: DemoParcel): number {
  const spruceContent = parcel.species_mix.find(s => s.species === 'Spruce')?.pct ?? 0;
  if (parcel.status === 'infested') return 10;
  if (parcel.status === 'at_risk') return 7;
  if (spruceContent > 60) return 5;
  if (spruceContent > 30) return 3;
  return 1;
}

function scoreStormRisk(parcel: DemoParcel): number {
  // Higher elevation + spruce = more wind exposure
  const elevFactor = parcel.elevation_m > 280 ? 3 : parcel.elevation_m > 200 ? 2 : 1;
  const spruceContent = parcel.species_mix.find(s => s.species === 'Spruce')?.pct ?? 0;
  const speciesFactor = spruceContent > 60 ? 3 : spruceContent > 30 ? 2 : 1;
  return Math.min(10, Math.round((elevFactor + speciesFactor) * 1.5));
}

function scoreFireRisk(parcel: DemoParcel): number {
  // Pine on sandy soil = higher fire risk
  const pineContent = parcel.species_mix.find(s => s.species === 'Pine')?.pct ?? 0;
  const soilFactor = parcel.soil_type.toLowerCase().includes('sand') ? 3 :
    parcel.soil_type.toLowerCase().includes('peat') ? 4 : 1;
  const speciesFactor = pineContent > 50 ? 3 : pineContent > 20 ? 2 : 1;
  return Math.min(10, Math.round((soilFactor + speciesFactor) * 1.2));
}

function computePortfolio(): PortfolioSummary {
  const parcelRisks: ParcelRisk[] = DEMO_PARCELS.map(p => {
    const beetle = scoreBeetleRisk(p);
    const storm = scoreStormRisk(p);
    const fire = scoreFireRisk(p);
    // Weighted average: beetle risk most important in Smaland
    const overall = Math.round(beetle * 0.5 + storm * 0.3 + fire * 0.2);
    return {
      parcelId: p.id,
      parcelName: p.name,
      areaHa: p.area_hectares,
      beetleRisk: beetle,
      stormRisk: storm,
      fireRisk: fire,
      overall: Math.min(10, Math.max(1, overall)),
    };
  });

  const totalArea = parcelRisks.reduce((sum, p) => sum + p.areaHa, 0);

  // Area-weighted portfolio score
  const weightedSum = parcelRisks.reduce((sum, p) => sum + p.overall * p.areaHa, 0);
  const portfolioScore = Math.min(10, Math.max(1, totalArea > 0 ? Math.round(weightedSum / totalArea) : 0));

  // Coverage recommendation
  let coverageLevel: CoverageLevel;
  if (portfolioScore >= 7) coverageLevel = 'Premium';
  else if (portfolioScore >= 4) coverageLevel = 'Standard';
  else coverageLevel = 'Basic';

  // Swedish forest insurance: ~15-45 SEK/ha/year
  const baseRate = portfolioScore >= 7 ? 38 : portfolioScore >= 4 ? 25 : 15;
  const premiumRange = {
    low: Math.round(totalArea * baseRate * 0.85),
    high: Math.round(totalArea * baseRate * 1.15),
  };

  return { parcelRisks, totalArea, portfolioScore, coverageLevel, premiumRange };
}

function riskBar(value: number) {
  const color = value >= 7 ? '#ef4444' : value >= 4 ? '#fbbf24' : '#4ade80';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${value * 10}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

const fmtSEK = (v: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(v);

const COVERAGE_COLORS: Record<CoverageLevel, string> = {
  Basic: '#4ade80',
  Standard: '#fbbf24',
  Premium: '#ef4444',
};

export const InsuranceRisk = memo(function InsuranceRisk() {
  const demo = isDemoMode();
  // TODO: fetch from Supabase in live mode
  // For now, fall back to demo data gracefully in both modes
  void demo;
  const portfolio = useMemo(() => computePortfolio(), []);
  const coverageColor = COVERAGE_COLORS[portfolio.coverageLevel];

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[var(--green)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            Insurance Risk Summary
          </span>
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{ background: `${coverageColor}20`, color: coverageColor }}
        >
          {portfolio.coverageLevel}
        </span>
      </div>

      {/* Portfolio score */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: `${coverageColor}15` }}
        >
          <span className="text-xl font-bold font-mono" style={{ color: coverageColor }}>
            {portfolio.portfolioScore}
          </span>
        </div>
        <div>
          <div className="text-xs font-semibold text-[var(--text)]">
            Portfolio Risk Score: {portfolio.portfolioScore}/10
          </div>
          <div className="text-[10px] text-[var(--text3)]">
            {portfolio.totalArea.toFixed(1)} ha across {portfolio.parcelRisks.length} parcels
          </div>
          <div className="text-[10px] text-[var(--text3)]">
            Recommended: <span className="font-semibold" style={{ color: coverageColor }}>{portfolio.coverageLevel}</span> coverage
          </div>
        </div>
      </div>

      {/* Premium estimate */}
      <div
        className="rounded-lg p-2.5 border mb-3"
        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text3)]">Est. annual premium</span>
          <span className="text-xs font-bold text-[var(--text)]">
            {fmtSEK(portfolio.premiumRange.low)} - {fmtSEK(portfolio.premiumRange.high)}
          </span>
        </div>
        <div className="text-[10px] text-[var(--text3)] mt-0.5">
          Based on {portfolio.totalArea > 0 ? Math.round(portfolio.premiumRange.low / portfolio.totalArea) : 0}-
          {portfolio.totalArea > 0 ? Math.round(portfolio.premiumRange.high / portfolio.totalArea) : 0} SEK/ha/year
        </div>
      </div>

      {/* Risk breakdown by parcel */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-[10px] text-[var(--text3)] font-semibold mb-1 px-1">
          <span>Parcel</span>
          <span className="flex items-center gap-0.5"><Bug size={10} /> Beetle</span>
          <span className="flex items-center gap-0.5"><Wind size={10} /> Storm</span>
          <span className="flex items-center gap-0.5"><Flame size={10} /> Fire</span>
        </div>
        {portfolio.parcelRisks.map((pr) => (
          <div
            key={pr.parcelId}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center rounded-lg px-1 py-1"
          >
            <div>
              <span className="text-xs font-medium text-[var(--text)]">{pr.parcelName}</span>
              <span className="text-[10px] text-[var(--text3)] ml-1">{pr.areaHa} ha</span>
            </div>
            {riskBar(pr.beetleRisk)}
            {riskBar(pr.stormRisk)}
            {riskBar(pr.fireRisk)}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[var(--text3)] mt-3">
        Premium estimate based on Swedish forest insurance averages (15-45 SEK/ha/year).
        Consult your insurance provider for exact quotes.
      </p>
    </div>
  );
});
