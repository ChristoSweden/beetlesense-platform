/**
 * useSuccessionPlan — Hook for succession & estate planning.
 *
 * Provides estate valuation, transfer strategies, tax simulation,
 * and timeline generation for generational forest transfers.
 *
 * Demo data: estate worth ~12.5 MSEK, 3 parcels, 2 heirs.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  calculateScenario,
  getParcelTotalValue,
  formatSEK,
  type TransferMethod,
  type ForestParcel,
  type ScenarioResult,
} from '@/services/successionService';

// ─── Types ───

export interface EstateValuation {
  totalValue: number;
  landValue: number;
  timberValue: number;
  carbonCreditsValue: number;
  huntingRightsValue: number;
  totalAreaHa: number;
  parcels: EstateParcel[];
  skogsbruksvarde: number;
  marknadsvarde: number;
  /** Value trend (annual % change) */
  valueTrend: number[];
}

export interface EstateParcel extends ForestParcel {
  /** Percentage of total estate value */
  percentOfTotal: number;
}

export interface HeirConfig {
  id: string;
  name: string;
  /** Share of estate (0-1) */
  share: number;
}

export interface TaxSimulation {
  method: TransferMethod;
  result: ScenarioResult;
  /** Per-heir breakdown */
  perHeir: {
    heirId: string;
    heirName: string;
    shareValue: number;
    taxCost: number;
    effectiveRate: number;
  }[];
  /** Optimization: staged transfer savings */
  stagedSavings: number;
  stagedYears: number;
  optimizationTip: string;
  optimizationTipSv: string;
}

export interface TimelineMilestone {
  id: string;
  phase: string;
  phaseSv: string;
  title: string;
  titleSv: string;
  description: string;
  descriptionSv: string;
  durationWeeks: [number, number];
  checklist: { id: string; label: string; labelSv: string; done: boolean }[];
  status: 'pending' | 'active' | 'complete';
  order: number;
}

export interface SuccessionPlanState {
  // Estate
  estate: EstateValuation;
  // Heirs
  heirs: HeirConfig[];
  setHeirs: (heirs: HeirConfig[]) => void;
  addHeir: () => void;
  removeHeir: (id: string) => void;
  updateHeir: (id: string, updates: Partial<HeirConfig>) => void;
  // Tax simulation
  selectedMethod: TransferMethod;
  setSelectedMethod: (m: TransferMethod) => void;
  taxSimulations: TaxSimulation[];
  currentSimulation: TaxSimulation;
  stagedTransferYears: number;
  setStagedTransferYears: (y: number) => void;
  // Timeline
  timeline: TimelineMilestone[];
  toggleMilestoneStatus: (id: string) => void;
  toggleChecklistItem: (milestoneId: string, itemId: string) => void;
  completedMilestones: number;
  totalMilestones: number;
  isComplete: boolean;
  // Tax basis
  taxBasis: number;
  setTaxBasis: (v: number) => void;
  skogskontoBalance: number;
  setSkogskontoBalance: (v: number) => void;
  // Helpers
  formatSEK: (n: number) => string;
}

// ─── Demo Estate Parcels (12.5 MSEK total, 3 parcels) ───

const DEMO_ESTATE_PARCELS: ForestParcel[] = [
  {
    id: 'ep-1',
    name: 'Norra Granskog',
    areaHa: 62,
    timberValueSEK: 4_200_000,
    landValueSEK: 1_350_000,
    huntingRightsValueSEK: 220_000,
    carbonCreditsValueSEK: 130_000,
    accessRoadQuality: 'good',
    futureGrowthPotential: 'high',
    locationQuality: 'good',
  },
  {
    id: 'ep-2',
    name: 'Tallbacken',
    areaHa: 45,
    timberValueSEK: 2_800_000,
    landValueSEK: 980_000,
    huntingRightsValueSEK: 160_000,
    carbonCreditsValueSEK: 95_000,
    accessRoadQuality: 'good',
    futureGrowthPotential: 'medium',
    locationQuality: 'premium',
  },
  {
    id: 'ep-3',
    name: 'Ekudden',
    areaHa: 38,
    timberValueSEK: 1_600_000,
    landValueSEK: 620_000,
    huntingRightsValueSEK: 140_000,
    carbonCreditsValueSEK: 105_000,
    accessRoadQuality: 'fair',
    futureGrowthPotential: 'high',
    locationQuality: 'average',
  },
];

// ─── Timeline template ───

function createTimeline(): TimelineMilestone[] {
  return [
    {
      id: 'tm-1',
      phase: 'Advisory',
      phaseSv: 'Juridisk radgivning',
      title: 'Legal consultation',
      titleSv: 'Juridisk radgivning',
      description: 'Engage a lawyer specialized in forest properties and generational transfers.',
      descriptionSv: 'Anlita jurist specialiserad pa skogsfastigheter och generationsvaxling.',
      durationWeeks: [2, 4],
      checklist: [
        { id: 'c1-1', label: 'Find specialized lawyer', labelSv: 'Hitta specialiserad jurist', done: false },
        { id: 'c1-2', label: 'Initial consultation', labelSv: 'Forsta konsultation', done: false },
        { id: 'c1-3', label: 'Receive written advice', labelSv: 'Fa skriftlig radgivning', done: false },
      ],
      status: 'pending',
      order: 1,
    },
    {
      id: 'tm-2',
      phase: 'Valuation',
      phaseSv: 'Vardering',
      title: 'Property valuation',
      titleSv: 'Fastighetsvardering',
      description: 'Get an updated valuation including timber stock, land, carbon credits, and hunting rights.',
      descriptionSv: 'Fa en uppdaterad vardering inklusive virkesforrad, mark, kolkrediter och jaktratt.',
      durationWeeks: [3, 6],
      checklist: [
        { id: 'c2-1', label: 'Update skogsbruksplan', labelSv: 'Uppdatera skogsbruksplan', done: false },
        { id: 'c2-2', label: 'Get market valuation', labelSv: 'Bestall marknadsvarde', done: false },
        { id: 'c2-3', label: 'Obtain taxeringsvarde', labelSv: 'Hamta taxeringsvarde', done: false },
        { id: 'c2-4', label: 'Assess carbon credit potential', labelSv: 'Bedom kolkreditpotential', done: false },
      ],
      status: 'pending',
      order: 2,
    },
    {
      id: 'tm-3',
      phase: 'Agreement',
      phaseSv: 'Avtal',
      title: 'Draft transfer agreement',
      titleSv: 'Upprata overlatelseavtal',
      description: 'Draft the deed of gift, purchase contract, or co-ownership agreement.',
      descriptionSv: 'Upprata gavobrev, kopekontrakt eller samagerande-avtal.',
      durationWeeks: [2, 4],
      checklist: [
        { id: 'c3-1', label: 'Choose transfer method', labelSv: 'Valj overlatelsemetod', done: false },
        { id: 'c3-2', label: 'Draft agreement', labelSv: 'Upprata avtal', done: false },
        { id: 'c3-3', label: 'Legal review of agreement', labelSv: 'Juridisk granskning av avtal', done: false },
        { id: 'c3-4', label: 'Family approval', labelSv: 'Familjens godkannande', done: false },
      ],
      status: 'pending',
      order: 3,
    },
    {
      id: 'tm-4',
      phase: 'Land Survey',
      phaseSv: 'Lantmateri',
      title: 'Property division (if needed)',
      titleSv: 'Fastighetsreglering (vid behov)',
      description: 'Apply for property division or regulation at Lantmateriet if splitting parcels.',
      descriptionSv: 'Ansok om avstyckning eller fastighetsreglering hos Lantmateriet vid uppdelning.',
      durationWeeks: [8, 24],
      checklist: [
        { id: 'c4-1', label: 'Apply to Lantmateriet', labelSv: 'Ansok hos Lantmateriet', done: false },
        { id: 'c4-2', label: 'Survey meeting', labelSv: 'Lantmateriforratning', done: false },
        { id: 'c4-3', label: 'Receive decision', labelSv: 'Fa beslut', done: false },
      ],
      status: 'pending',
      order: 4,
    },
    {
      id: 'tm-5',
      phase: 'Transfer',
      phaseSv: 'Tilltrade',
      title: 'Execute transfer & registration',
      titleSv: 'Genomfor overlatelse & lagfart',
      description: 'Sign documents, transfer skogskonto, and register at Lantmateriet.',
      descriptionSv: 'Skriv under handlingar, overfor skogskonto, och ansok om lagfart.',
      durationWeeks: [2, 6],
      checklist: [
        { id: 'c5-1', label: 'Sign transfer documents', labelSv: 'Skriv under overlatelsedokument', done: false },
        { id: 'c5-2', label: 'Transfer skogskonto', labelSv: 'Overfor skogskonto', done: false },
        { id: 'c5-3', label: 'Apply for lagfart', labelSv: 'Ansok om lagfart', done: false },
        { id: 'c5-4', label: 'Notify Skatteverket', labelSv: 'Meddela Skatteverket', done: false },
        { id: 'c5-5', label: 'Update insurance', labelSv: 'Uppdatera forsakring', done: false },
      ],
      status: 'pending',
      order: 5,
    },
  ];
}

// ─── Hook ───

export function useSuccessionPlan(): SuccessionPlanState {
  const [heirs, setHeirs] = useState<HeirConfig[]>([
    { id: 'h1', name: 'Anna', share: 0.5 },
    { id: 'h2', name: 'Erik', share: 0.5 },
  ]);

  const [selectedMethod, setSelectedMethod] = useState<TransferMethod>('gava');
  const [stagedTransferYears, setStagedTransferYears] = useState(1);
  const [taxBasis, setTaxBasis] = useState(4_500_000);
  const [skogskontoBalance, setSkogskontoBalance] = useState(850_000);
  const [timeline, setTimeline] = useState<TimelineMilestone[]>(createTimeline);

  // Compute estate
  const estate = useMemo<EstateValuation>(() => {
    const parcels = DEMO_ESTATE_PARCELS;
    const totalValue = parcels.reduce((s, p) => s + getParcelTotalValue(p), 0);
    const landValue = parcels.reduce((s, p) => s + p.landValueSEK, 0);
    const timberValue = parcels.reduce((s, p) => s + p.timberValueSEK, 0);
    const carbonCreditsValue = parcels.reduce((s, p) => s + p.carbonCreditsValueSEK, 0);
    const huntingRightsValue = parcels.reduce((s, p) => s + p.huntingRightsValueSEK, 0);
    const totalAreaHa = parcels.reduce((s, p) => s + p.areaHa, 0);

    const estateParcels: EstateParcel[] = parcels.map((p) => ({
      ...p,
      percentOfTotal: totalValue > 0 ? (getParcelTotalValue(p) / totalValue) * 100 : 0,
    }));

    // Skogsbruksvarde is typically ~75% of marknadsvarde
    const marknadsvarde = totalValue;
    const skogsbruksvarde = Math.round(totalValue * 0.75);

    // Demo value trend: last 5 years of annual growth (%)
    const valueTrend = [3.2, 4.1, 2.8, 5.6, 4.3];

    return {
      totalValue,
      landValue,
      timberValue,
      carbonCreditsValue,
      huntingRightsValue,
      totalAreaHa,
      parcels: estateParcels,
      skogsbruksvarde,
      marknadsvarde,
      valueTrend,
    };
  }, []);

  // Tax simulations for all methods
  const taxSimulations = useMemo<TaxSimulation[]>(() => {
    const methods: TransferMethod[] = ['gava', 'kop', 'arv', 'delat_agande'];

    return methods.map((method) => {
      const result = calculateScenario({
        method,
        propertyValue: estate.totalValue,
        taxBasis,
        skogskontoBalance,
        skogsavdragUsed: 0,
        numberOfHeirs: heirs.length,
      });

      const perHeir = heirs.map((heir) => {
        const shareValue = Math.round(estate.totalValue * heir.share);
        const taxCost = Math.round(result.totalTaxCost * heir.share);
        const effectiveRate = shareValue > 0 ? (taxCost / shareValue) * 100 : 0;
        return {
          heirId: heir.id,
          heirName: heir.name,
          shareValue,
          taxCost,
          effectiveRate,
        };
      });

      // Staged transfer optimization (splitting over years reduces capital gains)
      let stagedSavings = 0;
      let stagedYears = 1;
      let optimizationTip = '';
      let optimizationTipSv = '';

      if (method === 'kop' && result.capitalGainsTax > 0 && stagedTransferYears > 1) {
        // Staged sale: each year only a portion triggers capital gains
        // Simplified: spreading reduces marginal tax if there were brackets
        // In Swedish tax, the 22/30 rule is flat, but selling in parts can
        // allow skogsavdrag to offset portions each year
        const perYearValue = estate.totalValue / stagedTransferYears;
        const perYearGain = Math.max(0, perYearValue - taxBasis / stagedTransferYears);
        const perYearTax = Math.round(perYearGain * (22 / 30) * 0.30);
        const totalStagedTax = perYearTax * stagedTransferYears;
        stagedSavings = Math.max(0, result.capitalGainsTax - totalStagedTax);
        stagedYears = stagedTransferYears;

        if (stagedSavings > 0) {
          optimizationTip = `By splitting the transfer over ${stagedTransferYears} years, you save ${formatSEK(stagedSavings)} in capital gains tax.`;
          optimizationTipSv = `Genom att dela overlatelsen over ${stagedTransferYears} ar sparar du ${formatSEK(stagedSavings)} i kapitalvinstskatt.`;
        }
      }

      if (method === 'gava') {
        optimizationTip = 'Gift is the most tax-efficient method. No stamp duty, no capital gains tax. The recipient inherits your tax basis.';
        optimizationTipSv = 'Gava ar den mest skatteeffektiva metoden. Ingen stampelskatt, ingen kapitalvinstskatt. Mottagaren overtar ditt anskaffningsvarde.';
      }

      return {
        method,
        result,
        perHeir,
        stagedSavings,
        stagedYears,
        optimizationTip,
        optimizationTipSv,
      };
    });
  }, [estate, heirs, taxBasis, skogskontoBalance, stagedTransferYears]);

  const currentSimulation = useMemo(
    () => taxSimulations.find((s) => s.method === selectedMethod) ?? taxSimulations[0],
    [taxSimulations, selectedMethod],
  );

  // Heir management
  const addHeir = useCallback(() => {
    setHeirs((prev) => {
      const n = prev.length + 1;
      const newShare = 1 / n;
      return [
        ...prev.map((h) => ({ ...h, share: newShare })),
        { id: `h${Date.now()}`, name: `Arvinge ${n}`, share: newShare },
      ];
    });
  }, []);

  const removeHeir = useCallback((id: string) => {
    setHeirs((prev) => {
      const filtered = prev.filter((h) => h.id !== id);
      if (filtered.length === 0) return prev;
      const newShare = 1 / filtered.length;
      return filtered.map((h) => ({ ...h, share: newShare }));
    });
  }, []);

  const updateHeir = useCallback((id: string, updates: Partial<HeirConfig>) => {
    setHeirs((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  }, []);

  // Timeline management
  const toggleMilestoneStatus = useCallback((id: string) => {
    setTimeline((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const nextStatus = m.status === 'pending' ? 'active' : m.status === 'active' ? 'complete' : 'pending';
        return {
          ...m,
          status: nextStatus,
          checklist: nextStatus === 'complete'
            ? m.checklist.map((c) => ({ ...c, done: true }))
            : m.checklist,
        };
      }),
    );
  }, []);

  const toggleChecklistItem = useCallback((milestoneId: string, itemId: string) => {
    setTimeline((prev) =>
      prev.map((m) => {
        if (m.id !== milestoneId) return m;
        const updatedChecklist = m.checklist.map((c) =>
          c.id === itemId ? { ...c, done: !c.done } : c,
        );
        const allDone = updatedChecklist.every((c) => c.done);
        return {
          ...m,
          checklist: updatedChecklist,
          status: allDone ? 'complete' : m.status === 'pending' ? 'active' : m.status,
        };
      }),
    );
  }, []);

  const completedMilestones = timeline.filter((m) => m.status === 'complete').length;
  const totalMilestones = timeline.length;
  const isComplete = completedMilestones === totalMilestones;

  return {
    estate,
    heirs,
    setHeirs,
    addHeir,
    removeHeir,
    updateHeir,
    selectedMethod,
    setSelectedMethod,
    taxSimulations,
    currentSimulation,
    stagedTransferYears,
    setStagedTransferYears,
    timeline,
    toggleMilestoneStatus,
    toggleChecklistItem,
    completedMilestones,
    totalMilestones,
    isComplete,
    taxBasis,
    setTaxBasis,
    skogskontoBalance,
    setSkogskontoBalance,
    formatSEK,
  };
}
