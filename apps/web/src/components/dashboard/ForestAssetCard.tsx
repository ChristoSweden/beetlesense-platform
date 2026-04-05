import { useMemo, memo } from 'react';
import { TrendingUp, Leaf, Factory, TreePine } from 'lucide-react';
import {
  estimateBiomass,
  valuateForestAsset,
  SPECIES_PARAMS,
  type BiomassEstimate,
  type ForestValuation,
} from '@/services/opendata/carbonBiomassService';

// ─── Types ───

interface ForestAssetCardProps {
  volumeM3Ha?: number;
  canopyHeightM?: number;
  areaHa?: number;
  speciesMix?: { species: string; pct: number }[];
}

// ─── Helpers ───

function formatSEK(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M kr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k kr`;
  return `${Math.round(value)} kr`;
}

function formatTonnes(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(1);
}

// ─── Component ───

export const ForestAssetCard = memo(function ForestAssetCard({
  volumeM3Ha = 180,
  canopyHeightM = 22,
  areaHa = 35,
  speciesMix = [
    { species: 'Gran', pct: 58 },
    { species: 'Tall', pct: 28 },
    { species: 'Björk', pct: 14 },
  ],
}: ForestAssetCardProps) {
  const { biomass, valuation } = useMemo(() => {
    const dominantSpecies = speciesMix.reduce((a, b) => (b.pct > a.pct ? b : a)).species;
    const speciesKey = dominantSpecies.toLowerCase();
    const params = SPECIES_PARAMS[speciesKey] ?? SPECIES_PARAMS['gran'];

    const bio = estimateBiomass({
      volumeM3Ha,
      backscatterVH: -11.5,
      canopyHeightM,
      species: params.species,
    });

    const val = valuateForestAsset(
      bio.carbonStock,
      volumeM3Ha,
      areaHa,
      speciesMix,
    );

    return { biomass: bio, valuation: val };
  }, [volumeM3Ha, canopyHeightM, areaHa, speciesMix]);

  const totalCarbon = biomass.carbonStock * areaHa;
  const totalCO2e = biomass.co2Equivalent * areaHa;

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
            Forest Asset Valuation
          </span>
        </div>
        <span className="text-[10px] text-[var(--text3)] bg-[var(--bg)] px-2 py-0.5 rounded-full border border-[var(--border)]">
          {areaHa} ha
        </span>
      </div>

      {/* Total value */}
      <div className="mb-3 p-3 rounded-lg border border-[var(--green)]/20" style={{ background: 'var(--green-light, #e8f5e9)08' }}>
        <span className="text-[10px] text-[var(--text3)] block mb-0.5">Total Asset Value</span>
        <span className="text-xl font-bold text-[var(--text)] font-mono">
          {formatSEK(valuation.totalAssetValueSEK)}
        </span>
      </div>

      {/* Breakdown grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <MetricBox
          icon={<Factory size={12} className="text-[var(--text3)]" />}
          label="Timber Value"
          value={formatSEK(valuation.timberValueSEK)}
          sub={`${valuation.timberPriceSEK} kr/m³`}
        />
        <MetricBox
          icon={<Leaf size={12} className="text-[var(--text3)]" />}
          label="Carbon Credits"
          value={formatSEK(valuation.carbonValueEUR * 11.5)}
          sub={`EU ETS ${valuation.euEtsPrice} €/t`}
        />
        <MetricBox
          icon={<TrendingUp size={12} className="text-[var(--text3)]" />}
          label="Carbon Stock"
          value={`${formatTonnes(totalCarbon)} t C`}
          sub={`${biomass.carbonStock.toFixed(0)} t/ha`}
        />
        <MetricBox
          icon={<Leaf size={12} className="text-[var(--text3)]" />}
          label="CO₂ Equivalent"
          value={`${formatTonnes(totalCO2e)} t`}
          sub={`${biomass.co2Equivalent.toFixed(0)} t/ha`}
        />
      </div>

      {/* Biomass breakdown */}
      <div className="rounded-lg p-2.5 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-[var(--text2)]">Biomass Estimate</span>
          <span className="text-[10px] text-[var(--text3)]">
            {(biomass.confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
        <div className="flex gap-3 text-[10px]">
          <div>
            <span className="text-[var(--text3)]">AGB: </span>
            <span className="font-mono font-semibold text-[var(--text)]">
              {biomass.aboveGroundBiomass.toFixed(0)} t/ha
            </span>
          </div>
          <div>
            <span className="text-[var(--text3)]">BGB: </span>
            <span className="font-mono font-semibold text-[var(--text)]">
              {biomass.belowGroundBiomass.toFixed(0)} t/ha
            </span>
          </div>
          <div>
            <span className="text-[var(--text3)]">Total: </span>
            <span className="font-mono font-semibold text-[var(--text)]">
              {biomass.totalBiomass.toFixed(0)} t/ha
            </span>
          </div>
        </div>
        <p className="text-[9px] text-[var(--text3)] mt-1">
          Method: {biomass.method} | Sources: {biomass.sources.join(', ')}
        </p>
      </div>
    </div>
  );
});

// ─── Sub-components ───

function MetricBox({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[10px] text-[var(--text3)]">{label}</span>
      </div>
      <span className="text-sm font-bold font-mono text-[var(--text)]">{value}</span>
      <span className="text-[9px] text-[var(--text3)] block">{sub}</span>
    </div>
  );
}
