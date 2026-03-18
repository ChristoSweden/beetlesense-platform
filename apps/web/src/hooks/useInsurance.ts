/**
 * useInsurance — Hook providing insurance coverage, claims, damage alerts,
 * claim builder state, and provider comparison data for forest owners.
 *
 * Demo: Länsförsäkringar policy, 2 historical claims, 1 active damage detection.
 */

import { useState, useMemo, useCallback } from 'react';
import { DEMO_PARCELS } from '@/lib/demoData';

// ─── Types ───

export type DamageType = 'storm' | 'beetle' | 'fire' | 'moose' | 'flooding';
export type ClaimStatus = 'inskickad' | 'under_behandling' | 'godkänd' | 'utbetald' | 'avslagen';
export type CoverageType = 'storm' | 'brand' | 'barkborre' | 'älg' | 'klimatskada';

export interface InsuranceProvider {
  id: string;
  name: string;
  logo: string; // emoji placeholder
  premiumPerHaMin: number;
  premiumPerHaMax: number;
  stormCoverage: string;
  beetleCoverage: string;
  fireCoverage: string;
  maxPayout: string;
  deductible: string;
  extras: string;
  contactUrl: string;
}

export interface CoverageLine {
  type: CoverageType;
  label: string;
  limit: number; // SEK
  deductible: number; // SEK
  covered: boolean;
}

export interface InsurancePolicy {
  id: string;
  provider: InsuranceProvider;
  policyNumber: string;
  type: string;
  annualPremium: number;
  totalCoverageLimit: number;
  coverageLines: CoverageLine[];
  startDate: string;
  expiryDate: string;
  renewalReminder: boolean;
  totalHectares: number;
}

export interface DamageAlert {
  id: string;
  parcelId: string;
  parcelName: string;
  damageType: DamageType;
  detectedDate: string;
  estimatedAreaHa: number;
  estimatedDamagePct: number;
  ndviBefore: number;
  ndviAfter: number;
  status: 'detected' | 'confirmed' | 'claim_started';
}

export interface ClaimTimelineStep {
  date: string;
  label: string;
  completed: boolean;
}

export interface InsuranceClaim {
  id: string;
  damageType: DamageType;
  parcelId: string;
  parcelName: string;
  affectedAreaHa: number;
  claimedAmountSEK: number;
  payoutAmountSEK: number | null;
  payoutDate: string | null;
  status: ClaimStatus;
  filedDate: string;
  timeline: ClaimTimelineStep[];
  volumeLossM3: number;
  satelliteEvidence: boolean;
}

export interface ClaimBuilderState {
  step: number;
  damageType: DamageType | null;
  selectedParcels: string[];
  affectedAreaHa: number;
  damagePct: number;
  volumeLossM3: number;
  marketValueSEK: number;
  detectionDate: string;
  ndviBefore: number;
  ndviAfter: number;
  totalClaimSEK: number;
}

// ─── Demo Data ───

const PROVIDERS: InsuranceProvider[] = [
  {
    id: 'lf',
    name: 'Länsförsäkringar',
    logo: '🏛️',
    premiumPerHaMin: 80,
    premiumPerHaMax: 150,
    stormCoverage: 'Upp till 100% av virkesvärde',
    beetleCoverage: 'Upp till 80% (kräver inspektion)',
    fireCoverage: 'Fullständig',
    maxPayout: '15 000 000 SEK',
    deductible: '10 000 SEK',
    extras: 'Återplanteringskostnad, vägskador',
    contactUrl: '#',
  },
  {
    id: 'dina',
    name: 'Dina Försäkringar',
    logo: '🤝',
    premiumPerHaMin: 70,
    premiumPerHaMax: 130,
    stormCoverage: 'Upp till 90% av virkesvärde',
    beetleCoverage: 'Upp till 70%',
    fireCoverage: 'Fullständig',
    maxPayout: '10 000 000 SEK',
    deductible: '8 000 SEK',
    extras: 'Kooperativ bonus, återplantering',
    contactUrl: '#',
  },
  {
    id: 'if',
    name: 'If Skadeförsäkring',
    logo: '🏢',
    premiumPerHaMin: 90,
    premiumPerHaMax: 160,
    stormCoverage: 'Upp till 100% av virkesvärde',
    beetleCoverage: 'Upp till 85% (satellitkrav)',
    fireCoverage: 'Fullständig + röjning',
    maxPayout: '20 000 000 SEK',
    deductible: '15 000 SEK',
    extras: 'Miljösanering, juridisk hjälp',
    contactUrl: '#',
  },
  {
    id: 'folksam',
    name: 'Folksam',
    logo: '🌿',
    premiumPerHaMin: 60,
    premiumPerHaMax: 120,
    stormCoverage: 'Upp till 80% av virkesvärde',
    beetleCoverage: 'Upp till 60%',
    fireCoverage: 'Fullständig',
    maxPayout: '8 000 000 SEK',
    deductible: '5 000 SEK',
    extras: 'Klimatbonus vid hållbart bruk',
    contactUrl: '#',
  },
];

const DEMO_POLICY: InsurancePolicy = {
  id: 'pol-001',
  provider: PROVIDERS[0], // Länsförsäkringar
  policyNumber: 'LF-SKOG-2025-48291',
  type: 'Skogsförsäkring Premium',
  annualPremium: 21480,
  totalCoverageLimit: 15000000,
  totalHectares: 214.8,
  startDate: '2025-07-01',
  expiryDate: '2026-07-01',
  renewalReminder: true,
  coverageLines: [
    { type: 'storm', label: 'Stormskada', limit: 15000000, deductible: 10000, covered: true },
    { type: 'brand', label: 'Brandskada', limit: 15000000, deductible: 10000, covered: true },
    { type: 'barkborre', label: 'Barkborreskada', limit: 8000000, deductible: 15000, covered: true },
    { type: 'älg', label: 'Älgskada', limit: 3000000, deductible: 5000, covered: true },
    { type: 'klimatskada', label: 'Klimatskada (torka/frost)', limit: 5000000, deductible: 20000, covered: false },
  ],
};

const DEMO_CLAIMS: InsuranceClaim[] = [
  {
    id: 'claim-001',
    damageType: 'storm',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    affectedAreaHa: 8.2,
    claimedAmountSEK: 476000,
    payoutAmountSEK: 452000,
    payoutDate: '2025-11-15',
    status: 'utbetald',
    filedDate: '2025-09-20',
    volumeLossM3: 680,
    satelliteEvidence: true,
    timeline: [
      { date: '2025-09-18', label: 'Skada upptäckt av BeetleSense', completed: true },
      { date: '2025-09-20', label: 'Skaderapport inskickad', completed: true },
      { date: '2025-09-25', label: 'Försäkringsbolag bekräftar mottagning', completed: true },
      { date: '2025-10-10', label: 'Fältinspektion genomförd', completed: true },
      { date: '2025-10-28', label: 'Skadebelopp godkänt', completed: true },
      { date: '2025-11-15', label: 'Utbetalning mottagen', completed: true },
    ],
  },
  {
    id: 'claim-002',
    damageType: 'beetle',
    parcelId: 'p4',
    parcelName: 'Granudden',
    affectedAreaHa: 12.5,
    claimedAmountSEK: 892000,
    payoutAmountSEK: 714000,
    payoutDate: '2026-01-22',
    status: 'utbetald',
    filedDate: '2025-11-05',
    volumeLossM3: 1240,
    satelliteEvidence: true,
    timeline: [
      { date: '2025-10-22', label: 'Barkborreangrepp detekterat av BeetleSense', completed: true },
      { date: '2025-11-05', label: 'Skaderapport med satellitbevis inskickad', completed: true },
      { date: '2025-11-12', label: 'Försäkringsbolag bekräftar mottagning', completed: true },
      { date: '2025-12-03', label: 'Fältinspektion + drönarkartläggning', completed: true },
      { date: '2025-12-20', label: 'Skadebelopp godkänt (80% av krav)', completed: true },
      { date: '2026-01-22', label: 'Utbetalning mottagen', completed: true },
    ],
  },
];

const DEMO_DAMAGE_ALERT: DamageAlert = {
  id: 'alert-ins-001',
  parcelId: 'p4',
  parcelName: 'Granudden',
  damageType: 'beetle',
  detectedDate: '2026-03-05',
  estimatedAreaHa: 4.8,
  estimatedDamagePct: 35,
  ndviBefore: 0.82,
  ndviAfter: 0.51,
  status: 'detected',
};

// ─── Hook ───

const INITIAL_BUILDER: ClaimBuilderState = {
  step: 1,
  damageType: null,
  selectedParcels: [],
  affectedAreaHa: 0,
  damagePct: 0,
  volumeLossM3: 0,
  marketValueSEK: 0,
  detectionDate: '',
  ndviBefore: 0,
  ndviAfter: 0,
  totalClaimSEK: 0,
};

export function useInsurance() {
  const [policy] = useState<InsurancePolicy>(DEMO_POLICY);
  const [claims] = useState<InsuranceClaim[]>(DEMO_CLAIMS);
  const [damageAlerts] = useState<DamageAlert[]>([DEMO_DAMAGE_ALERT]);
  const [builder, setBuilder] = useState<ClaimBuilderState>(INITIAL_BUILDER);

  const providers = PROVIDERS;
  const parcels = DEMO_PARCELS;

  const totalHistoricalPayouts = useMemo(
    () => claims.reduce((sum, c) => sum + (c.payoutAmountSEK ?? 0), 0),
    [claims],
  );

  // Annual savings calculation if switching to cheapest provider
  const potentialSavings = useMemo(() => {
    const currentPremium = policy.annualPremium;
    const cheapestPerHa = Math.min(...providers.map((p) => p.premiumPerHaMin));
    const cheapestAnnual = cheapestPerHa * policy.totalHectares;
    return Math.max(0, Math.round(currentPremium - cheapestAnnual));
  }, [policy, providers]);

  // Builder helpers
  const setStep = useCallback((step: number) => {
    setBuilder((prev) => ({ ...prev, step }));
  }, []);

  const setDamageType = useCallback((damageType: DamageType) => {
    setBuilder((prev) => ({ ...prev, damageType }));
  }, []);

  const toggleParcel = useCallback((parcelId: string) => {
    setBuilder((prev) => {
      const selected = prev.selectedParcels.includes(parcelId)
        ? prev.selectedParcels.filter((id) => id !== parcelId)
        : [...prev.selectedParcels, parcelId];

      const totalArea = selected.reduce((sum, id) => {
        const p = DEMO_PARCELS.find((pp) => pp.id === id);
        return sum + (p?.area_hectares ?? 0);
      }, 0);

      return { ...prev, selectedParcels: selected, affectedAreaHa: Math.round(totalArea * 10) / 10 };
    });
  }, []);

  const calculateEvidence = useCallback(() => {
    // Simulate satellite evidence based on selected parcels
    const damagePct = builder.damageType === 'storm' ? 45 : builder.damageType === 'beetle' ? 35 : builder.damageType === 'fire' ? 60 : 25;
    const affectedHa = builder.affectedAreaHa * (damagePct / 100);
    const volumePerHa = 180; // m3/ha average for Swedish spruce
    const volumeLoss = Math.round(affectedHa * volumePerHa);
    const pricePerM3 = 580; // SEK current market price
    const marketValue = volumeLoss * pricePerM3;
    const ndviBefore = 0.82;
    const ndviAfter = builder.damageType === 'fire' ? 0.15 : builder.damageType === 'storm' ? 0.38 : 0.51;

    setBuilder((prev) => ({
      ...prev,
      damagePct,
      volumeLossM3: volumeLoss,
      marketValueSEK: marketValue,
      detectionDate: '2026-03-05',
      ndviBefore,
      ndviAfter,
      totalClaimSEK: marketValue,
    }));
  }, [builder.damageType, builder.affectedAreaHa]);

  const resetBuilder = useCallback(() => {
    setBuilder(INITIAL_BUILDER);
  }, []);

  return {
    policy,
    claims,
    damageAlerts,
    providers,
    parcels,
    totalHistoricalPayouts,
    potentialSavings,
    builder,
    setStep,
    setDamageType,
    toggleParcel,
    calculateEvidence,
    resetBuilder,
  };
}
