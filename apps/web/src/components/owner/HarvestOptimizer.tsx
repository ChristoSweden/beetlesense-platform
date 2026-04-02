import { useMemo } from 'react';
import { TreePine, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { isDemoMode } from '@/lib/dataMode';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// Swedish timber market prices (SEK/m3, realistic 2026 values)
const PRICES = {
  spruce_sawlog: 650,
  pine_sawlog: 600,
  pulpwood: 350,
};

type HarvestUrgency = 'now' | 'wait' | 'urgent';

interface ParcelRecommendation {
  parcelId: string;
  parcelName: string;
  areaHa: number;
  urgency: HarvestUrgency;
  reason: string;
  waitUntil?: string;
  estimatedRevenue: number;
  dominantSpecies: string;
}

function estimateVolume(areaHa: number, speciesMix: { species: string; pct: number }[]): number {
  // Average standing volume in Swedish managed forests: ~150-250 m3/ha
  // Use 180 m3/ha as a conservative demo estimate
  return areaHa * 180;
}

function estimateRevenue(
  areaHa: number,
  speciesMix: { species: string; pct: number }[],
): number {
  const volume = estimateVolume(areaHa, speciesMix);
  // 60% sawlog, 40% pulpwood split
  let totalRevenue = 0;

  for (const s of speciesMix) {
    const speciesVolume = volume * (s.pct / 100);
    const sawlogVol = speciesVolume * 0.6;
    const pulpVol = speciesVolume * 0.4;

    let sawlogPrice = PRICES.pulpwood; // default for non-commercial species
    if (s.species === 'Spruce') sawlogPrice = PRICES.spruce_sawlog;
    else if (s.species === 'Pine') sawlogPrice = PRICES.pine_sawlog;
    else if (s.species === 'Oak') sawlogPrice = 700; // premium hardwood
    else if (s.species === 'Birch') sawlogPrice = 450;

    totalRevenue += sawlogVol * sawlogPrice + pulpVol * PRICES.pulpwood;
  }

  return Math.round(totalRevenue);
}

function getDominantSpecies(speciesMix: { species: string; pct: number }[]): string {
  const sorted = [...speciesMix].sort((a, b) => b.pct - a.pct);
  return sorted[0]?.species ?? 'Mixed';
}

function getRecommendation(parcel: DemoParcel): ParcelRecommendation {
  const now = new Date();
  const month = now.getMonth() + 1;
  const dominant = getDominantSpecies(parcel.species_mix);
  const revenue = estimateRevenue(parcel.area_hectares, parcel.species_mix);

  // Infested: urgent harvest
  if (parcel.status === 'infested') {
    return {
      parcelId: parcel.id,
      parcelName: parcel.name,
      areaHa: parcel.area_hectares,
      urgency: 'urgent',
      reason: 'Beetle damage detected. Salvage harvest to prevent spread.',
      estimatedRevenue: Math.round(revenue * 0.7), // 30% value loss from damage
      dominantSpecies: dominant,
    };
  }

  // At risk with high spruce content: harvest soon
  if (parcel.status === 'at_risk') {
    const spruceContent = parcel.species_mix.find(s => s.species === 'Spruce')?.pct ?? 0;
    if (spruceContent >= 50) {
      return {
        parcelId: parcel.id,
        parcelName: parcel.name,
        areaHa: parcel.area_hectares,
        urgency: 'now',
        reason: `High spruce content (${spruceContent}%) in at-risk zone. Harvest before swarming season.`,
        estimatedRevenue: revenue,
        dominantSpecies: dominant,
      };
    }
  }

  // Seasonal logic: winter harvest preferred for soil protection
  if (month >= 11 || month <= 3) {
    return {
      parcelId: parcel.id,
      parcelName: parcel.name,
      areaHa: parcel.area_hectares,
      urgency: 'now',
      reason: 'Winter conditions. Frozen ground protects soil. Good harvest window.',
      estimatedRevenue: revenue,
      dominantSpecies: dominant,
    };
  }

  // Summer / growing season: wait for winter
  return {
    parcelId: parcel.id,
    parcelName: parcel.name,
    areaHa: parcel.area_hectares,
    urgency: 'wait',
    reason: 'Healthy stand. Winter harvest preferred for soil protection.',
    waitUntil: 'November',
    estimatedRevenue: revenue,
    dominantSpecies: dominant,
  };
}

const fmtSEK = (v: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(v);

const URGENCY_CONFIG: Record<HarvestUrgency, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent: beetle damage', color: '#ef4444', bg: '#ef444415' },
  now: { label: 'Harvest now', color: '#f97316', bg: '#f9731615' },
  wait: { label: 'Wait', color: '#4ade80', bg: '#4ade8015' },
};

export function HarvestOptimizer() {
  const demo = isDemoMode();
  // TODO: fetch from Supabase in live mode
  // For now, fall back to demo data gracefully in both modes
  void demo;

  const recommendations = useMemo(() => {
    return DEMO_PARCELS.map(getRecommendation);
  }, []);

  const totalRevenue = recommendations.reduce((sum, r) => sum + r.estimatedRevenue, 0);
  const urgentCount = recommendations.filter(r => r.urgency === 'urgent').length;
  const harvestNowCount = recommendations.filter(r => r.urgency === 'now').length;

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
            Harvest Timing Optimizer
          </span>
        </div>
        <span className="text-[10px] text-[var(--text3)]">
          {recommendations.length} parcels
        </span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg p-2 border border-[var(--border)] text-center" style={{ background: 'var(--bg)' }}>
          <div className="text-xs font-bold text-[var(--green)]">{fmtSEK(totalRevenue)}</div>
          <div className="text-[10px] text-[var(--text3)]">Est. total revenue</div>
        </div>
        <div className="rounded-lg p-2 border border-[var(--border)] text-center" style={{ background: 'var(--bg)' }}>
          <div className="text-xs font-bold text-orange-500">{harvestNowCount}</div>
          <div className="text-[10px] text-[var(--text3)]">Harvest now</div>
        </div>
        <div className="rounded-lg p-2 border border-[var(--border)] text-center" style={{ background: 'var(--bg)' }}>
          <div className="text-xs font-bold text-red-500">{urgentCount}</div>
          <div className="text-[10px] text-[var(--text3)]">Urgent</div>
        </div>
      </div>

      {/* Market prices */}
      <div className="flex gap-2 mb-3 text-[10px] text-[var(--text3)]">
        <span>Spruce sawlog: {PRICES.spruce_sawlog} SEK/m3</span>
        <span>|</span>
        <span>Pine: {PRICES.pine_sawlog}</span>
        <span>|</span>
        <span>Pulp: {PRICES.pulpwood}</span>
      </div>

      {/* Parcel list */}
      <div className="space-y-2">
        {recommendations.map((rec) => {
          const cfg = URGENCY_CONFIG[rec.urgency];
          return (
            <div
              key={rec.parcelId}
              className="rounded-lg p-2.5 border border-[var(--border)]"
              style={{ background: 'var(--bg)' }}
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <span className="text-xs font-semibold text-[var(--text)]">{rec.parcelName}</span>
                  <span className="text-[10px] text-[var(--text3)] ml-2">{rec.areaHa} ha</span>
                  <span className="text-[10px] text-[var(--text3)] ml-1">({rec.dominantSpecies})</span>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {rec.urgency === 'wait' && rec.waitUntil
                    ? `Wait until ${rec.waitUntil}`
                    : cfg.label}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text3)] mb-1">{rec.reason}</p>
              <div className="flex items-center gap-1">
                <TrendingUp size={10} className="text-[var(--green)]" />
                <span className="text-[10px] font-mono font-semibold text-[var(--green)]">
                  {fmtSEK(rec.estimatedRevenue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-[var(--text3)] mt-2">
        Prices: Swedish timber market averages 2026. Volume est. 180 m3/ha (60% sawlog, 40% pulpwood).
      </p>
    </div>
  );
}
