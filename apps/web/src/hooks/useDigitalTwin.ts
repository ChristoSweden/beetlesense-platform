/**
 * useDigitalTwin — Predictive Forest Digital Twin engine.
 *
 * Projects forest state from 2026 → 2080 using SLU growth models
 * (Chapman-Richards curves), RCP climate scenarios, and 4 management strategies.
 *
 * Growth model parameters from SLU Riksskogstaxeringen:
 *  - Gran (spruce): site index G28-G36, max MAI at age 60-80
 *  - Tall (pine):   site index T24-T30, max MAI at age 70-90
 *  - Climate sensitivity: spruce suffers above mean summer temp >18°C
 *  - Growth boost from warming: +10-20% growth for first +1°C, then declining
 *  - Drought mortality: exponential increase above 2 consecutive dry summers
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ─── Types ───

export type Species = 'gran' | 'tall' | 'björk' | 'ek' | 'bok' | 'douglasgran' | 'hybridlärk';

export type ScenarioId = 'bau' | 'aggressive' | 'conservation' | 'climate_adapted';

export type RCPScenario = '2.6' | '4.5' | '8.5';

export interface SpeciesState {
  species: Species;
  pct: number;
  volumePerHa: number; // m³/ha
  avgHeight: number;    // meters
  avgDiameter: number;  // cm DBH
  avgAge: number;       // years
  suitability: number;  // 0-1
}

export interface TimelineEvent {
  year: number;
  type: 'thinning' | 'harvest' | 'replanting' | 'climate_milestone' | 'beetle_risk' | 'storm_risk';
  label: string;
  scenarioId?: ScenarioId;
}

export interface ParcelSnapshot {
  parcelId: string;
  parcelName: string;
  year: number;
  totalVolumePerHa: number;
  speciesStates: SpeciesState[];
  dominantSpecies: Species;
  healthScore: number;        // 0-100
  healthConfidence: number;   // 0-1
  carbonTonnes: number;       // total for parcel
  carbonPerHa: number;
  biodiversityIndex: number;  // 0-1
  timberValueSEK: number;     // total for parcel
  timberValuePerHa: number;
  beetleRisk: number;         // 0-1
  stormRisk: number;          // 0-1
  droughtRisk: number;        // 0-1
  growingSeason: number;      // days
  meanSummerTemp: number;     // °C
}

export interface ScenarioData {
  id: ScenarioId;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  snapshots: Map<number, ParcelSnapshot[]>; // year → per-parcel snapshots
  cumulativeRevenueSEK: Map<number, number>;
  events: TimelineEvent[];
}

export interface ClimateProjection {
  year: number;
  tempChange: number;       // °C above baseline
  precipChangeWinter: number;  // % change
  precipChangeSummer: number;  // % change
  growingSeasonDays: number;
  frostFreeDays: number;
  rcp: RCPScenario;
  confidenceLow: number;
  confidenceHigh: number;
}

export interface DigitalTwinState {
  scenarios: ScenarioData[];
  climateProjections: Map<RCPScenario, ClimateProjection[]>;
  allEvents: TimelineEvent[];
  currentYear: number;
  selectedScenario: ScenarioId;
  selectedRCP: RCPScenario;
  isPlaying: boolean;
  playSpeed: number; // years per second
  setCurrentYear: (y: number) => void;
  setSelectedScenario: (s: ScenarioId) => void;
  setSelectedRCP: (r: RCPScenario) => void;
  togglePlay: () => void;
  setPlaySpeed: (s: number) => void;
  getSnapshotsForYear: (year: number, scenario?: ScenarioId) => ParcelSnapshot[];
  getAggregateForYear: (year: number, scenario?: ScenarioId) => AggregateSnapshot;
  isLoading: boolean;
}

export interface AggregateSnapshot {
  year: number;
  totalVolume: number;
  totalCarbon: number;
  totalTimberValue: number;
  avgHealthScore: number;
  avgBiodiversity: number;
  avgBeetleRisk: number;
  avgStormRisk: number;
  avgDroughtRisk: number;
}

// ─── Constants ───

const START_YEAR = 2026;
const END_YEAR = 2080;
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

// SLU Site index parameters (Chapman-Richards: V = A * (1 - e^(-k*age))^p)
const GROWTH_PARAMS: Record<string, { A: number; k: number; p: number; maxMAI_age: number; siteIndex: string }> = {
  gran: { A: 680, k: 0.025, p: 3.2, maxMAI_age: 70, siteIndex: 'G32' },
  tall: { A: 520, k: 0.020, p: 2.8, maxMAI_age: 80, siteIndex: 'T26' },
  björk: { A: 320, k: 0.035, p: 2.5, maxMAI_age: 50, siteIndex: 'B22' },
  ek: { A: 450, k: 0.012, p: 2.2, maxMAI_age: 120, siteIndex: 'E24' },
  bok: { A: 420, k: 0.014, p: 2.4, maxMAI_age: 100, siteIndex: 'Bok22' },
  douglasgran: { A: 750, k: 0.028, p: 3.0, maxMAI_age: 65, siteIndex: 'DG34' },
  hybridlärk: { A: 580, k: 0.032, p: 2.9, maxMAI_age: 55, siteIndex: 'HL28' },
};

// Climate sensitivity: how growth is modified by temperature change
function climateGrowthModifier(species: Species, tempChange: number): number {
  // Spruce is very sensitive — growth boost at +1°C, crash above +2°C
  if (species === 'gran') {
    if (tempChange <= 1) return 1 + 0.15 * tempChange;
    if (tempChange <= 2) return 1.15 - 0.10 * (tempChange - 1);
    return 1.05 - 0.15 * (tempChange - 2); // declining fast
  }
  // Pine is more resilient
  if (species === 'tall') {
    if (tempChange <= 1.5) return 1 + 0.12 * tempChange;
    return 1.18 - 0.05 * (tempChange - 1.5);
  }
  // Birch benefits from warmth
  if (species === 'björk') {
    return 1 + 0.10 * Math.min(tempChange, 3);
  }
  // Oak and beech thrive in warmer conditions
  if (species === 'ek' || species === 'bok') {
    return 1 + 0.12 * Math.min(tempChange, 3.5);
  }
  // Climate-adapted species do well
  if (species === 'douglasgran' || species === 'hybridlärk') {
    return 1 + 0.18 * Math.min(tempChange, 3);
  }
  return 1;
}

// Species suitability as climate changes (southern Sweden focus)
function speciesSuitability(species: Species, tempChange: number): number {
  const base: Record<Species, number> = {
    gran: 0.95, tall: 0.90, björk: 0.80, ek: 0.70,
    bok: 0.65, douglasgran: 0.60, hybridlärk: 0.55,
  };
  const sensitivity: Record<Species, number> = {
    gran: -0.20,       // declining strongly
    tall: -0.05,       // fairly stable
    björk: 0.02,       // slight increase
    ek: 0.08,          // increasing in south
    bok: 0.10,         // increasing in south
    douglasgran: 0.12, // great climate fit
    hybridlärk: 0.10,  // great climate fit
  };
  return Math.max(0.1, Math.min(1, base[species] + sensitivity[species] * tempChange));
}

// Timber prices SEK/m³ (projected, with inflation)
function timberPrice(species: Species, year: number): number {
  const basePrices: Record<Species, number> = {
    gran: 580, tall: 620, björk: 350, ek: 1200,
    bok: 800, douglasgran: 650, hybridlärk: 600,
  };
  // ~1.5% annual price increase
  const inflationFactor = Math.pow(1.015, year - 2026);
  return basePrices[species] * inflationFactor;
}

// Carbon conversion: ~0.5 tonnes CO2 per m³ standing timber (BEF * root)
function carbonFromVolume(volumeM3: number): number {
  return volumeM3 * 0.50;
}

// ─── RCP Climate Projections ───

function generateClimateProjections(): Map<RCPScenario, ClimateProjection[]> {
  const rcps: RCPScenario[] = ['2.6', '4.5', '8.5'];
  const result = new Map<RCPScenario, ClimateProjection[]>();

  const tempCurves: Record<RCPScenario, (y: number) => number> = {
    '2.6': (y) => 0.8 * (1 - Math.exp(-0.04 * (y - 2026))),
    '4.5': (y) => 2.5 * (1 - Math.exp(-0.025 * (y - 2026))),
    '8.5': (y) => 0.07 * (y - 2026), // linear ~3.8°C by 2080
  };

  for (const rcp of rcps) {
    const projections: ClimateProjection[] = YEARS.map((year) => {
      const t = year - 2026;
      const temp = tempCurves[rcp](year);
      return {
        year,
        tempChange: Math.round(temp * 100) / 100,
        precipChangeWinter: Math.round(temp * 4),    // +4% per °C winter
        precipChangeSummer: Math.round(-temp * 7),   // -7% per °C summer
        growingSeasonDays: Math.round(200 + temp * 8),
        frostFreeDays: Math.round(180 + temp * 10),
        rcp,
        confidenceLow: Math.max(0, temp - 0.3 - t * 0.005),
        confidenceHigh: temp + 0.3 + t * 0.005,
      };
    });
    result.set(rcp, projections);
  }

  return result;
}

// ─── Demo Parcel Initial States ───

interface ParcelInitial {
  id: string;
  name: string;
  areaHa: number;
  species: { species: Species; pct: number; age: number }[];
}

const DEMO_TWIN_PARCELS: ParcelInitial[] = [
  {
    id: 'p1', name: 'Norra Skogen', areaHa: 42.5,
    species: [
      { species: 'gran', pct: 65, age: 45 },
      { species: 'tall', pct: 25, age: 50 },
      { species: 'björk', pct: 10, age: 30 },
    ],
  },
  {
    id: 'p2', name: 'Ekbacken', areaHa: 18.3,
    species: [
      { species: 'ek', pct: 40, age: 80 },
      { species: 'björk', pct: 35, age: 35 },
      { species: 'gran', pct: 25, age: 40 },
    ],
  },
  {
    id: 'p3', name: 'Tallmon', areaHa: 67.1,
    species: [
      { species: 'tall', pct: 70, age: 55 },
      { species: 'gran', pct: 20, age: 40 },
      { species: 'björk', pct: 10, age: 25 },
    ],
  },
];

// ─── Scenario definitions ───

interface ScenarioConfig {
  id: ScenarioId;
  name: string;
  nameEn: string;
  description: string;
  color: string;
  harvestIntensity: number;      // 0-1, fraction of MAI harvested
  thinningInterval: number;      // years between thinning
  thinningIntensity: number;     // fraction removed per thinning
  replantSpecies: Species[];     // what to plant after harvest
  conservationBonus: number;     // biodiversity boost 0-0.3
}

const SCENARIO_CONFIGS: ScenarioConfig[] = [
  {
    id: 'bau', name: 'Normalt skogsbruk', nameEn: 'Business as usual',
    description: 'Traditionellt svenskt skogsbruk med gallring och slutavverkning enligt Skogsstyrelsens rekommendationer.',
    color: '#4ade80',
    harvestIntensity: 0.7, thinningInterval: 15, thinningIntensity: 0.25,
    replantSpecies: ['gran', 'tall'], conservationBonus: 0,
  },
  {
    id: 'aggressive', name: 'Intensiv avverkning', nameEn: 'Aggressive harvest',
    description: 'Maximera kort- till medelfristig intäkt. Kortare omloppstider, intensivare gallring.',
    color: '#f97316',
    harvestIntensity: 0.9, thinningInterval: 10, thinningIntensity: 0.35,
    replantSpecies: ['gran', 'tall'], conservationBonus: -0.1,
  },
  {
    id: 'conservation', name: 'Naturvårdsfokus', nameEn: 'Conservation focus',
    description: 'Prioritera biologisk mångfald, kollagring och ekosystemtjänster. Minimal avverkning.',
    color: '#06b6d4',
    harvestIntensity: 0.2, thinningInterval: 25, thinningIntensity: 0.15,
    replantSpecies: ['ek', 'björk', 'tall'], conservationBonus: 0.25,
  },
  {
    id: 'climate_adapted', name: 'Klimatanpassad', nameEn: 'Climate-adapted',
    description: 'Gradvis övergång till klimattåliga arter. Ersätt gran med douglasgran och hybridlärk i riskzoner.',
    color: '#a78bfa',
    harvestIntensity: 0.5, thinningInterval: 15, thinningIntensity: 0.20,
    replantSpecies: ['douglasgran', 'hybridlärk', 'tall', 'ek'], conservationBonus: 0.15,
  },
];

// ─── Growth simulation engine ───

function chapmanRichards(age: number, species: Species): number {
  const p = GROWTH_PARAMS[species] || GROWTH_PARAMS.gran;
  return p.A * Math.pow(1 - Math.exp(-p.k * age), p.p);
}

function heightFromVolume(volume: number, species: Species): number {
  // Approximate height-volume relationships
  const coeff: Record<string, number> = {
    gran: 0.065, tall: 0.070, björk: 0.080,
    ek: 0.055, bok: 0.058, douglasgran: 0.060, hybridlärk: 0.068,
  };
  const c = coeff[species] || 0.065;
  return Math.pow(volume * c, 0.45) + 5;
}

function diameterFromAge(age: number, species: Species): number {
  // Simple diameter-age relationship
  const rates: Record<string, number> = {
    gran: 0.38, tall: 0.35, björk: 0.42,
    ek: 0.28, bok: 0.30, douglasgran: 0.42, hybridlärk: 0.45,
  };
  const r = rates[species] || 0.35;
  return r * age + 3;
}

function simulateScenario(
  config: ScenarioConfig,
  parcels: ParcelInitial[],
  climateProj: ClimateProjection[],
): ScenarioData {
  const snapshots = new Map<number, ParcelSnapshot[]>();
  const cumulativeRevenue = new Map<number, number>();
  const events: TimelineEvent[] = [];
  let totalRevenue = 0;

  for (const year of YEARS) {
    const yearIdx = year - START_YEAR;
    const climate = climateProj[yearIdx];
    const parcelSnapshots: ParcelSnapshot[] = [];

    for (const parcel of parcels) {
      const speciesStates: SpeciesState[] = [];
      let totalVol = 0;

      for (const sp of parcel.species) {
        const age = sp.age + yearIdx;
        const baseVolume = chapmanRichards(age, sp.species);
        const climMod = climateGrowthModifier(sp.species, climate.tempChange);

        // Apply thinning and harvest reductions
        let volumeReduction = 1;
        const yearsSinceStart = yearIdx;

        // Thinning events
        if (yearsSinceStart > 0 && yearsSinceStart % config.thinningInterval === 0) {
          volumeReduction *= (1 - config.thinningIntensity);
          if (year <= END_YEAR && !events.find(e => e.year === year && e.type === 'thinning' && e.scenarioId === config.id)) {
            events.push({
              year, type: 'thinning',
              label: `Gallring ${parcel.name}`,
              scenarioId: config.id,
            });
          }
        }

        // Major harvest when approaching max MAI age (depends on scenario)
        const harvestAge = GROWTH_PARAMS[sp.species]?.maxMAI_age || 70;
        if (age > 0 && age % harvestAge < 1 && age >= harvestAge) {
          const harvestVol = baseVolume * climMod * (sp.pct / 100) * config.harvestIntensity;
          const revenue = harvestVol * timberPrice(sp.species, year) * parcel.areaHa;
          totalRevenue += revenue;
          volumeReduction *= (1 - config.harvestIntensity);
          if (!events.find(e => e.year === year && e.type === 'harvest' && e.scenarioId === config.id)) {
            events.push({
              year, type: 'harvest',
              label: `Slutavverkning ${parcel.name}`,
              scenarioId: config.id,
            });
          }
        }

        // Drought mortality for spruce
        let droughtPenalty = 1;
        if (sp.species === 'gran' && climate.precipChangeSummer < -10) {
          const drySeverity = Math.abs(climate.precipChangeSummer + 10) / 100;
          droughtPenalty = Math.max(0.6, 1 - drySeverity * 1.5);
        }

        const finalVolume = Math.max(5, baseVolume * climMod * volumeReduction * droughtPenalty);
        const suit = speciesSuitability(sp.species, climate.tempChange);

        // Adjust species percentage for climate-adapted scenario
        let adjustedPct = sp.pct;
        if (config.id === 'climate_adapted' && yearIdx > 10) {
          if (sp.species === 'gran') {
            adjustedPct = Math.max(10, sp.pct - yearIdx * 0.8);
          }
        }

        speciesStates.push({
          species: sp.species,
          pct: adjustedPct,
          volumePerHa: Math.round(finalVolume * 10) / 10,
          avgHeight: Math.round(heightFromVolume(finalVolume, sp.species) * 10) / 10,
          avgDiameter: Math.round(diameterFromAge(age, sp.species) * 10) / 10,
          avgAge: age,
          suitability: Math.round(suit * 100) / 100,
        });

        totalVol += finalVolume * (adjustedPct / 100);
      }

      // Add climate-adapted species for that scenario
      if (config.id === 'climate_adapted' && yearIdx > 10) {
        const granState = speciesStates.find(s => s.species === 'gran');
        if (granState && granState.pct < 65) {
          const freed = 65 - granState.pct; // rough approx from original
          const newAge = Math.max(1, yearIdx - 10);
          for (const newSp of ['douglasgran', 'hybridlärk'] as Species[]) {
            const vol = chapmanRichards(newAge, newSp) * climateGrowthModifier(newSp, climate.tempChange);
            const pctShare = freed / 2;
            if (!speciesStates.find(s => s.species === newSp)) {
              speciesStates.push({
                species: newSp,
                pct: Math.round(pctShare * 10) / 10,
                volumePerHa: Math.round(vol * 10) / 10,
                avgHeight: Math.round(heightFromVolume(vol, newSp) * 10) / 10,
                avgDiameter: Math.round(diameterFromAge(newAge, newSp) * 10) / 10,
                avgAge: newAge,
                suitability: Math.round(speciesSuitability(newSp, climate.tempChange) * 100) / 100,
              });
              totalVol += vol * (pctShare / 100);
            }
          }
        }
      }

      // Normalize percentages
      const totalPct = speciesStates.reduce((s, sp) => s + sp.pct, 0);
      if (totalPct > 0 && Math.abs(totalPct - 100) > 1) {
        speciesStates.forEach(sp => { sp.pct = Math.round(sp.pct / totalPct * 100 * 10) / 10; });
      }

      const dominant = speciesStates.reduce((a, b) => b.pct > a.pct ? b : a, speciesStates[0]);
      const carbonPerHa = carbonFromVolume(totalVol);
      const totalCarbon = carbonPerHa * parcel.areaHa;

      // Timber value
      const timberVal = speciesStates.reduce((sum, sp) => {
        return sum + sp.volumePerHa * (sp.pct / 100) * timberPrice(sp.species, year) * parcel.areaHa;
      }, 0);

      // Health score — affected by beetle risk, drought, species suitability
      const avgSuitability = speciesStates.reduce((s, sp) => s + sp.suitability * (sp.pct / 100), 0);
      const beetleRisk = sp_beetleRisk(speciesStates, climate);
      const stormRisk = sp_stormRisk(speciesStates, yearIdx);
      const droughtRisk = climate.precipChangeSummer < -10 ? Math.min(1, Math.abs(climate.precipChangeSummer) / 50) : 0.05;

      const health = Math.round(Math.max(20, Math.min(100,
        avgSuitability * 50 + 30 - beetleRisk * 30 - stormRisk * 10 - droughtRisk * 10 + config.conservationBonus * 10
      )));

      // Biodiversity index
      const speciesCount = speciesStates.filter(s => s.pct > 3).length;
      const shannon = -speciesStates.filter(s => s.pct > 0).reduce((s, sp) => {
        const p = sp.pct / 100;
        return s + (p > 0 ? p * Math.log(p) : 0);
      }, 0);
      const biodiversity = Math.min(1, Math.max(0,
        (shannon / 1.8) * 0.6 + (speciesCount / 6) * 0.2 + config.conservationBonus + avgSuitability * 0.1
      ));

      parcelSnapshots.push({
        parcelId: parcel.id,
        parcelName: parcel.name,
        year,
        totalVolumePerHa: Math.round(totalVol * 10) / 10,
        speciesStates,
        dominantSpecies: dominant.species,
        healthScore: health,
        healthConfidence: Math.max(0.5, 1 - yearIdx * 0.005),
        carbonTonnes: Math.round(totalCarbon),
        carbonPerHa: Math.round(carbonPerHa * 10) / 10,
        biodiversityIndex: Math.round(biodiversity * 100) / 100,
        timberValueSEK: Math.round(timberVal),
        timberValuePerHa: Math.round(timberVal / parcel.areaHa),
        beetleRisk: Math.round(beetleRisk * 100) / 100,
        stormRisk: Math.round(stormRisk * 100) / 100,
        droughtRisk: Math.round(droughtRisk * 100) / 100,
        growingSeason: climate.growingSeasonDays,
        meanSummerTemp: Math.round((16.5 + climate.tempChange) * 10) / 10,
      });
    }

    snapshots.set(year, parcelSnapshots);
    cumulativeRevenue.set(year, Math.round(totalRevenue));
  }

  // Add climate milestone events
  const climMilestones = [
    { temp: 1.0, label: '+1°C — Gran stressas, längre växtsäsong' },
    { temp: 2.0, label: '+2°C — Gran kritisk, ek/bok expanderar' },
    { temp: 3.0, label: '+3°C — Sydsvenskt klimat i Mellansverige' },
  ];
  for (const m of climMilestones) {
    const matchYear = climateProj.find(c => c.tempChange >= m.temp);
    if (matchYear) {
      events.push({ year: matchYear.year, type: 'climate_milestone', label: m.label });
    }
  }

  return {
    id: config.id,
    name: config.name,
    nameEn: config.nameEn,
    description: config.description,
    color: config.color,
    snapshots,
    cumulativeRevenueSEK: cumulativeRevenue,
    events,
  };
}

function sp_beetleRisk(species: SpeciesState[], climate: ClimateProjection): number {
  const sprucePct = species.filter(s => s.species === 'gran').reduce((s, sp) => s + sp.pct, 0);
  const tempFactor = Math.max(0, (climate.tempChange - 0.5) * 0.3);
  const droughtFactor = climate.precipChangeSummer < -10 ? Math.abs(climate.precipChangeSummer + 10) / 80 : 0;
  return Math.min(1, (sprucePct / 100) * 0.5 + tempFactor + droughtFactor);
}

function sp_stormRisk(species: SpeciesState[], yearIdx: number): number {
  const tallTrees = species.filter(s => s.avgHeight > 20);
  const heightFactor = tallTrees.length > 0 ? Math.min(1, tallTrees[0].avgHeight / 35) * 0.3 : 0.05;
  return Math.min(0.8, 0.05 + heightFactor + yearIdx * 0.002);
}

// ─── Hook ───

export function useDigitalTwin(): DigitalTwinState {
  const [currentYear, setCurrentYear] = useState(START_YEAR);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>('bau');
  const [selectedRCP, setSelectedRCP] = useState<RCPScenario>('4.5');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate all projections (memoized)
  const climateProjections = useMemo(() => generateClimateProjections(), []);

  const scenarios = useMemo(() => {
    const climProj = climateProjections.get(selectedRCP) || climateProjections.get('4.5')!;
    return SCENARIO_CONFIGS.map(config => simulateScenario(config, DEMO_TWIN_PARCELS, climProj));
  }, [selectedRCP, climateProjections]);

  // Merge all events
  const allEvents = useMemo(() => {
    const merged: TimelineEvent[] = [];
    for (const s of scenarios) {
      for (const e of s.events) {
        if (!e.scenarioId || e.scenarioId === selectedScenario) {
          merged.push(e);
        }
      }
    }
    return merged.sort((a, b) => a.year - b.year);
  }, [scenarios, selectedScenario]);

  // Loading simulation
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  // Play/pause animation
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setCurrentYear(prev => {
          if (prev >= END_YEAR) {
            setIsPlaying(false);
            return START_YEAR;
          }
          return prev + 1;
        });
      }, 1000 / playSpeed);
    } else {
      if (playRef.current) clearInterval(playRef.current);
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying, playSpeed]);

  const getSnapshotsForYear = useCallback((year: number, scenario?: ScenarioId): ParcelSnapshot[] => {
    const sid = scenario || selectedScenario;
    const s = scenarios.find(sc => sc.id === sid);
    return s?.snapshots.get(year) || [];
  }, [scenarios, selectedScenario]);

  const getAggregateForYear = useCallback((year: number, scenario?: ScenarioId): AggregateSnapshot => {
    const snapshots = getSnapshotsForYear(year, scenario);
    if (snapshots.length === 0) {
      return { year, totalVolume: 0, totalCarbon: 0, totalTimberValue: 0, avgHealthScore: 0, avgBiodiversity: 0, avgBeetleRisk: 0, avgStormRisk: 0, avgDroughtRisk: 0 };
    }
    return {
      year,
      totalVolume: snapshots.reduce((s, p) => s + p.totalVolumePerHa * DEMO_TWIN_PARCELS.find(pp => pp.id === p.parcelId)!.areaHa, 0),
      totalCarbon: snapshots.reduce((s, p) => s + p.carbonTonnes, 0),
      totalTimberValue: snapshots.reduce((s, p) => s + p.timberValueSEK, 0),
      avgHealthScore: Math.round(snapshots.reduce((s, p) => s + p.healthScore, 0) / snapshots.length),
      avgBiodiversity: Math.round(snapshots.reduce((s, p) => s + p.biodiversityIndex, 0) / snapshots.length * 100) / 100,
      avgBeetleRisk: Math.round(snapshots.reduce((s, p) => s + p.beetleRisk, 0) / snapshots.length * 100) / 100,
      avgStormRisk: Math.round(snapshots.reduce((s, p) => s + p.stormRisk, 0) / snapshots.length * 100) / 100,
      avgDroughtRisk: Math.round(snapshots.reduce((s, p) => s + p.droughtRisk, 0) / snapshots.length * 100) / 100,
    };
  }, [getSnapshotsForYear]);

  return {
    scenarios,
    climateProjections,
    allEvents,
    currentYear,
    selectedScenario,
    selectedRCP,
    isPlaying,
    playSpeed,
    setCurrentYear,
    setSelectedScenario,
    setSelectedRCP,
    togglePlay,
    setPlaySpeed,
    getSnapshotsForYear,
    getAggregateForYear,
    isLoading,
  };
}
