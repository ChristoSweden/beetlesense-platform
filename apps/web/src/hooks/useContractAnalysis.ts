/**
 * useContractAnalysis — Contract portfolio analysis, value leakage, and independence calculations.
 *
 * Provides demo data for two sample contracts (Stora Enso, Södra) with realistic
 * Swedish timber contract terms, market comparisons, and renegotiation detection.
 */

import { useMemo, useState } from 'react';
import { ASSORTMENTS, type Assortment } from '@/services/timberMarketService';

// ─── Types ───

export interface ContractAssortment {
  assortment: Assortment;
  contractPrice: number;       // kr/m³fub locked in contract
  spotPrice: number;           // current spot market price
  bestAvailablePrice: number;  // best offer from competing buyers
  committedVolume: number;     // m³/year
  deliveredVolume: number;     // m³ delivered so far this year
}

export interface Contract {
  id: string;
  buyer: string;
  buyerLogo?: string;
  startDate: string;           // ISO date
  endDate: string;             // ISO date
  pricingFormula: string;      // human-readable formula description
  priceAdjustment: 'quarterly' | 'annual' | 'fixed';
  noticePeriodMonths: number;
  earlyTerminationPenalty: number; // SEK
  assortments: ContractAssortment[];
  status: 'active' | 'expiring_soon' | 'expired';
  notes: string;
}

export interface MonthlyLeakage {
  month: string;               // YYYY-MM
  label: string;
  contractRevenue: number;
  spotRevenue: number;
  bestRevenue: number;
  leakage: number;             // spotRevenue - contractRevenue
}

export interface ValueLeakage {
  contractId: string;
  totalLeakage12Months: number;
  projectedLeakageRemaining: number;
  monthlyBreakdown: MonthlyLeakage[];
  assortmentBreakdown: {
    assortment: Assortment;
    nameSv: string;
    contractPrice: number;
    spotPrice: number;
    bestPrice: number;
    volumeDelivered: number;
    leakage: number;
  }[];
}

export interface IndependenceScenario {
  label: string;
  timberRevenue5yr: number;
  carbonCredits5yr: number;
  contractorSavings5yr: number;
  insuranceOptimization5yr: number;
  total5yr: number;
  npv5yr: number;
  monthlyAvg: number;
}

export interface IndependenceComparison {
  withContract: IndependenceScenario;
  independent: IndependenceScenario;
  breakEvenMonths: number;
  npvDifference: number;
}

export interface RenegotiationWindow {
  contractId: string;
  buyer: string;
  daysUntilExpiry: number;
  marketCondition: 'favorable' | 'neutral' | 'unfavorable';
  marketConditionSv: string;
  estimatedSavings: number;
  checklist: { item: string; done: boolean }[];
  templateLetter: string;
}

// ─── Demo Data ───

const TODAY = new Date('2026-03-17');

function monthDiff(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  return Math.max(0, Math.ceil((target.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24)));
}

const DEMO_CONTRACTS: Contract[] = [
  {
    id: 'c1',
    buyer: 'Stora Enso',
    startDate: '2024-01-01',
    endDate: '2027-12-31',
    pricingFormula: 'Baspris + kvalitetspremie − transportavdrag (kvartalsvis justering)',
    priceAdjustment: 'quarterly',
    noticePeriodMonths: 6,
    earlyTerminationPenalty: 35000,
    assortments: [
      {
        assortment: 'gran_timmer',
        contractPrice: 640,
        spotPrice: 700,
        bestAvailablePrice: 720,
        committedVolume: 800,
        deliveredVolume: 195,
      },
      {
        assortment: 'gran_massa',
        contractPrice: 310,
        spotPrice: 355,
        bestAvailablePrice: 365,
        committedVolume: 400,
        deliveredVolume: 98,
      },
      {
        assortment: 'tall_timmer',
        contractPrice: 600,
        spotPrice: 660,
        bestAvailablePrice: 675,
        committedVolume: 300,
        deliveredVolume: 72,
      },
    ],
    status: 'active',
    notes: 'Fyraårsavtal med kvartalsvis prisjustering. Inkluderar kvalitetspremie för FSC-certifierat virke.',
  },
  {
    id: 'c2',
    buyer: 'Södra',
    startDate: '2023-07-01',
    endDate: '2026-06-30',
    pricingFormula: 'Medlemspris + ägarandel − transportavdrag (årlig justering)',
    priceAdjustment: 'annual',
    noticePeriodMonths: 3,
    earlyTerminationPenalty: 18000,
    assortments: [
      {
        assortment: 'gran_timmer',
        contractPrice: 660,
        spotPrice: 700,
        bestAvailablePrice: 720,
        committedVolume: 500,
        deliveredVolume: 380,
      },
      {
        assortment: 'bjork_massa',
        contractPrice: 340,
        spotPrice: 380,
        bestAvailablePrice: 395,
        committedVolume: 200,
        deliveredVolume: 155,
      },
    ],
    status: 'expiring_soon',
    notes: 'Treårsavtal via Södra medlemsskap. Löper ut om ~3 månader. Inkluderar ägarandelsåterbäring (~15 kr/m³).',
  },
];

function generateMonthlyLeakage(contract: Contract): MonthlyLeakage[] {
  const months: MonthlyLeakage[] = [];
  const startDate = new Date(contract.startDate);
  const now = TODAY;

  // Generate last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (d < startDate) continue;

    const monthLabel = d.toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' });
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Monthly delivered volume fraction (1/12 of annual committed)
    let contractRev = 0;
    let spotRev = 0;
    let bestRev = 0;

    for (const a of contract.assortments) {
      const monthlyVol = a.committedVolume / 12;
      // Add some seasonal variation
      const seasonFactor = 0.85 + Math.sin((d.getMonth() / 12) * Math.PI * 2) * 0.15;
      const vol = monthlyVol * seasonFactor;

      // Simulate slight price improvements over time
      const timeFactor = 1 + (11 - i) * 0.003;
      contractRev += vol * a.contractPrice;
      spotRev += vol * (a.spotPrice * timeFactor * (0.95 + Math.random() * 0.1));
      bestRev += vol * (a.bestAvailablePrice * timeFactor * (0.95 + Math.random() * 0.1));
    }

    months.push({
      month: monthStr,
      label: monthLabel,
      contractRevenue: Math.round(contractRev),
      spotRevenue: Math.round(spotRev),
      bestRevenue: Math.round(bestRev),
      leakage: Math.round(spotRev - contractRev),
    });
  }

  return months;
}

function computeValueLeakage(contract: Contract): ValueLeakage {
  const monthly = generateMonthlyLeakage(contract);
  const totalLeakage = monthly.reduce((sum, m) => sum + m.leakage, 0);

  const remainingMonths = monthDiff(TODAY, new Date(contract.endDate));
  const avgMonthlyLeakage = totalLeakage / monthly.length;
  const projectedRemaining = Math.round(avgMonthlyLeakage * Math.max(0, remainingMonths));

  const assortmentBreakdown = contract.assortments.map((a) => {
    const info = ASSORTMENTS.find((x) => x.id === a.assortment);
    const leakage = Math.round((a.spotPrice - a.contractPrice) * a.deliveredVolume);
    return {
      assortment: a.assortment,
      nameSv: info?.nameSv ?? a.assortment,
      contractPrice: a.contractPrice,
      spotPrice: a.spotPrice,
      bestPrice: a.bestAvailablePrice,
      volumeDelivered: a.deliveredVolume,
      leakage,
    };
  });

  return {
    contractId: contract.id,
    totalLeakage12Months: totalLeakage,
    projectedLeakageRemaining: projectedRemaining,
    monthlyBreakdown: monthly,
    assortmentBreakdown,
  };
}

function computeIndependenceComparison(
  contracts: Contract[],
  riskTolerance: number, // 0–1
): IndependenceComparison {
  // Aggregate total volumes across contracts
  let totalTimberVolume = 0;
  let avgContractPrice = 0;
  let avgSpotPrice = 0;
  let count = 0;

  for (const c of contracts) {
    for (const a of c.assortments) {
      totalTimberVolume += a.committedVolume;
      avgContractPrice += a.contractPrice;
      avgSpotPrice += a.spotPrice;
      count++;
    }
  }
  avgContractPrice /= count || 1;
  avgSpotPrice /= count || 1;

  const years = 5;
  const discountRate = 0.04; // 4% annual

  // Contract scenario: predictable, lower prices
  const contractTimber5yr = totalTimberVolume * avgContractPrice * years;
  const contractCarbon5yr = 0; // No carbon credits with typical contracts
  const contractContractor5yr = 0;
  const contractInsurance5yr = 0;
  const contractTotal = contractTimber5yr;

  // Independent scenario: market prices + extras, with risk adjustment
  const independentBasePrice = avgSpotPrice * (1 + riskTolerance * 0.05); // Risk premium
  const priceVolatilityDiscount = (1 - riskTolerance) * 0.03; // Conservative owners discount
  const effectiveIndependentPrice = independentBasePrice * (1 - priceVolatilityDiscount);
  const independentTimber5yr = totalTimberVolume * effectiveIndependentPrice * years;
  const independentCarbon5yr = totalTimberVolume * 12 * years; // ~12 kr/m³ carbon credits
  const independentContractor5yr = totalTimberVolume * 8 * years; // ~8 kr/m³ contractor savings
  const independentInsurance5yr = 15000 * years; // Annual optimization
  const independentTotal = independentTimber5yr + independentCarbon5yr + independentContractor5yr + independentInsurance5yr;

  // NPV calculations
  function npv(total: number): number {
    let pv = 0;
    const annual = total / years;
    for (let y = 1; y <= years; y++) {
      pv += annual / Math.pow(1 + discountRate, y);
    }
    return Math.round(pv);
  }

  const contractNPV = npv(contractTotal);
  const independentNPV = npv(independentTotal);

  // Break-even: months until cumulative independent advantage covers switching costs
  const totalPenalties = contracts.reduce((sum, c) => sum + c.earlyTerminationPenalty, 0);
  const monthlyAdvantage = (independentTotal - contractTotal) / (years * 12);
  const breakEvenMonths = monthlyAdvantage > 0
    ? Math.ceil(totalPenalties / monthlyAdvantage)
    : 999;

  return {
    withContract: {
      label: 'Med kontrakt',
      timberRevenue5yr: Math.round(contractTimber5yr),
      carbonCredits5yr: contractCarbon5yr,
      contractorSavings5yr: contractContractor5yr,
      insuranceOptimization5yr: contractInsurance5yr,
      total5yr: Math.round(contractTotal),
      npv5yr: contractNPV,
      monthlyAvg: Math.round(contractTotal / (years * 12)),
    },
    independent: {
      label: 'Oberoende med BeetleSense',
      timberRevenue5yr: Math.round(independentTimber5yr),
      carbonCredits5yr: Math.round(independentCarbon5yr),
      contractorSavings5yr: Math.round(independentContractor5yr),
      insuranceOptimization5yr: Math.round(independentInsurance5yr),
      total5yr: Math.round(independentTotal),
      npv5yr: independentNPV,
      monthlyAvg: Math.round(independentTotal / (years * 12)),
    },
    breakEvenMonths,
    npvDifference: independentNPV - contractNPV,
  };
}

function computeRenegotiationWindows(contracts: Contract[]): RenegotiationWindow[] {
  return contracts.map((c) => {
    const days = daysUntil(c.endDate);
    const totalLeakage = c.assortments.reduce(
      (sum, a) => sum + (a.spotPrice - a.contractPrice) * a.committedVolume,
      0,
    );

    // Market condition based on spot vs contract spread
    const avgSpread = c.assortments.reduce(
      (sum, a) => sum + ((a.spotPrice - a.contractPrice) / a.contractPrice),
      0,
    ) / c.assortments.length;

    let marketCondition: 'favorable' | 'neutral' | 'unfavorable';
    let marketConditionSv: string;
    if (avgSpread > 0.08) {
      marketCondition = 'favorable';
      marketConditionSv = 'Nuvarande marknad gynnar omförhandling';
    } else if (avgSpread > 0.03) {
      marketCondition = 'neutral';
      marketConditionSv = 'Marknadsläget är neutralt';
    } else {
      marketCondition = 'unfavorable';
      marketConditionSv = 'Avvakta — marknaden gynnar befintligt avtal';
    }

    const checklist = [
      { item: 'Samla aktuell marknadsdata (spotpriser, index)', done: true },
      { item: 'Begär konkurrerande offerter från minst 2 köpare', done: false },
      { item: 'Beräkna ditt förhandlingsutrymme med BeetleSense-analys', done: true },
      { item: 'Kontrollera uppsägningstid och villkor', done: true },
      { item: 'Förbered argument kring virkets kvalitet och certifiering', done: false },
      { item: 'Boka möte med virkesköpare i god tid före förfall', done: false },
    ];

    const templateLetter = `${c.buyer} Skog AB
Virkesavdelningen

Ort, ${TODAY.toLocaleDateString('sv-SE')}

Angående: Omförhandling av virkesavtal ${c.id}

Bäste virkesköpare,

Jag skriver angående vårt nuvarande virkesavtal som löper till ${new Date(c.endDate).toLocaleDateString('sv-SE')}.

Med anledning av nuvarande marknadsförutsättningar önskar jag diskutera möjligheten att omförhandla avtalsvillkoren. Aktuella spotmarknadspriser ligger ${Math.round(avgSpread * 100)}% över vårt avtalade pris, vilket innebär en betydande differens.

Under avtalets löptid har jag levererat virke av konsekvent hög kvalitet och önskar fortsätta vårt samarbete under mer marknadsmässiga villkor.

Jag har tagit fram en detaljerad marknadsanalys och ser fram emot att diskutera:
• Prisjustering i linje med aktuella marknadsnivåer
• Flexiblare volymåtaganden
• Förbättrade kvalitetspremier

Vänligen kontakta mig för att boka ett möte.

Med vänliga hälsningar,
[Ditt namn]
[Fastighetsbeteckning]
[Telefonnummer]`;

    return {
      contractId: c.id,
      buyer: c.buyer,
      daysUntilExpiry: days,
      marketCondition,
      marketConditionSv,
      estimatedSavings: Math.round(totalLeakage),
      checklist,
      templateLetter,
    };
  });
}

// ─── Hook ───

export function useContractAnalysis() {
  const [riskTolerance, setRiskTolerance] = useState(0.5);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const contracts = DEMO_CONTRACTS;

  const valueLeakages = useMemo(
    () => contracts.map(computeValueLeakage),
    [contracts],
  );

  const totalLeakage = useMemo(
    () => valueLeakages.reduce((sum, v) => sum + v.totalLeakage12Months, 0),
    [valueLeakages],
  );

  const independenceComparison = useMemo(
    () => computeIndependenceComparison(contracts, riskTolerance),
    [contracts, riskTolerance],
  );

  const renegotiationWindows = useMemo(
    () => computeRenegotiationWindows(contracts),
    [contracts],
  );

  const selectedContract = selectedContractId
    ? contracts.find((c) => c.id === selectedContractId) ?? null
    : null;

  const selectedLeakage = selectedContractId
    ? valueLeakages.find((v) => v.contractId === selectedContractId) ?? null
    : null;

  return {
    contracts,
    valueLeakages,
    totalLeakage,
    independenceComparison,
    renegotiationWindows,
    riskTolerance,
    setRiskTolerance,
    selectedContractId,
    setSelectedContractId,
    selectedContract,
    selectedLeakage,
  };
}

export function formatSEK(value: number): string {
  return value.toLocaleString('sv-SE') + ' kr';
}
