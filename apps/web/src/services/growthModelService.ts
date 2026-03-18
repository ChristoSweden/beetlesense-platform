/**
 * Growth Model Service — Climate-Adjusted Forest Yield Projections
 *
 * Based on Swedish yield table principles:
 *  - Hägglund & Lundmark site index (H100) system
 *  - SLU production tables for Picea abies (gran) and Pinus sylvestris (tall)
 *  - Climate adjustment factors from SMHI RCP scenarios
 *
 * Site index H100 = dominant height at age 100 (breast height age).
 * Growth modelled via Chapman-Richards function fitted to Swedish data.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type Species = 'spruce' | 'pine' | 'mixed';

export type ClimateScenario = 'rcp45' | 'rcp60' | 'rcp85';

export interface ParcelData {
  id: string;
  name: string;
  species: Species;
  siteIndex: number;        // H100 value
  currentAge: number;       // years (total age)
  currentVolume: number;    // m³sk/ha
  area: number;             // hectares
  soilType: string;
  speciesComposition: { species: string; percent: number }[];
  latitude: number;
  temperatureTrend: number; // °C per decade (observed)
  precipitationTrend: number; // mm per decade (observed)
}

export interface GrowthProjection {
  year: number;
  age: number;
  volume: number;         // m³sk/ha
  mai: number;            // mean annual increment (m³sk/ha/yr)
  cai: number;            // current annual increment
}

export interface ScenarioResult {
  scenario: ClimateScenario;
  label: string;
  projections: GrowthProjection[];
  optimalRotationAge: number;
  maxMai: number;
  volumeAtOptimal: number;
}

export interface RotationAnalysis {
  rotationAge: number;
  volume: number;
  mai: number;
  npv25: number;  // NPV at 2.5% discount
  npv35: number;  // NPV at 3.5% discount
  npv45: number;  // NPV at 4.5% discount
}

export interface ClimateImpact {
  growthChangePercent: number;
  droughtRiskLevel: 'low' | 'moderate' | 'high';
  stormExposure: 'low' | 'moderate' | 'high';
  beetlePressure: 'low' | 'moderate' | 'high' | 'very_high';
  recommendations: string[];
}

// ─── Demo Parcels ───────────────────────────────────────────────────────────

export const DEMO_PARCELS: ParcelData[] = [
  {
    id: 'p-growth-1',
    name: 'Norra Granbacken',
    species: 'spruce',
    siteIndex: 26,
    currentAge: 45,
    currentVolume: 185,
    area: 12.4,
    soilType: 'Frisk moränmark',
    speciesComposition: [
      { species: 'Gran', percent: 82 },
      { species: 'Björk', percent: 12 },
      { species: 'Tall', percent: 6 },
    ],
    latitude: 57.2,
    temperatureTrend: 0.35,
    precipitationTrend: 12,
  },
  {
    id: 'p-growth-2',
    name: 'Tallåsen',
    species: 'pine',
    siteIndex: 22,
    currentAge: 70,
    currentVolume: 220,
    area: 8.7,
    soilType: 'Torr sandig morän',
    speciesComposition: [
      { species: 'Tall', percent: 88 },
      { species: 'Gran', percent: 7 },
      { species: 'Björk', percent: 5 },
    ],
    latitude: 57.3,
    temperatureTrend: 0.35,
    precipitationTrend: 8,
  },
  {
    id: 'p-growth-3',
    name: 'Blandskogen Söder',
    species: 'mixed',
    siteIndex: 30,
    currentAge: 25,
    currentVolume: 65,
    area: 15.2,
    soilType: 'Fuktig sedimentmark',
    speciesComposition: [
      { species: 'Gran', percent: 55 },
      { species: 'Tall', percent: 25 },
      { species: 'Björk', percent: 15 },
      { species: 'Ek', percent: 5 },
    ],
    latitude: 57.1,
    temperatureTrend: 0.4,
    precipitationTrend: 15,
  },
];

// ─── Growth Functions ───────────────────────────────────────────────────────

/**
 * Chapman-Richards growth function, parameterised per species.
 * V(t) = Vmax * (1 - exp(-k * t))^p
 *
 * Parameters calibrated against Hägglund & Lundmark production tables
 * for southern Sweden (Götaland).
 */
function getSpeciesParams(species: Species, siteIndex: number) {
  // Vmax scales with site index; k and p tuned to match SLU tables
  switch (species) {
    case 'spruce':
      return {
        vmax: siteIndex * 28 + 50,          // ~778 for SI 26
        k: 0.018 + siteIndex * 0.0003,      // faster growth on better sites
        p: 2.8,
      };
    case 'pine':
      return {
        vmax: siteIndex * 22 + 30,          // ~514 for SI 22
        k: 0.015 + siteIndex * 0.00025,
        p: 2.5,
      };
    case 'mixed':
      // Weighted blend – mixed stands slightly lower than pure spruce
      return {
        vmax: siteIndex * 25 + 40,
        k: 0.017 + siteIndex * 0.00028,
        p: 2.65,
      };
  }
}

/**
 * Climate adjustment multiplier for growth rate.
 *
 * Based on research from SLU and SMHI:
 * - Moderate warming (+1-2°C) extends growing season → higher growth
 * - Higher warming (+3-5°C) introduces drought stress, especially for spruce
 * - Pine is more drought-tolerant than spruce
 * - Beetle pressure increases with temperature
 *
 * Returns a multiplier (1.0 = no change from standard tables)
 */
function getClimateMultiplier(
  species: Species,
  scenario: ClimateScenario,
  yearsFromNow: number,
  latitude: number,
): number {
  // Temperature increase projections (°C above baseline) for southern Sweden
  const tempIncrease: Record<ClimateScenario, (y: number) => number> = {
    rcp45: (y) => 0.02 * y * (1 - 0.003 * y),           // ~1.6°C at 80yr
    rcp60: (y) => 0.03 * y * (1 - 0.002 * y),           // ~2.4°C at 80yr
    rcp85: (y) => 0.045 * y * (1 - 0.0015 * y),         // ~3.6°C at 80yr
  };

  const deltaT = tempIncrease[scenario](yearsFromNow);

  // Growth season extension benefit: ~2% per °C (SLU estimates)
  const growthBenefit = deltaT * 0.02;

  // Drought stress penalty (species-dependent)
  // Spruce: drought-sensitive, penalty kicks in above 2°C
  // Pine: tolerant, penalty kicks in above 3°C
  // Mixed: intermediate
  const droughtThreshold = species === 'spruce' ? 2.0 : species === 'pine' ? 3.0 : 2.5;
  const droughtSensitivity = species === 'spruce' ? 0.035 : species === 'pine' ? 0.015 : 0.025;
  const droughtPenalty = deltaT > droughtThreshold
    ? (deltaT - droughtThreshold) * droughtSensitivity
    : 0;

  // Beetle mortality factor (mostly affects spruce)
  const beetleFactor = species === 'spruce' && deltaT > 1.5
    ? (deltaT - 1.5) * 0.008
    : species === 'mixed' && deltaT > 2.0
    ? (deltaT - 2.0) * 0.005
    : 0;

  // Southern latitude gets slightly more drought stress
  const latFactor = latitude < 58 ? 1.05 : 1.0;

  return Math.max(0.7, 1.0 + growthBenefit - (droughtPenalty + beetleFactor) * latFactor);
}

/**
 * Generate standard SLU yield table projection (no climate adjustment).
 */
export function generateStandardProjection(
  parcel: ParcelData,
  maxAge: number = 120,
): GrowthProjection[] {
  const params = getSpeciesParams(parcel.species, parcel.siteIndex);
  const projections: GrowthProjection[] = [];

  for (let age = 1; age <= maxAge; age++) {
    const volume = params.vmax * Math.pow(1 - Math.exp(-params.k * age), params.p);
    const mai = age > 0 ? volume / age : 0;
    const prevVolume = age > 1
      ? params.vmax * Math.pow(1 - Math.exp(-params.k * (age - 1)), params.p)
      : 0;
    const cai = volume - prevVolume;

    projections.push({
      year: new Date().getFullYear() + (age - parcel.currentAge),
      age,
      volume: Math.round(volume * 10) / 10,
      mai: Math.round(mai * 100) / 100,
      cai: Math.round(cai * 100) / 100,
    });
  }

  return projections;
}

/**
 * Generate climate-adjusted growth projection for a specific scenario.
 */
export function generateClimateProjection(
  parcel: ParcelData,
  scenario: ClimateScenario,
  maxAge: number = 120,
): GrowthProjection[] {
  const params = getSpeciesParams(parcel.species, parcel.siteIndex);
  const projections: GrowthProjection[] = [];
  const currentYear = new Date().getFullYear();

  for (let age = 1; age <= maxAge; age++) {
    const yearsFromNow = age - parcel.currentAge;
    const climateMult = yearsFromNow > 0
      ? getClimateMultiplier(parcel.species, scenario, yearsFromNow, parcel.latitude)
      : 1.0;

    // Apply climate multiplier to growth rate parameter
    const adjustedK = params.k * climateMult;
    const volume = params.vmax * Math.pow(1 - Math.exp(-adjustedK * age), params.p);
    const mai = age > 0 ? volume / age : 0;
    const prevVolume = age > 1
      ? params.vmax * Math.pow(1 - Math.exp(-adjustedK * (age - 1)), params.p)
      : 0;
    const cai = volume - prevVolume;

    projections.push({
      year: currentYear + (age - parcel.currentAge),
      age,
      volume: Math.round(volume * 10) / 10,
      mai: Math.round(mai * 100) / 100,
      cai: Math.round(cai * 100) / 100,
    });
  }

  return projections;
}

/**
 * Find optimal rotation age (where MAI is maximised).
 */
function findOptimalRotation(projections: GrowthProjection[]): {
  age: number;
  mai: number;
  volume: number;
} {
  let best = projections[0];
  for (const p of projections) {
    if (p.mai > best.mai) best = p;
  }
  return { age: best.age, mai: best.mai, volume: best.volume };
}

/**
 * Get all scenario results for a parcel.
 */
export function getAllScenarioResults(
  parcel: ParcelData,
  maxAge: number = 120,
): ScenarioResult[] {
  const scenarios: { key: ClimateScenario; label: string }[] = [
    { key: 'rcp45', label: 'RCP 4.5 — Conservative' },
    { key: 'rcp60', label: 'RCP 6.0 — Moderate' },
    { key: 'rcp85', label: 'RCP 8.5 — High Warming' },
  ];

  return scenarios.map(({ key, label }) => {
    const projections = generateClimateProjection(parcel, key, maxAge);
    const optimal = findOptimalRotation(projections);
    return {
      scenario: key,
      label,
      projections,
      optimalRotationAge: optimal.age,
      maxMai: optimal.mai,
      volumeAtOptimal: optimal.volume,
    };
  });
}

// ─── Rotation Analysis ──────────────────────────────────────────────────────

/**
 * Calculate Net Present Value for timber harvest at a given rotation age.
 * Uses Faustmann formula principles:
 *   NPV = (V(t) * price - costs) / (1 + r)^t
 *
 * Simplified with bare-land value approach.
 */
function calculateNPV(
  volume: number,
  rotationAge: number,
  discountRate: number,
): number {
  // Swedish timber price assumptions (SEK/m³sk)
  const pricePerM3 = 550; // blended sawlog/pulp price
  const harvestCostPerM3 = 120;
  const regenerationCost = 15000; // SEK/ha
  const netRevenue = volume * (pricePerM3 - harvestCostPerM3) - regenerationCost;

  // Faustmann: infinite rotation NPV = R / ((1+r)^t - 1)
  const factor = Math.pow(1 + discountRate, rotationAge) - 1;
  return factor > 0 ? netRevenue / factor : 0;
}

/**
 * Generate rotation analysis across the full range.
 */
export function analyzeRotations(
  parcel: ParcelData,
  scenario: ClimateScenario = 'rcp60',
  minAge: number = 40,
  maxAge: number = 120,
): RotationAnalysis[] {
  const projections = generateClimateProjection(parcel, scenario, maxAge);
  const results: RotationAnalysis[] = [];

  for (let age = minAge; age <= maxAge; age++) {
    const proj = projections.find((p) => p.age === age);
    if (!proj) continue;

    results.push({
      rotationAge: age,
      volume: proj.volume,
      mai: proj.mai,
      npv25: Math.round(calculateNPV(proj.volume, age, 0.025)),
      npv35: Math.round(calculateNPV(proj.volume, age, 0.035)),
      npv45: Math.round(calculateNPV(proj.volume, age, 0.045)),
    });
  }

  return results;
}

/**
 * Find the rotation age that maximizes NPV for a given discount rate.
 */
export function findOptimalNPVRotation(
  analyses: RotationAnalysis[],
  discountRate: '2.5' | '3.5' | '4.5' = '3.5',
): RotationAnalysis | undefined {
  const key = `npv${discountRate.replace('.', '')}` as 'npv25' | 'npv35' | 'npv45';
  let best: RotationAnalysis | undefined;
  for (const a of analyses) {
    if (!best || a[key] > best[key]) best = a;
  }
  return best;
}

// ─── Climate Impact Assessment ──────────────────────────────────────────────

/**
 * Assess climate impact on a parcel.
 */
export function assessClimateImpact(
  parcel: ParcelData,
): ClimateImpact {
  // Compare RCP 6.0 projection to standard at age 80
  const standard = generateStandardProjection(parcel, 120);
  const climate = generateClimateProjection(parcel, 'rcp60', 120);

  const stdVol80 = standard.find((p) => p.age === 80)?.volume ?? 0;
  const climVol80 = climate.find((p) => p.age === 80)?.volume ?? 0;
  const growthChangePercent = stdVol80 > 0
    ? Math.round(((climVol80 - stdVol80) / stdVol80) * 100 * 10) / 10
    : 0;

  // Drought risk based on species and climate trend
  const droughtRiskLevel: ClimateImpact['droughtRiskLevel'] =
    parcel.species === 'spruce' && parcel.precipitationTrend < 10
      ? 'high'
      : parcel.species === 'spruce'
      ? 'moderate'
      : 'low';

  // Storm exposure (simplified – higher site index = taller trees = more exposure)
  const stormExposure: ClimateImpact['stormExposure'] =
    parcel.siteIndex >= 28 ? 'high' : parcel.siteIndex >= 24 ? 'moderate' : 'low';

  // Beetle pressure
  const beetlePressure: ClimateImpact['beetlePressure'] =
    parcel.species === 'spruce' && parcel.temperatureTrend > 0.3
      ? 'very_high'
      : parcel.species === 'spruce'
      ? 'high'
      : parcel.species === 'mixed'
      ? 'moderate'
      : 'low';

  const recommendations: string[] = [];
  if (parcel.species === 'spruce' && droughtRiskLevel !== 'low') {
    recommendations.push('species_diversification');
  }
  if (beetlePressure === 'very_high' || beetlePressure === 'high') {
    recommendations.push('beetle_monitoring');
  }
  if (stormExposure === 'high') {
    recommendations.push('storm_adapted_thinning');
  }
  if (parcel.species === 'spruce' && parcel.siteIndex >= 26) {
    recommendations.push('consider_mixed_stands');
  }
  if (growthChangePercent > 5) {
    recommendations.push('shorter_rotation');
  }
  if (growthChangePercent < -5) {
    recommendations.push('species_change');
  }

  return {
    growthChangePercent,
    droughtRiskLevel,
    stormExposure,
    beetlePressure,
    recommendations,
  };
}
