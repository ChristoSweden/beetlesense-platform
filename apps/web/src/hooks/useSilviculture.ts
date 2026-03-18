/**
 * useSilviculture — Silviculture Freedom management strategy hook.
 *
 * Provides management strategy definitions, economic projections,
 * parcel suitability scoring, and demo data for 4 strategies applied
 * to demo parcels.
 *
 * Strategies challenge the Stora Enso / Södra clearcut default by
 * showing owners that CCF, extended rotation, and conservation
 * approaches can deliver equal or higher total value.
 *
 * Economics based on:
 * - Skogforsk cost norms 2026
 * - Skogsstyrelsen Skogliga grunddata
 * - SLU Heureka yield tables
 * - Voluntary carbon market (Gold Standard / Verra)
 * - LONA-bidrag & Naturvårdsstöd (Skogsstyrelsen)
 */

import { useState, useMemo, useCallback } from 'react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// ─── Strategy Types ───

export type StrategyId = 'clearcut' | 'ccf' | 'extended' | 'conservation';

export interface Strategy {
  id: StrategyId;
  name: string;
  nameSv: string;
  shortName: string;
  description: string;
  descriptionSv: string;
  icon: string; // emoji
  rotationYears: [number, number] | null; // null = continuous
  harvestMethod: string;
  harvestMethodSv: string;
  /** Who recommends this? */
  recommendedBy: string;
  /** Key differentiator */
  tagline: string;
  taglineSv: string;
  color: string;
}

export interface IncomeSource {
  year: number;
  timber: number;
  carbon: number;
  subsidies: number;
  hunting: number;
  recreation: number;
  water: number;
  stormProtection: number;
  total: number;
}

export interface StrategyProjection {
  strategyId: StrategyId;
  /** 50-year income timeline */
  incomeTimeline: IncomeSource[];
  /** Total NPV over 50 years at 3% discount */
  totalNPV: number;
  /** NPV per hectare */
  npvPerHa: number;
  /** Annual average income SEK/ha */
  avgAnnualPerHa: number;
  /** Risk score 1-10 (10 = highest risk) */
  riskScore: number;
  /** Biodiversity score 1-10 */
  biodiversityScore: number;
  /** Carbon storage tonnes CO2/ha over 50 years */
  carbonStorage: number;
  /** Income variance coefficient (stability indicator) */
  incomeStability: number;
  /** Years until first income */
  yearsToFirstIncome: number;
}

export interface TotalValueBreakdown {
  strategyId: StrategyId;
  timberRevenue: number;
  carbonCredits: number;
  biodiversityPremium: number;
  huntingLease: number;
  recreationEcotourism: number;
  waterQuality: number;
  stormProtection: number;
  totalPerHaYear: number;
  /** Percentage beyond timber-only value */
  beyondTimberPct: number;
}

export interface ParcelSuitability {
  parcelId: string;
  parcelName: string;
  areaHa: number;
  species: string;
  scores: Record<StrategyId, number>; // 0-100
  recommended: StrategyId;
  reasoning: string;
  reasoningSv: string;
  whyNotClearcut: string;
  whyNotClearcutSv: string;
  interventions: ParcelIntervention[];
}

export interface ParcelIntervention {
  year: number;
  action: string;
  actionSv: string;
  details: string;
  detailsSv: string;
  estimatedCostSEK: number;
  estimatedRevenueSEK: number;
}

export interface CCFPlan {
  parcelId: string;
  /** Current diameter distribution */
  currentDistribution: DiameterClass[];
  /** Target reverse-J distribution */
  targetDistribution: DiameterClass[];
  /** Trees to remove per class */
  harvestPlan: DiameterClass[];
  /** Annual expected yield m3/ha/yr */
  annualYield: number;
  /** Annual income SEK/ha */
  annualIncome: number;
  /** Transition roadmap */
  transitionYears: number;
  transitionSteps: TransitionStep[];
}

export interface DiameterClass {
  diameterCm: number;
  treesPerHa: number;
}

export interface TransitionStep {
  year: number;
  action: string;
  actionSv: string;
  volumeM3: number;
  revenueSEK: number;
}

export interface RegulationItem {
  id: string;
  title: string;
  titleSv: string;
  description: string;
  descriptionSv: string;
  applicableStrategies: StrategyId[];
  severity: 'info' | 'warning' | 'required';
  link: string;
  legalReference: string;
}

// ─── Strategy Definitions ───

export const STRATEGIES: Strategy[] = [
  {
    id: 'clearcut',
    name: 'Clearcut Forestry',
    nameSv: 'Trakthyggesbruk',
    shortName: 'Clearcut',
    description: 'The Swedish industrial default: plant, grow 65-80 years, clearcut everything, replant. Maximizes volume throughput for mills but destroys habitat and leaves decades with zero income.',
    descriptionSv: 'Svensk industristandard: plantera, väx 65-80 år, slutavverka allt, plantera om. Maximerar volymflöde till bruk men förstör habitat och ger decennier utan inkomst.',
    icon: '🪓',
    rotationYears: [65, 80],
    harvestMethod: 'Clearcut (slutavverkning)',
    harvestMethodSv: 'Slutavverkning med markberedning',
    recommendedBy: 'Stora Enso, Södra, SCA',
    tagline: 'Maximum volume, minimum biodiversity',
    taglineSv: 'Maximal volym, minimal biologisk mångfald',
    color: '#ef4444',
  },
  {
    id: 'ccf',
    name: 'Continuous Cover Forestry',
    nameSv: 'Hyggesfritt skogsbruk (CCF)',
    shortName: 'CCF',
    description: 'Selective harvest every 5-10 years, maintaining continuous canopy cover. Steady income stream, preserved biodiversity, no regeneration costs. The approach Stora Enso never mentions.',
    descriptionSv: 'Selektiv avverkning var 5-10 år, bibehåller kontinuerligt krontäcke. Jämn inkomstström, bevarad biologisk mångfald, inga föryngringskostnader. Metoden Stora Enso aldrig nämner.',
    icon: '🌲',
    rotationYears: null,
    harvestMethod: 'Selective harvest (blädning/plockhuggning)',
    harvestMethodSv: 'Blädning och plockhuggning',
    recommendedBy: 'Pro Silva, Lübeck-modellen',
    tagline: 'Yearly income without destroying your forest',
    taglineSv: 'Årlig inkomst utan att förstöra din skog',
    color: '#4ade80',
  },
  {
    id: 'extended',
    name: 'Extended Rotation',
    nameSv: 'Förlängd omloppstid',
    shortName: 'Extended',
    description: '100-120 year rotation producing premium large-dimension timber worth 30-50% more per cubic meter. Patience rewarded with quality pricing that industrial forestry ignores.',
    descriptionSv: '100-120 års omloppstid som ger premiummvirke av stora dimensioner värt 30-50% mer per kubikmeter. Tålamod belönas med kvalitetspriser som industriellt skogsbruk ignorerar.',
    icon: '🌳',
    rotationYears: [100, 120],
    harvestMethod: 'Clearcut at maturity with thinnings',
    harvestMethodSv: 'Slutavverkning vid mognad med gallringar',
    recommendedBy: 'SLU researchers, premium sawmills',
    tagline: 'Premium timber, premium price',
    taglineSv: 'Premiumvirke, premiumpris',
    color: '#fbbf24',
  },
  {
    id: 'conservation',
    name: 'Conservation with Income',
    nameSv: 'Naturvård med intäkt',
    shortName: 'Conservation',
    description: 'Biodiversity-focused management with income from carbon credits, subsidies, hunting leases, and ecotourism. Generates income while building ecological value and climate resilience.',
    descriptionSv: 'Biodiversitetsfokuserad skötsel med intäkter från kolkrediter, bidrag, jaktarrende och ekoturism. Genererar inkomster samtidigt som ekologiskt värde och klimatresiliens byggs.',
    icon: '🦌',
    rotationYears: null,
    harvestMethod: 'Minimal selective harvest, conservation focus',
    harvestMethodSv: 'Minimal selektiv avverkning, naturvårdsfokus',
    recommendedBy: 'Naturskyddsföreningen, WWF',
    tagline: 'Your forest is worth more standing',
    taglineSv: 'Din skog är värd mer stående',
    color: '#a78bfa',
  },
];

// ─── Economic Projections Generator ───

const DISCOUNT_RATE = 0.03;

function generateClearcutTimeline(areaHa: number): IncomeSource[] {
  const timeline: IncomeSource[] = [];
  for (let y = 1; y <= 50; y++) {
    const hunting = 55 * areaHa;
    const water = 10 * areaHa;
    const stormProtection = 15 * areaHa;
    let timber = 0;
    const carbon = 3 * 600 * areaHa; // low carbon credit (managed plantation)
    const subsidies = 0;
    const recreation = 20 * areaHa;

    // Thinning at year 25, 40
    if (y === 25) timber = 40 * 300 * areaHa; // ~40 m3/ha at 300 SEK net
    if (y === 40) timber = 50 * 320 * areaHa;

    // No final harvest within 50 years if starting fresh (65-80 yr rotation)
    // But if existing 30yr stand, harvest at year 40-50
    // We model a mid-rotation scenario: thinnings only

    const total = timber + carbon + subsidies + hunting + recreation + water + stormProtection;
    timeline.push({ year: y, timber, carbon, subsidies, hunting, recreation, water, stormProtection, total });
  }
  return timeline;
}

function generateCCFTimeline(areaHa: number): IncomeSource[] {
  const timeline: IncomeSource[] = [];
  for (let y = 1; y <= 50; y++) {
    const hunting = 80 * areaHa; // better habitat = more game
    const water = 25 * areaHa;
    const stormProtection = 30 * areaHa; // continuous cover = better windbreak
    const recreation = 40 * areaHa;
    const carbon = 8 * 800 * areaHa; // higher carbon storage

    // Selective harvest every 5-7 years: 15-25 m3/ha
    let timber = 0;
    if (y % 6 === 0) {
      timber = 20 * 220 * areaHa; // 20 m3/ha at 220 SEK/m3 net (smaller dimensions)
    }

    const subsidies = y % 5 === 0 ? 500 * areaHa : 0; // occasional environmental subsidy
    const total = timber + carbon + subsidies + hunting + recreation + water + stormProtection;
    timeline.push({ year: y, timber, carbon, subsidies, hunting, recreation, water, stormProtection, total });
  }
  return timeline;
}

function generateExtendedTimeline(areaHa: number): IncomeSource[] {
  const timeline: IncomeSource[] = [];
  for (let y = 1; y <= 50; y++) {
    const hunting = 65 * areaHa;
    const water = 15 * areaHa;
    const stormProtection = 20 * areaHa;
    const recreation = 30 * areaHa;
    const carbon = 10 * 900 * areaHa; // large trees = high carbon
    const subsidies = 0;

    // Thinnings at 25, 40, 60, 80 — within our 50yr window: 25 and 40
    let timber = 0;
    if (y === 25) timber = 35 * 280 * areaHa;
    if (y === 40) timber = 45 * 350 * areaHa; // better quality = higher price

    const total = timber + carbon + subsidies + hunting + recreation + water + stormProtection;
    timeline.push({ year: y, timber, carbon, subsidies, hunting, recreation, water, stormProtection, total });
  }
  return timeline;
}

function generateConservationTimeline(areaHa: number): IncomeSource[] {
  const timeline: IncomeSource[] = [];
  for (let y = 1; y <= 50; y++) {
    const hunting = 120 * areaHa; // premium hunting lease (rich biodiversity)
    const water = 40 * areaHa; // excellent water services
    const stormProtection = 35 * areaHa;
    const recreation = 80 * areaHa; // ecotourism potential
    const carbon = 12 * 1000 * areaHa; // maximum sequestration
    const subsidies = 3000 * areaHa; // LONA-bidrag, naturvårdsstöd annual
    const timber = y % 10 === 0 ? 8 * 400 * areaHa : 0; // minimal selective harvest

    const total = timber + carbon + subsidies + hunting + recreation + water + stormProtection;
    timeline.push({ year: y, timber, carbon, subsidies, hunting, recreation, water, stormProtection, total });
  }
  return timeline;
}

function calculateProjection(
  strategyId: StrategyId,
  areaHa: number,
): StrategyProjection {
  const generators: Record<StrategyId, (ha: number) => IncomeSource[]> = {
    clearcut: generateClearcutTimeline,
    ccf: generateCCFTimeline,
    extended: generateExtendedTimeline,
    conservation: generateConservationTimeline,
  };

  const incomeTimeline = generators[strategyId](areaHa);

  let totalNPV = 0;
  const annualTotals: number[] = [];
  for (const entry of incomeTimeline) {
    const df = 1 / Math.pow(1 + DISCOUNT_RATE, entry.year);
    totalNPV += entry.total * df;
    annualTotals.push(entry.total);
  }

  const avgAnnual = annualTotals.reduce((a, b) => a + b, 0) / annualTotals.length;
  const variance = annualTotals.reduce((sum, v) => sum + Math.pow(v - avgAnnual, 2), 0) / annualTotals.length;
  const stdDev = Math.sqrt(variance);
  const cv = avgAnnual > 0 ? stdDev / avgAnnual : 0;

  const riskScores: Record<StrategyId, number> = { clearcut: 7, ccf: 3, extended: 5, conservation: 2 };
  const bioScores: Record<StrategyId, number> = { clearcut: 2, ccf: 7, extended: 5, conservation: 9 };
  const carbonScores: Record<StrategyId, number> = { clearcut: 80, ccf: 220, extended: 280, conservation: 350 };
  const firstIncome: Record<StrategyId, number> = { clearcut: 25, ccf: 6, extended: 25, conservation: 1 };

  return {
    strategyId,
    incomeTimeline,
    totalNPV: Math.round(totalNPV),
    npvPerHa: Math.round(totalNPV / areaHa),
    avgAnnualPerHa: Math.round(avgAnnual / areaHa),
    riskScore: riskScores[strategyId],
    biodiversityScore: bioScores[strategyId],
    carbonStorage: carbonScores[strategyId],
    incomeStability: Math.round((1 - Math.min(cv, 1)) * 100),
    yearsToFirstIncome: firstIncome[strategyId],
  };
}

// ─── Total Value Calculator ───

function calculateTotalValue(strategyId: StrategyId): TotalValueBreakdown {
  const values: Record<StrategyId, Omit<TotalValueBreakdown, 'totalPerHaYear' | 'beyondTimberPct'>> = {
    clearcut: {
      strategyId: 'clearcut',
      timberRevenue: 3200,
      carbonCredits: 1800,
      biodiversityPremium: 0,
      huntingLease: 55,
      recreationEcotourism: 20,
      waterQuality: 10,
      stormProtection: 15,
    },
    ccf: {
      strategyId: 'ccf',
      timberRevenue: 2400,
      carbonCredits: 6400,
      biodiversityPremium: 500,
      huntingLease: 80,
      recreationEcotourism: 40,
      waterQuality: 25,
      stormProtection: 30,
    },
    extended: {
      strategyId: 'extended',
      timberRevenue: 3800,
      carbonCredits: 9000,
      biodiversityPremium: 200,
      huntingLease: 65,
      recreationEcotourism: 30,
      waterQuality: 15,
      stormProtection: 20,
    },
    conservation: {
      strategyId: 'conservation',
      timberRevenue: 640,
      carbonCredits: 12000,
      biodiversityPremium: 3000,
      huntingLease: 120,
      recreationEcotourism: 80,
      waterQuality: 40,
      stormProtection: 35,
    },
  };

  const v = values[strategyId];
  const total = v.timberRevenue + v.carbonCredits + v.biodiversityPremium +
    v.huntingLease + v.recreationEcotourism + v.waterQuality + v.stormProtection;
  const beyondTimber = total > 0 ? Math.round(((total - v.timberRevenue) / total) * 100) : 0;

  return { ...v, totalPerHaYear: Math.round(total), beyondTimberPct: beyondTimber };
}

// ─── Parcel Suitability ───

function scoreParcel(parcel: DemoParcel): ParcelSuitability {
  const sprucePct = parcel.species_mix.find(s => s.species === 'Spruce')?.pct ?? 0;
  const pinePct = parcel.species_mix.find(s => s.species === 'Pine')?.pct ?? 0;
  const oakPct = parcel.species_mix.find(s => s.species === 'Oak')?.pct ?? 0;
  const birchPct = parcel.species_mix.find(s => s.species === 'Birch')?.pct ?? 0;
  const isWetSoil = parcel.soil_type === 'Peat';
  const isHighElevation = parcel.elevation_m > 280;

  // Clearcut score: favors large spruce monocultures on flat moraine
  const clearcutScore = Math.min(100, Math.round(
    sprucePct * 0.8 + pinePct * 0.5 +
    (parcel.area_hectares > 30 ? 20 : 10) +
    (parcel.soil_type === 'Moraine' ? 15 : 5) -
    (isWetSoil ? 30 : 0)
  ));

  // CCF score: favors mixed species, moderate area, any terrain
  const ccfScore = Math.min(100, Math.round(
    (100 - sprucePct) * 0.3 + // diversity bonus
    (birchPct + oakPct) * 0.5 +
    sprucePct * 0.3 +
    pinePct * 0.4 +
    (parcel.area_hectares > 15 ? 20 : 30) + // works on smaller parcels
    (isHighElevation ? 10 : 15) +
    15 // base suitability
  ));

  // Extended rotation: favors spruce/pine on good soil, large parcels
  const extendedScore = Math.min(100, Math.round(
    sprucePct * 0.5 + pinePct * 0.6 +
    (parcel.area_hectares > 40 ? 25 : 10) +
    (parcel.soil_type === 'Sandy moraine' ? 20 : 10) +
    (isHighElevation ? 5 : 15)
  ));

  // Conservation: favors mixed/deciduous, wet soils, high biodiversity potential
  const conservationScore = Math.min(100, Math.round(
    oakPct * 1.2 + birchPct * 0.8 +
    (isWetSoil ? 30 : 0) +
    (parcel.status === 'at_risk' || parcel.status === 'infested' ? 20 : 5) +
    (100 - sprucePct) * 0.3 +
    15
  ));

  const scores: Record<StrategyId, number> = {
    clearcut: clearcutScore,
    ccf: ccfScore,
    extended: extendedScore,
    conservation: conservationScore,
  };

  const recommended = (Object.entries(scores) as [StrategyId, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const reasonings: Record<string, Record<StrategyId, { en: string; sv: string }>> = {
    [parcel.id]: {
      clearcut: {
        en: `${parcel.name} has ${sprucePct}% spruce suitable for clearcut rotation, but consider the income gap during regeneration.`,
        sv: `${parcel.name} har ${sprucePct}% gran lämplig för trakthyggesbruk, men beakta inkomstglappet under föryngring.`,
      },
      ccf: {
        en: `${parcel.name}'s species mix (${parcel.species_mix.map(s => `${s.pct}% ${s.species}`).join(', ')}) is ideal for continuous cover forestry with steady selective harvests.`,
        sv: `${parcel.name}s artmix (${parcel.species_mix.map(s => `${s.pct}% ${s.species}`).join(', ')}) är idealisk för hyggesfritt med jämna plockhuggningar.`,
      },
      extended: {
        en: `${parcel.name}'s ${parcel.soil_type.toLowerCase()} soil supports excellent growth for premium large-dimension timber over 100+ years.`,
        sv: `${parcel.name}s ${parcel.soil_type.toLowerCase()}-jord ger utmärkt tillväxt för premiumvirke av stora dimensioner över 100+ år.`,
      },
      conservation: {
        en: `${parcel.name} has high biodiversity potential with ${oakPct + birchPct}% deciduous species. Carbon credits and subsidies can exceed timber revenue.`,
        sv: `${parcel.name} har hög biodiversitetspotential med ${oakPct + birchPct}% lövträd. Kolkrediter och bidrag kan överstiga virkesintäkter.`,
      },
    },
  };

  const whyNotClearcut = recommended !== 'clearcut'
    ? `Trakthyggesbruk ger ${parcel.name} en poäng på bara ${clearcutScore}/100. ${
      sprucePct < 50
        ? `Med bara ${sprucePct}% gran saknas den monokulturella grund som krävs.`
        : `Trots ${sprucePct}% gran ger alternativa strategier högre totalvärde tack vare kolkrediter, jaktarrende och biodiversitetsstöd.`
    } Dessutom innebär kalavverkning 20-30 års inkomstglapp.`
    : 'Trakthyggesbruk har högst poäng för denna fastighet, men överväg ändå totalvärdet med alternativa strategier.';

  const whyNotClearcutEn = recommended !== 'clearcut'
    ? `Clearcut scores only ${clearcutScore}/100 for ${parcel.name}. ${
      sprucePct < 50
        ? `With only ${sprucePct}% spruce, it lacks the monoculture base required.`
        : `Despite ${sprucePct}% spruce, alternative strategies yield higher total value through carbon credits, hunting leases, and biodiversity subsidies.`
    } Clearcut also means a 20-30 year income gap.`
    : 'Clearcut scores highest for this parcel, but consider total value from alternative strategies.';

  // Generate 20-year intervention timeline
  const interventions = generateInterventions(parcel, recommended);

  return {
    parcelId: parcel.id,
    parcelName: parcel.name,
    areaHa: parcel.area_hectares,
    species: parcel.species_mix.map(s => `${s.pct}% ${s.species}`).join(', '),
    scores,
    recommended,
    reasoning: reasonings[parcel.id]?.[recommended]?.en ?? 'Analysis based on species mix, soil, and terrain.',
    reasoningSv: reasonings[parcel.id]?.[recommended]?.sv ?? 'Analys baserad på artmix, jord och terräng.',
    whyNotClearcut: whyNotClearcutEn,
    whyNotClearcutSv: whyNotClearcut,
    interventions,
  };
}

function generateInterventions(parcel: DemoParcel, strategy: StrategyId): ParcelIntervention[] {
  const ha = parcel.area_hectares;

  if (strategy === 'ccf') {
    return [
      { year: 1, action: 'Stand assessment', actionSv: 'Beståndsinventering', details: 'Map diameter distribution and identify target trees', detailsSv: 'Kartlägg diameterfördelning och identifiera målträd', estimatedCostSEK: 5000, estimatedRevenueSEK: 0 },
      { year: 2, action: 'First selective harvest', actionSv: 'Första plockhuggning', details: `Remove ~15 m³/ha of mature trees, keeping diverse structure`, detailsSv: 'Avverka ~15 m³/ha mogna träd, bibehåll varierad struktur', estimatedCostSEK: Math.round(ha * 15 * 180), estimatedRevenueSEK: Math.round(ha * 15 * 350) },
      { year: 5, action: 'Natural regeneration check', actionSv: 'Kontroll naturlig föryngring', details: 'Assess natural seedling establishment in canopy gaps', detailsSv: 'Bedöm naturlig plantuppslag i luckor', estimatedCostSEK: 3000, estimatedRevenueSEK: 0 },
      { year: 8, action: 'Second selective harvest', actionSv: 'Andra plockhuggning', details: 'Harvest 12-18 m³/ha targeting poor-form and suppressed trees', detailsSv: 'Avverka 12-18 m³/ha av dålig form och undertryckta träd', estimatedCostSEK: Math.round(ha * 15 * 180), estimatedRevenueSEK: Math.round(ha * 15 * 370) },
      { year: 10, action: 'Carbon credit certification', actionSv: 'Kolkreditscertifiering', details: 'Apply for voluntary carbon credit program (Gold Standard)', detailsSv: 'Ansök om frivilligt kolkreditprogram (Gold Standard)', estimatedCostSEK: 15000, estimatedRevenueSEK: Math.round(ha * 8 * 800) },
      { year: 14, action: 'Third selective harvest', actionSv: 'Tredje plockhuggning', details: 'Continue shaping reverse-J diameter distribution', detailsSv: 'Fortsätt forma omvänd J-diameterfördelning', estimatedCostSEK: Math.round(ha * 15 * 185), estimatedRevenueSEK: Math.round(ha * 15 * 390) },
      { year: 20, action: 'CCF transition complete', actionSv: 'Hyggesfritt övergång klar', details: 'Full reverse-J distribution achieved, stable annual income', detailsSv: 'Full omvänd J-fördelning uppnådd, stabil årlig inkomst', estimatedCostSEK: 0, estimatedRevenueSEK: Math.round(ha * 18 * 400) },
    ];
  }

  if (strategy === 'extended') {
    return [
      { year: 1, action: 'Growth assessment', actionSv: 'Tillväxtbedömning', details: 'Evaluate site index and growth potential for extended rotation', detailsSv: 'Utvärdera ståndortsindex och tillväxtpotential för förlängd omloppstid', estimatedCostSEK: 4000, estimatedRevenueSEK: 0 },
      { year: 5, action: 'First thinning', actionSv: 'Första gallring', details: 'Remove 20% volume, favor best stems for premium growth', detailsSv: 'Avverka 20% volym, gynna bästa stammar för premiumtillväxt', estimatedCostSEK: Math.round(ha * 30 * 180), estimatedRevenueSEK: Math.round(ha * 30 * 280) },
      { year: 10, action: 'Quality pruning', actionSv: 'Kvalitetsstamkvistning', details: 'Prune selected crop trees to 6m for knot-free timber', detailsSv: 'Stamkvista utvalda huvudstammar till 6m för kvistfritt virke', estimatedCostSEK: Math.round(ha * 1500), estimatedRevenueSEK: 0 },
      { year: 15, action: 'Second thinning', actionSv: 'Andra gallring', details: 'Remove 15% volume, opening canopy for remaining premium trees', detailsSv: 'Avverka 15% volym, öppna kronan för kvarvarande premiumträd', estimatedCostSEK: Math.round(ha * 25 * 185), estimatedRevenueSEK: Math.round(ha * 25 * 350) },
      { year: 20, action: 'Interim assessment', actionSv: 'Mellanlägesbedömning', details: 'Measure diameter growth, reassess premium timber timeline', detailsSv: 'Mät diametertillväxt, omvärdera premiumvirke tidslinje', estimatedCostSEK: 5000, estimatedRevenueSEK: 0 },
    ];
  }

  if (strategy === 'conservation') {
    return [
      { year: 1, action: 'Biodiversity inventory', actionSv: 'Biodiversitetsinventering', details: 'Map key habitats, protected species, dead wood volumes', detailsSv: 'Kartlägg nyckelbiotoper, skyddade arter, död ved-volymer', estimatedCostSEK: 8000, estimatedRevenueSEK: 0 },
      { year: 1, action: 'Apply for LONA-bidrag', actionSv: 'Ansök om LONA-bidrag', details: 'Local nature conservation subsidy from Naturvårdsverket', detailsSv: 'Lokalt naturvårdsbidrag från Naturvårdsverket', estimatedCostSEK: 2000, estimatedRevenueSEK: Math.round(ha * 2000) },
      { year: 2, action: 'Hunting lease agreement', actionSv: 'Jaktarrendeavtal', details: 'Premium hunting lease for älg, kronhjort, vildsvin', detailsSv: 'Premiumjaktarrende för älg, kronhjort, vildsvin', estimatedCostSEK: 0, estimatedRevenueSEK: Math.round(ha * 120) },
      { year: 3, action: 'Carbon credit registration', actionSv: 'Kolkreditsregistrering', details: 'Register with Verra VCS or Gold Standard for carbon credits', detailsSv: 'Registrera hos Verra VCS eller Gold Standard för kolkrediter', estimatedCostSEK: 20000, estimatedRevenueSEK: Math.round(ha * 12 * 1000) },
      { year: 5, action: 'Habitat restoration', actionSv: 'Habitatrestaurering', details: 'Create dead wood structures, restore wetland buffers', detailsSv: 'Skapa död ved-strukturer, återställ våtmarksbuffrar', estimatedCostSEK: Math.round(ha * 800), estimatedRevenueSEK: 0 },
      { year: 8, action: 'Ecotourism development', actionSv: 'Ekoturismutveckling', details: 'Trail system, bird hides, overnight cabins', detailsSv: 'Ledsystem, fågelgömslen, övernattningsstugor', estimatedCostSEK: 50000, estimatedRevenueSEK: Math.round(ha * 80) },
      { year: 10, action: 'Naturvårdsstöd renewal', actionSv: 'Naturvårdsstöd förnyelse', details: 'Renew Skogsstyrelsen conservation agreement for next 10 years', detailsSv: 'Förnya Skogsstyrelsens naturvårdsavtal för nästa 10 år', estimatedCostSEK: 0, estimatedRevenueSEK: Math.round(ha * 5000) },
      { year: 15, action: 'Light selective harvest', actionSv: 'Lätt plockhuggning', details: 'Minimal harvest of mature trees, maintaining structure', detailsSv: 'Minimal avverkning av mogna träd, bibehåll struktur', estimatedCostSEK: Math.round(ha * 8 * 180), estimatedRevenueSEK: Math.round(ha * 8 * 400) },
      { year: 20, action: 'Full ecosystem value assessment', actionSv: 'Full ekosystemvärdering', details: 'Comprehensive valuation of all ecosystem services', detailsSv: 'Heltäckande värdering av alla ekosystemtjänster', estimatedCostSEK: 10000, estimatedRevenueSEK: 0 },
    ];
  }

  // Clearcut default
  return [
    { year: 1, action: 'Soil scarification', actionSv: 'Markberedning', details: 'Mechanical site preparation for planting', detailsSv: 'Mekanisk markberedning för plantering', estimatedCostSEK: Math.round(ha * 3500), estimatedRevenueSEK: 0 },
    { year: 2, action: 'Planting', actionSv: 'Plantering', details: 'Plant 2,000-2,500 seedlings/ha', detailsSv: 'Plantera 2 000-2 500 plantor/ha', estimatedCostSEK: Math.round(ha * 12000), estimatedRevenueSEK: 0 },
    { year: 8, action: 'Cleaning', actionSv: 'Röjning', details: 'Remove competing vegetation', detailsSv: 'Ta bort konkurrerande vegetation', estimatedCostSEK: Math.round(ha * 4000), estimatedRevenueSEK: 0 },
    { year: 15, action: 'Pre-commercial thinning', actionSv: 'Ungskogsröjning', details: 'Reduce to 1,500-2,000 stems/ha', detailsSv: 'Reducera till 1 500-2 000 stammar/ha', estimatedCostSEK: Math.round(ha * 3500), estimatedRevenueSEK: 0 },
    { year: 25, action: 'First commercial thinning', actionSv: 'Första gallring', details: 'First timber income after 25 years', detailsSv: 'Första virkesintäkt efter 25 år', estimatedCostSEK: Math.round(ha * 40 * 180), estimatedRevenueSEK: Math.round(ha * 40 * 300) },
  ];
}

// ─── CCF Plan Generator ───

function generateCCFPlan(parcel: DemoParcel): CCFPlan {
  const ha = parcel.area_hectares;

  // Current even-aged distribution (typical plantation)
  const currentDistribution: DiameterClass[] = [
    { diameterCm: 10, treesPerHa: 120 },
    { diameterCm: 15, treesPerHa: 280 },
    { diameterCm: 20, treesPerHa: 350 },
    { diameterCm: 25, treesPerHa: 300 },
    { diameterCm: 30, treesPerHa: 180 },
    { diameterCm: 35, treesPerHa: 80 },
    { diameterCm: 40, treesPerHa: 30 },
    { diameterCm: 45, treesPerHa: 10 },
    { diameterCm: 50, treesPerHa: 2 },
  ];

  // Target reverse-J distribution
  const targetDistribution: DiameterClass[] = [
    { diameterCm: 10, treesPerHa: 400 },
    { diameterCm: 15, treesPerHa: 250 },
    { diameterCm: 20, treesPerHa: 160 },
    { diameterCm: 25, treesPerHa: 100 },
    { diameterCm: 30, treesPerHa: 65 },
    { diameterCm: 35, treesPerHa: 40 },
    { diameterCm: 40, treesPerHa: 25 },
    { diameterCm: 45, treesPerHa: 15 },
    { diameterCm: 50, treesPerHa: 8 },
  ];

  // Harvest plan: trees to remove to move toward target
  const harvestPlan: DiameterClass[] = currentDistribution.map((curr, i) => {
    const target = targetDistribution[i];
    const excess = Math.max(0, curr.treesPerHa - target.treesPerHa);
    return { diameterCm: curr.diameterCm, treesPerHa: excess };
  });

  const transitionSteps: TransitionStep[] = [
    { year: 1, action: 'Inventory & marking', actionSv: 'Inventering & stämpling', volumeM3: 0, revenueSEK: -5000 },
    { year: 2, action: 'First selective harvest — remove excess 20-30cm trees', actionSv: 'Första plockhuggning — ta bort överskott 20-30cm', volumeM3: Math.round(ha * 18), revenueSEK: Math.round(ha * 18 * 280) },
    { year: 5, action: 'Assess regeneration in gaps', actionSv: 'Bedöm föryngring i luckor', volumeM3: 0, revenueSEK: 0 },
    { year: 7, action: 'Second selective harvest — target 25-35cm', actionSv: 'Andra plockhuggning — rikta 25-35cm', volumeM3: Math.round(ha * 15), revenueSEK: Math.round(ha * 15 * 320) },
    { year: 10, action: 'Carbon certification & mid-review', actionSv: 'Kolcertifiering & halvtidsöversyn', volumeM3: 0, revenueSEK: Math.round(ha * 8 * 800) },
    { year: 12, action: 'Third selective harvest', actionSv: 'Tredje plockhuggning', volumeM3: Math.round(ha * 14), revenueSEK: Math.round(ha * 14 * 350) },
    { year: 15, action: 'Reverse-J emerging — steady state approaching', actionSv: 'Omvänd J framträder — stabilt läge närmar sig', volumeM3: Math.round(ha * 12), revenueSEK: Math.round(ha * 12 * 370) },
    { year: 18, action: 'Full CCF management established', actionSv: 'Fullständigt hyggesfritt etablerat', volumeM3: Math.round(ha * 12), revenueSEK: Math.round(ha * 12 * 390) },
  ];

  return {
    parcelId: parcel.id,
    currentDistribution,
    targetDistribution,
    harvestPlan,
    annualYield: 5.5,
    annualIncome: Math.round(5.5 * 350),
    transitionYears: 18,
    transitionSteps,
  };
}

// ─── Regulation Data ───

export const REGULATIONS: RegulationItem[] = [
  {
    id: 'samrad',
    title: 'Consultation Obligation (Samrådsplikt)',
    titleSv: 'Samrådsplikt',
    description: 'All harvesting operations above 0.5 ha must be reported to Skogsstyrelsen 6 weeks before start. Applies to all strategies.',
    descriptionSv: 'All avverkning över 0,5 ha måste anmälas till Skogsstyrelsen 6 veckor före start. Gäller alla strategier.',
    applicableStrategies: ['clearcut', 'ccf', 'extended', 'conservation'],
    severity: 'required',
    link: 'https://www.skogsstyrelsen.se/lag-och-tillsyn/avverkningsanmalan/',
    legalReference: 'Skogsvårdslagen 14 §',
  },
  {
    id: 'nyckelbiotop',
    title: 'Key Habitat (Nyckelbiotop)',
    titleSv: 'Nyckelbiotop',
    description: 'Areas identified as key habitats have restrictions on harvesting. CCF and conservation strategies are generally compatible with nyckelbiotop status.',
    descriptionSv: 'Områden identifierade som nyckelbiotoper har avverkningsbegränsningar. Hyggesfritt och naturvård är generellt kompatibla med nyckelbiotopstatus.',
    applicableStrategies: ['clearcut', 'ccf', 'conservation'],
    severity: 'warning',
    link: 'https://www.skogsstyrelsen.se/miljo-och-klimat/biologisk-mangfald/nyckelbiotoper/',
    legalReference: 'Skogsvårdslagen 30 §',
  },
  {
    id: 'artskydd',
    title: 'Species Protection (Artskyddsförordningen)',
    titleSv: 'Artskyddsförordningen',
    description: 'EU Habitats Directive transposed into Swedish law. Protects listed species and their habitats. Must be considered before any forestry operation.',
    descriptionSv: 'EU:s habitatdirektiv i svensk lag. Skyddar listade arter och deras livsmiljöer. Måste beaktas före alla skogsbruksåtgärder.',
    applicableStrategies: ['clearcut', 'ccf', 'extended', 'conservation'],
    severity: 'required',
    link: 'https://www.naturvardsverket.se/vagledning-och-stod/arter-och-artskydd/artskyddsforordningen/',
    legalReference: 'Artskyddsförordningen (2007:845)',
  },
  {
    id: 'pefc',
    title: 'PEFC Certification Requirements',
    titleSv: 'PEFC-certifieringskrav',
    description: 'PEFC requires 5% of productive forest set aside for nature conservation. CCF and extended rotation count favorably. Clearcut has stricter buffer requirements.',
    descriptionSv: 'PEFC kräver 5% av produktiv skog avsatt för naturvård. Hyggesfritt och förlängd omloppstid räknas fördelaktigt. Kalavverkning har striktare skyddszonskrav.',
    applicableStrategies: ['clearcut', 'ccf', 'extended', 'conservation'],
    severity: 'info',
    link: 'https://pefc.se/',
    legalReference: 'PEFC SWE 002:4',
  },
  {
    id: 'fsc',
    title: 'FSC Certification Requirements',
    titleSv: 'FSC-certifieringskrav',
    description: 'FSC requires higher conservation standards than PEFC. 5% strict reserves + 5% managed conservation. Conservation and CCF strategies align naturally with FSC.',
    descriptionSv: 'FSC kräver högre naturvårdskrav än PEFC. 5% strikta reservat + 5% skött naturvård. Naturvård och hyggesfritt passar naturligt med FSC.',
    applicableStrategies: ['clearcut', 'ccf', 'extended', 'conservation'],
    severity: 'info',
    link: 'https://se.fsc.org/',
    legalReference: 'FSC-STD-SWE-03-2019',
  },
  {
    id: 'regen',
    title: 'Regeneration Obligation',
    titleSv: 'Föryngringsplikt',
    description: 'After clearcut, landowner must ensure regeneration within 3 years. Not applicable to CCF (continuous regeneration) or conservation strategies.',
    descriptionSv: 'Efter kalavverkning måste markägaren säkerställa föryngring inom 3 år. Gäller ej hyggesfritt (kontinuerlig föryngring) eller naturvårdsstrategier.',
    applicableStrategies: ['clearcut', 'extended'],
    severity: 'required',
    link: 'https://www.skogsstyrelsen.se/bruka-skog/foryngring/',
    legalReference: 'Skogsvårdslagen 5-6 §§',
  },
  {
    id: 'ransar',
    title: 'Riparian Buffer Zones (Kantzoner)',
    titleSv: 'Kantzoner vid vattendrag',
    description: 'Buffer zones of 5-30m required along watercourses. All strategies must respect these. CCF naturally integrates riparian buffers.',
    descriptionSv: 'Skyddszoner på 5-30m krävs längs vattendrag. Alla strategier måste respektera dessa. Hyggesfritt integrerar naturligt skyddszoner.',
    applicableStrategies: ['clearcut', 'ccf', 'extended', 'conservation'],
    severity: 'required',
    link: 'https://www.skogsstyrelsen.se/bruka-skog/kantzoner/',
    legalReference: 'Skogsvårdslagen 30 §',
  },
];

// ─── Hook ───

export function useSilviculture() {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('ccf');
  const [selectedParcelId, setSelectedParcelId] = useState<string>('p1');
  const [comparisonParcels] = useState<DemoParcel[]>(
    DEMO_PARCELS.filter(p => ['p1', 'p2', 'p3'].includes(p.id))
  );

  // Projections for all strategies (using first 3 parcels total area)
  const totalArea = comparisonParcels.reduce((sum, p) => sum + p.area_hectares, 0);

  const projections = useMemo<Record<StrategyId, StrategyProjection>>(() => ({
    clearcut: calculateProjection('clearcut', totalArea),
    ccf: calculateProjection('ccf', totalArea),
    extended: calculateProjection('extended', totalArea),
    conservation: calculateProjection('conservation', totalArea),
  }), [totalArea]);

  // Total value breakdowns
  const totalValues = useMemo<Record<StrategyId, TotalValueBreakdown>>(() => ({
    clearcut: calculateTotalValue('clearcut'),
    ccf: calculateTotalValue('ccf'),
    extended: calculateTotalValue('extended'),
    conservation: calculateTotalValue('conservation'),
  }), []);

  // Parcel suitability
  const parcelSuitabilities = useMemo<ParcelSuitability[]>(
    () => comparisonParcels.map(scoreParcel),
    [comparisonParcels],
  );

  // CCF plan for selected parcel
  const selectedParcel = comparisonParcels.find(p => p.id === selectedParcelId) ?? comparisonParcels[0];
  const ccfPlan = useMemo(
    () => generateCCFPlan(selectedParcel),
    [selectedParcel],
  );

  // Winner badges
  const winners = useMemo(() => {
    const entries = Object.values(projections);
    return {
      highestNPV: entries.reduce((a, b) => a.totalNPV > b.totalNPV ? a : b).strategyId,
      lowestRisk: entries.reduce((a, b) => a.riskScore < b.riskScore ? a : b).strategyId,
      bestBiodiversity: entries.reduce((a, b) => a.biodiversityScore > b.biodiversityScore ? a : b).strategyId,
      bestCarbon: entries.reduce((a, b) => a.carbonStorage > b.carbonStorage ? a : b).strategyId,
      mostStable: entries.reduce((a, b) => a.incomeStability > b.incomeStability ? a : b).strategyId,
      fastestIncome: entries.reduce((a, b) => a.yearsToFirstIncome < b.yearsToFirstIncome ? a : b).strategyId,
    };
  }, [projections]);

  const selectStrategy = useCallback((id: StrategyId) => setSelectedStrategy(id), []);
  const selectParcel = useCallback((id: string) => setSelectedParcelId(id), []);

  return {
    strategies: STRATEGIES,
    selectedStrategy,
    selectStrategy,
    selectedParcelId,
    selectParcel,
    projections,
    totalValues,
    parcelSuitabilities,
    ccfPlan,
    winners,
    regulations: REGULATIONS,
    comparisonParcels,
    totalArea,
  };
}
