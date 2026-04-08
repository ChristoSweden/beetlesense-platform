/**
 * Growth Projection Service
 *
 * Nordic species growth curves for 20-year forest yield projections.
 * Three management scenarios: no action, 30% thinning, clear-cut + replant.
 *
 * Growth curves based on:
 *   - Hägglund & Lundmark site index (H100) system
 *   - SLU production tables for Picea abies and Pinus sylvestris
 *   - Betula pendula growth data (Johansson 1999, SLU)
 *
 * Site index G24/T24/B20 = dominant height at age 100 for that species.
 * Figures in m³ solid wood per hectare (m³sk/ha/year).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProjectionSpecies = 'Spruce' | 'Pine' | 'Birch';
export type ManagementScenario = 'no_action' | 'thinning_30pct' | 'clear_cut_replant';

export interface Parcel {
  id: string;
  name: string;
  areaHa: number;
  species: ProjectionSpecies | string;   // accepts raw species_mix value
  currentAgeYears: number;
  currentVolumeM3PerHa: number;
  siteIndex?: number;       // H100; defaults to 24 if unknown
}

export interface ProjectionPoint {
  year: number;           // calendar year
  decade: number;         // decade offset from current
  ageYears: number;
  volumeM3PerHa: number;
  totalVolumeM3: number;  // volumeM3PerHa * areaHa
  carbonTonnes: number;   // CO₂ tonne equivalent (total)
  estimatedValueSEK: number;
  isOptimalHarvestWindow?: boolean;
  isPeakCarbon?: boolean;
}

export interface ProjectionResult {
  scenario: ManagementScenario;
  scenarioLabel: string;
  points: ProjectionPoint[];
  optimalHarvestYear: number | null;
  optimalHarvestVolume: number;     // m³ total
  optimalHarvestValueSEK: number;
  peakCarbonYear: number;
  peakCarbonTonnes: number;
  totalCarbonTonnesOver20y: number;
}

// ─── Species growth curves ────────────────────────────────────────────────────

/**
 * Annual volume increment (m³sk/ha/year) by decade of forest age.
 * Decade 0 = 0–9 yrs, Decade 1 = 10–19 yrs, ..., Decade 8 = 80+ yrs.
 * Values for site index G24 (Spruce), T24 (Pine), B20 (Birch).
 */
const GROWTH_CURVES: Record<ProjectionSpecies, number[]> = {
  Spruce: [0, 2, 5, 8, 10, 11, 10, 8, 6],  // m³/ha/year by decade
  Pine:   [0, 1, 3, 6,  8,  9,  8, 7, 5],
  Birch:  [0, 2, 4, 6,  7,  6,  5, 4, 3],
};

/** Timber price per m³ in SEK (roundwood, stumpage, 2024 Swedish market) */
const TIMBER_PRICE_SEK_PER_M3: Record<ProjectionSpecies, number> = {
  Spruce: 320,
  Pine: 295,
  Birch: 210,
};

/**
 * Carbon conversion: 1 m³ growing stock ≈ 0.4 tonne dry biomass ≈ 0.73 tonne CO₂.
 * Simplified above-ground estimate; excludes soil carbon.
 */
const M3_TO_CO2_TONNES = 0.73;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveSpecies(raw: string): ProjectionSpecies {
  const lower = raw.toLowerCase();
  if (lower.includes('gran') || lower.includes('spruce')) return 'Spruce';
  if (lower.includes('tall') || lower.includes('pine')) return 'Pine';
  if (lower.includes('björk') || lower.includes('birch')) return 'Birch';
  return 'Spruce'; // default
}

function getAnnualIncrement(species: ProjectionSpecies, ageYears: number, siteIndexFactor: number): number {
  const decade = Math.min(Math.floor(ageYears / 10), 8);
  return GROWTH_CURVES[species][decade] * siteIndexFactor;
}

function siteIndexFactor(siteIndex: number): number {
  // G24 = 1.0 baseline; adjust linearly ±4% per SI unit
  return Math.max(0.3, 1.0 + (siteIndex - 24) * 0.04);
}

// ─── Projection engine ────────────────────────────────────────────────────────

export function projectGrowth(
  parcel: Parcel,
  years: number,
  scenario: ManagementScenario,
): ProjectionResult {
  const species = resolveSpecies(parcel.species);
  const sif = siteIndexFactor(parcel.siteIndex ?? 24);
  const timberPrice = TIMBER_PRICE_SEK_PER_M3[species];
  const currentYear = new Date().getFullYear();
  const areaHa = parcel.areaHa;

  const points: ProjectionPoint[] = [];
  let volumeM3PerHa = parcel.currentVolumeM3PerHa;
  let ageYears = parcel.currentAgeYears;

  // Clear-cut + replant: reset at year 0
  let postClearCutAge = 0;
  const isClearCut = scenario === 'clear_cut_replant';
  if (isClearCut) {
    volumeM3PerHa = 0;
    ageYears = 0;
    postClearCutAge = 0;
  }

  for (let y = 0; y <= years; y++) {
    const currentAge = isClearCut ? postClearCutAge + y : ageYears + y;

    let annualIncrement = getAnnualIncrement(species, currentAge, sif);

    // Thinning at year 5: removes 30% of volume, boosts subsequent growth by 15%
    if (scenario === 'thinning_30pct' && y === 5) {
      volumeM3PerHa *= 0.70;
    }
    if (scenario === 'thinning_30pct' && y > 5) {
      annualIncrement *= 1.15; // thinning response boost
    }

    if (y > 0) {
      volumeM3PerHa = Math.max(0, volumeM3PerHa + annualIncrement);
    }

    const totalVolumeM3 = volumeM3PerHa * areaHa;
    const carbonTonnes = totalVolumeM3 * M3_TO_CO2_TONNES;
    const estimatedValueSEK = totalVolumeM3 * timberPrice;

    points.push({
      year: currentYear + y,
      decade: Math.floor(y / 10),
      ageYears: currentAge,
      volumeM3PerHa: Math.round(volumeM3PerHa * 10) / 10,
      totalVolumeM3: Math.round(totalVolumeM3),
      carbonTonnes: Math.round(carbonTonnes * 10) / 10,
      estimatedValueSEK: Math.round(estimatedValueSEK / 1000) * 1000,
    });
  }

  // Find optimal harvest window: year when MAI peaks (max mean annual increment)
  let optimalHarvestIdx: number | null = null;
  let bestMAI = 0;
  for (let i = 1; i < points.length; i++) {
    const initialVol = (parcel.currentVolumeM3PerHa * areaHa);
    const added = points[i].totalVolumeM3 - (isClearCut ? 0 : initialVol);
    const mai = added > 0 ? added / i : 0;
    if (mai > bestMAI && points[i].ageYears >= 40) {
      bestMAI = mai;
      optimalHarvestIdx = i;
    }
  }

  // Find peak carbon year
  let peakCarbonIdx = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].carbonTonnes > points[peakCarbonIdx].carbonTonnes) {
      peakCarbonIdx = i;
    }
  }

  // Annotate
  if (optimalHarvestIdx !== null) {
    points[optimalHarvestIdx].isOptimalHarvestWindow = true;
  }
  points[peakCarbonIdx].isPeakCarbon = true;

  const optimalPoint = optimalHarvestIdx !== null ? points[optimalHarvestIdx] : null;

  const scenarioLabels: Record<ManagementScenario, string> = {
    no_action: 'No action',
    thinning_30pct: '30% thinning at year 5',
    clear_cut_replant: 'Clear cut + replant',
  };

  const totalCarbon = points.reduce((sum, p, i) => {
    if (i === 0) return sum;
    const prev = points[i - 1];
    const annualSeq = Math.max(0, p.carbonTonnes - prev.carbonTonnes);
    return sum + annualSeq;
  }, 0);

  return {
    scenario,
    scenarioLabel: scenarioLabels[scenario],
    points,
    optimalHarvestYear: optimalPoint?.year ?? null,
    optimalHarvestVolume: optimalPoint?.totalVolumeM3 ?? 0,
    optimalHarvestValueSEK: optimalPoint?.estimatedValueSEK ?? 0,
    peakCarbonYear: points[peakCarbonIdx].year,
    peakCarbonTonnes: points[peakCarbonIdx].carbonTonnes,
    totalCarbonTonnesOver20y: Math.round(totalCarbon * 10) / 10,
  };
}

export function projectAllScenarios(parcel: Parcel, years = 20): ProjectionResult[] {
  const scenarios: ManagementScenario[] = ['no_action', 'thinning_30pct', 'clear_cut_replant'];
  return scenarios.map((s) => projectGrowth(parcel, years, s));
}
