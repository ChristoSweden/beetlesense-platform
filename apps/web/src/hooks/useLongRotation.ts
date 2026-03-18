/**
 * useLongRotation — Long-rotation economics calculation hook.
 *
 * NPV calculations for different rotation lengths (60-120 years),
 * growth models based on SLU Heureka-style tables, revenue stream
 * projections, and configurable economic parameters.
 *
 * References:
 * - SLU Heureka yield tables (southern/central Sweden)
 * - Faustmann (1849) Land Expectation Value
 * - Swedish spruce growth: ~5-8 m³/ha/year
 * - Timber NPV at 3% discount rate across rotation lengths
 */

import { useState, useMemo, useCallback } from 'react';
import {
  CARBON_COEFFICIENTS,
  getAgeModifier,
  getSiteIndexModifier,
  type TreeSpecies,
} from '@/services/carbonService';
import {
  estimateVolumePerHa,
} from '@/services/longRotationService';

// ─── Types ───

export type RotationLength = 60 | 80 | 100 | 120;

export interface RotationConfig {
  discountRate: number;       // decimal, e.g. 0.03
  timberPriceGrowth: number;  // annual % growth, e.g. 0.01
  carbonPriceGrowth: number;  // annual % growth, e.g. 0.02
  species: TreeSpecies;
  siteIndex: number;
  areaHa: number;
}

export interface RotationNPV {
  rotation: RotationLength;
  timberNPV: number;
  carbonNPV: number;
  biodiversityNPV: number;
  recreationNPV: number;
  huntingNPV: number;
  totalNPV: number;
  npvPerHa: number;
  /** Key financial metrics */
  totalHarvestVolume: number;
  avgTimberDiameter: number;  // cm
  sawlogFraction: number;     // 0-1
  totalCarbonStored: number;  // tonnes CO₂ at end
}

export interface TimelineEvent {
  year: number;
  age: number;
  type: 'plant' | 'thin' | 'harvest' | 'carbon_income' | 'biodiversity_payment';
  label: string;
  labelSv: string;
  revenueSEK: number;
  volumeM3?: number;
}

export interface GrowthPoint {
  age: number;
  volumePerHa: number;      // m³/ha
  mai: number;               // Mean Annual Increment m³/ha/yr
  cai: number;               // Current Annual Increment
  co2PerHa: number;          // tonnes CO₂/ha
  annualCarbonIncome: number; // SEK/ha/yr
}

export interface RotationComparison {
  rotations: RotationNPV[];
  bestRotation: RotationLength;
  gainVsBaseline: number;     // % gain of best over 80-year baseline
  gainAbsolute: number;       // SEK gain
  insight: string;
  insightSv: string;
}

// ─── Constants ───

const ROTATIONS: RotationLength[] = [60, 80, 100, 120];

/** Base timber prices SEK/m³ fub */
const TIMBER_PRICES: Record<TreeSpecies, { sawlog: number; pulpwood: number }> = {
  spruce: { sawlog: 750, pulpwood: 350 },
  pine:   { sawlog: 700, pulpwood: 320 },
  birch:  { sawlog: 550, pulpwood: 280 },
  mixed:  { sawlog: 650, pulpwood: 310 },
};

const HARVEST_COST = 180; // SEK/m³
const THINNING_COST = 234; // SEK/m³ (30% premium)
const REPLANT_COST_HA = 12_000; // SEK/ha

/** Carbon credit base price SEK/tonne */
const CARBON_PRICE_SEK = 800;

/** Non-timber values SEK/ha/year */
const HUNTING_LEASE = 55;
const BIODIVERSITY_PAYMENT = 1200;
const RECREATION_INCOME = 80;

/** Premium multiplier for large-dimension timber */
function dimensionPremium(age: number): number {
  if (age < 80) return 1.0;
  if (age < 100) return 1.0 + (age - 80) * 0.012;
  if (age < 120) return 1.24 + (age - 100) * 0.005;
  return 1.34;
}

/** Sawlog fraction by age */
function sawlogFrac(age: number): number {
  if (age < 30) return 0.1;
  if (age < 50) return 0.3 + (age - 30) * 0.015;
  if (age < 70) return 0.6 + (age - 50) * 0.01;
  if (age < 100) return 0.8 + (age - 70) * 0.003;
  return 0.89;
}

/** Thinning schedule for each rotation length */
function getThinnings(rotation: RotationLength): { age: number; fraction: number }[] {
  switch (rotation) {
    case 60:
      return [
        { age: 25, fraction: 0.20 },
        { age: 40, fraction: 0.20 },
      ];
    case 80:
      return [
        { age: 25, fraction: 0.20 },
        { age: 40, fraction: 0.20 },
        { age: 55, fraction: 0.15 },
      ];
    case 100:
      return [
        { age: 25, fraction: 0.15 },
        { age: 40, fraction: 0.15 },
        { age: 60, fraction: 0.15 },
        { age: 80, fraction: 0.10 },
      ];
    case 120:
      return [
        { age: 25, fraction: 0.15 },
        { age: 40, fraction: 0.15 },
        { age: 60, fraction: 0.12 },
        { age: 80, fraction: 0.10 },
        { age: 100, fraction: 0.08 },
      ];
  }
}

/** Biodiversity score multiplier by rotation length */
function biodiversityMultiplier(rotation: RotationLength): number {
  switch (rotation) {
    case 60:  return 0.3;
    case 80:  return 0.6;
    case 100: return 1.0;
    case 120: return 1.5;
  }
}

// ─── Core Calculations ───

function calculateRotationNPV(
  rotation: RotationLength,
  config: RotationConfig,
): RotationNPV {
  const { discountRate, timberPriceGrowth, carbonPriceGrowth, species, siteIndex, areaHa } = config;
  const prices = TIMBER_PRICES[species];
  const thinnings = getThinnings(rotation);
  const coeff = CARBON_COEFFICIENTS[species];
  const siMod = getSiteIndexModifier(siteIndex);

  let timberNPV = 0;
  let carbonNPV = 0;
  let huntingNPV = 0;
  let biodiversityNPV = 0;
  let recreationNPV = 0;
  let totalHarvestVolume = 0;

  // Replanting cost at year 0
  timberNPV -= REPLANT_COST_HA * areaHa;

  for (let yr = 1; yr <= rotation; yr++) {
    const df = 1 / Math.pow(1 + discountRate, yr);
    const tpMod = Math.pow(1 + timberPriceGrowth, yr);
    const cpMod = Math.pow(1 + carbonPriceGrowth, yr);

    // Thinning
    const thin = thinnings.find(t => t.age === yr);
    if (thin) {
      const vol = estimateVolumePerHa(yr, siteIndex, species) * thin.fraction * areaHa;
      const sf = sawlogFrac(yr) * 0.5; // less sawlog from thinning
      const rev = vol * (sf * prices.sawlog * tpMod + (1 - sf) * prices.pulpwood * tpMod - THINNING_COST);
      timberNPV += rev * df;
      totalHarvestVolume += vol;
    }

    // Carbon income (annual)
    const ageMod = getAgeModifier(yr);
    const annualCO2 = coeff.peakSequestration * ageMod * siMod * areaHa;
    const carbonRev = annualCO2 * CARBON_PRICE_SEK * cpMod;
    carbonNPV += carbonRev * df;

    // Non-timber (annual)
    huntingNPV += HUNTING_LEASE * areaHa * df;
    biodiversityNPV += BIODIVERSITY_PAYMENT * areaHa * biodiversityMultiplier(rotation) * df;
    recreationNPV += RECREATION_INCOME * areaHa * df;
  }

  // Final harvest
  const finalVol = estimateVolumePerHa(rotation, siteIndex, species) * areaHa;
  const sf = sawlogFrac(rotation);
  const prem = dimensionPremium(rotation);
  const tpMod = Math.pow(1 + timberPriceGrowth, rotation);
  const finalDf = 1 / Math.pow(1 + discountRate, rotation);
  const finalRev = finalVol * (sf * prices.sawlog * prem * tpMod + (1 - sf) * prices.pulpwood * tpMod - HARVEST_COST);
  timberNPV += finalRev * finalDf;
  totalHarvestVolume += finalVol;

  // Carbon stored at end
  let totalCO2 = 0;
  for (let a = 1; a <= rotation; a++) {
    totalCO2 += coeff.peakSequestration * getAgeModifier(a) * siMod;
  }
  totalCO2 *= areaHa;

  const totalNPV = timberNPV + carbonNPV + huntingNPV + biodiversityNPV + recreationNPV;

  return {
    rotation,
    timberNPV: Math.round(timberNPV),
    carbonNPV: Math.round(carbonNPV),
    biodiversityNPV: Math.round(biodiversityNPV),
    recreationNPV: Math.round(recreationNPV),
    huntingNPV: Math.round(huntingNPV),
    totalNPV: Math.round(totalNPV),
    npvPerHa: Math.round(totalNPV / areaHa),
    totalHarvestVolume: Math.round(totalHarvestVolume),
    avgTimberDiameter: Math.round(15 + rotation * 0.18),
    sawlogFraction: sawlogFrac(rotation),
    totalCarbonStored: Math.round(totalCO2),
  };
}

function buildTimeline(
  rotation: RotationLength,
  config: RotationConfig,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const { species, siteIndex, areaHa, timberPriceGrowth, carbonPriceGrowth } = config;
  const prices = TIMBER_PRICES[species];
  const thinnings = getThinnings(rotation);
  const coeff = CARBON_COEFFICIENTS[species];
  const siMod = getSiteIndexModifier(siteIndex);

  // Planting
  events.push({
    year: 0,
    age: 0,
    type: 'plant',
    label: 'Planting',
    labelSv: 'Plantering',
    revenueSEK: -(REPLANT_COST_HA * areaHa),
  });

  for (let yr = 1; yr <= rotation; yr++) {
    const tpMod = Math.pow(1 + timberPriceGrowth, yr);
    const cpMod = Math.pow(1 + carbonPriceGrowth, yr);

    // Thinning
    const thin = thinnings.find(t => t.age === yr);
    if (thin) {
      const vol = estimateVolumePerHa(yr, siteIndex, species) * thin.fraction * areaHa;
      const sf = sawlogFrac(yr) * 0.5;
      const rev = vol * (sf * prices.sawlog * tpMod + (1 - sf) * prices.pulpwood * tpMod - THINNING_COST);
      events.push({
        year: yr, age: yr, type: 'thin',
        label: `Thinning ${Math.round(vol)} m³`,
        labelSv: `Gallring ${Math.round(vol)} m³`,
        revenueSEK: Math.round(rev),
        volumeM3: Math.round(vol),
      });
    }

    // Carbon income every 5 years
    if (yr % 5 === 0) {
      const ageMod = getAgeModifier(yr);
      const annualCO2 = coeff.peakSequestration * ageMod * siMod * areaHa;
      const carbonRev = annualCO2 * CARBON_PRICE_SEK * cpMod;
      events.push({
        year: yr, age: yr, type: 'carbon_income',
        label: `Carbon credits ${Math.round(annualCO2)} t/yr`,
        labelSv: `Kolkrediter ${Math.round(annualCO2)} t/år`,
        revenueSEK: Math.round(carbonRev),
      });
    }

    // Biodiversity payments every 10 years for long rotations
    if (rotation >= 100 && yr % 10 === 0) {
      const bioRev = BIODIVERSITY_PAYMENT * areaHa * biodiversityMultiplier(rotation);
      events.push({
        year: yr, age: yr, type: 'biodiversity_payment',
        label: `Biodiversity subsidy`,
        labelSv: `Biodiversitetsstöd`,
        revenueSEK: Math.round(bioRev),
      });
    }
  }

  // Final harvest
  const finalVol = estimateVolumePerHa(rotation, siteIndex, species) * areaHa;
  const sf = sawlogFrac(rotation);
  const prem = dimensionPremium(rotation);
  const tpMod = Math.pow(1 + timberPriceGrowth, rotation);
  const finalRev = finalVol * (sf * prices.sawlog * prem * tpMod + (1 - sf) * prices.pulpwood * tpMod - HARVEST_COST);
  events.push({
    year: rotation, age: rotation, type: 'harvest',
    label: `Final harvest ${Math.round(finalVol)} m³`,
    labelSv: `Slutavverkning ${Math.round(finalVol)} m³`,
    revenueSEK: Math.round(finalRev),
    volumeM3: Math.round(finalVol),
  });

  return events;
}

function buildGrowthCurve(config: RotationConfig, maxAge: number = 130): GrowthPoint[] {
  const { species, siteIndex, areaHa: _areaHa } = config;
  const coeff = CARBON_COEFFICIENTS[species];
  const siMod = getSiteIndexModifier(siteIndex);
  const points: GrowthPoint[] = [];

  for (let age = 0; age <= maxAge; age += 5) {
    const vol = estimateVolumePerHa(age, siteIndex, species);
    const mai = age > 0 ? vol / age : 0;
    const cai = age > 0
      ? estimateVolumePerHa(age, siteIndex, species) - estimateVolumePerHa(age - 1, siteIndex, species)
      : 0;

    let co2 = 0;
    for (let a = 1; a <= age; a++) {
      co2 += coeff.peakSequestration * getAgeModifier(a) * siMod;
    }

    const ageMod = getAgeModifier(age);
    const annualCO2 = coeff.peakSequestration * ageMod * siMod;
    const annualCarbonIncome = annualCO2 * CARBON_PRICE_SEK;

    points.push({
      age,
      volumePerHa: Math.round(vol),
      mai: Math.round(mai * 10) / 10,
      cai: Math.max(0, Math.round(cai * 10) / 10),
      co2PerHa: Math.round(co2),
      annualCarbonIncome: Math.round(annualCarbonIncome),
    });
  }

  return points;
}

// ─── Hook ───

const DEFAULT_CONFIG: RotationConfig = {
  discountRate: 0.03,
  timberPriceGrowth: 0.01,
  carbonPriceGrowth: 0.02,
  species: 'spruce',
  siteIndex: 26,
  areaHa: 45,
};

export function useLongRotation(initialConfig?: Partial<RotationConfig>) {
  const [config, setConfig] = useState<RotationConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [selectedRotation, setSelectedRotation] = useState<RotationLength>(120);

  const updateConfig = useCallback((updates: Partial<RotationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // NPV for all rotation lengths
  const comparison = useMemo<RotationComparison>(() => {
    const rotations = ROTATIONS.map(r => calculateRotationNPV(r, config));
    const best = rotations.reduce((a, b) => a.totalNPV > b.totalNPV ? a : b);
    const baseline = rotations.find(r => r.rotation === 80)!;
    const gainPct = baseline.totalNPV > 0
      ? Math.round(((best.totalNPV - baseline.totalNPV) / baseline.totalNPV) * 100)
      : 0;
    const gainAbs = best.totalNPV - baseline.totalNPV;

    const insight = `${best.rotation}-year rotation yields ${gainPct}% more total value than 80-year baseline`;
    const insightSv = `${best.rotation}-årig omloppstid ger ${gainPct}% mer totalt värde än 80-årig baslinje`;

    return {
      rotations,
      bestRotation: best.rotation,
      gainVsBaseline: gainPct,
      gainAbsolute: gainAbs,
      insight,
      insightSv,
    };
  }, [config]);

  // Timeline for selected rotation
  const timeline = useMemo(
    () => buildTimeline(selectedRotation, config),
    [selectedRotation, config],
  );

  // Growth curve data
  const growthCurve = useMemo(
    () => buildGrowthCurve(config),
    [config],
  );

  // Selected rotation detail
  const selectedDetail = useMemo(
    () => comparison.rotations.find(r => r.rotation === selectedRotation)!,
    [comparison.rotations, selectedRotation],
  );

  return {
    config,
    updateConfig,
    selectedRotation,
    setSelectedRotation,
    comparison,
    timeline,
    growthCurve,
    selectedDetail,
    rotationOptions: ROTATIONS,
  };
}
