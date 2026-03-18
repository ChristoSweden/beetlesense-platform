/**
 * useTimberHedging — Hook providing timber price hedging data and actions.
 * Manages exposure analysis, forward contracts, price insurance, active hedges,
 * and hedging strategy recommendations for forest owners.
 */

import { useState, useCallback, useMemo } from 'react';

// ─── Types ───

export type Assortment = 'grantimmer' | 'talltimmer' | 'granmassaved' | 'tallmassaved' | 'björkmassaved';

export interface TimberExposure {
  id: string;
  assortment: Assortment;
  label: string;
  volumeM3: number;
  hedgedM3: number;
  spotPriceSEK: number;
  estimatedHarvestDate: string;
  priceVolatilityPct: number; // historical std dev as %
}

export interface ForwardContract {
  id: string;
  assortment: Assortment;
  label: string;
  guaranteedPriceSEK: number;
  spotPriceSEK: number;
  deliveryWindow: string;
  minVolumeM3: number;
  maxVolumeM3: number;
  counterparty: string;
  feePct: number;
  expiresAt: string;
}

export interface InsuranceQuote {
  id: string;
  assortment: Assortment;
  label: string;
  floorPriceSEK: number;
  spotPriceSEK: number;
  premiumPct: number;
  coveragePeriod: string;
  maxVolumeM3: number;
}

export type HedgeType = 'forward' | 'insurance';
export type HedgeStatus = 'active' | 'expired' | 'closed';

export interface ActiveHedge {
  id: string;
  type: HedgeType;
  assortment: Assortment;
  label: string;
  volumeM3: number;
  lockedPriceSEK: number;
  currentSpotSEK: number;
  pnlSEK: number;
  pnlPerM3SEK: number;
  deliveryWindow: string;
  counterparty: string;
  createdAt: string;
  expiresAt: string;
  status: HedgeStatus;
  // Insurance-specific
  premiumPaidSEK?: number;
  floorPriceSEK?: number;
  isInTheMoney?: boolean;
}

export interface HedgingRecommendation {
  id: string;
  title: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  action: string;
}

export interface PnlHistoryPoint {
  date: string;
  totalPnlSEK: number;
}

export interface HedgingState {
  exposures: TimberExposure[];
  forwardContracts: ForwardContract[];
  insuranceQuotes: InsuranceQuote[];
  activeHedges: ActiveHedge[];
  recommendations: HedgingRecommendation[];
  pnlHistory: PnlHistoryPoint[];
  // Computed summaries
  totalUnhedgedM3: number;
  totalHedgedM3: number;
  hedgeRatioPct: number;
  totalUnhedgedValueSEK: number;
  totalPnlSEK: number;
  valueAtRisk10: number;
  valueAtRisk20: number;
  valueAtRisk30: number;
  // Actions
  signForwardContract: (contractId: string, volumeM3: number) => void;
  purchaseInsurance: (quoteId: string, volumeM3: number, floorPriceSEK: number) => void;
  closeHedge: (hedgeId: string) => void;
  rollForward: (hedgeId: string) => void;
}

// ─── Demo data ───

const DEMO_EXPOSURES: TimberExposure[] = [
  {
    id: 'exp-1',
    assortment: 'grantimmer',
    label: 'Grantimmer',
    volumeM3: 500,
    hedgedM3: 200,
    spotPriceSEK: 720,
    estimatedHarvestDate: '2026-09',
    priceVolatilityPct: 12.5,
  },
  {
    id: 'exp-2',
    assortment: 'tallmassaved',
    label: 'Tallmassaved',
    volumeM3: 300,
    hedgedM3: 300,
    spotPriceSEK: 365,
    estimatedHarvestDate: '2027-03',
    priceVolatilityPct: 8.2,
  },
  {
    id: 'exp-3',
    assortment: 'granmassaved',
    label: 'Granmassaved',
    volumeM3: 200,
    hedgedM3: 0,
    spotPriceSEK: 340,
    estimatedHarvestDate: '2027-06',
    priceVolatilityPct: 9.1,
  },
  {
    id: 'exp-4',
    assortment: 'talltimmer',
    label: 'Talltimmer',
    volumeM3: 150,
    hedgedM3: 0,
    spotPriceSEK: 680,
    estimatedHarvestDate: '2026-12',
    priceVolatilityPct: 11.3,
  },
];

const DEMO_FORWARD_CONTRACTS: ForwardContract[] = [
  {
    id: 'fc-1',
    assortment: 'grantimmer',
    label: 'Grantimmer',
    guaranteedPriceSEK: 750,
    spotPriceSEK: 720,
    deliveryWindow: 'Q3 2026',
    minVolumeM3: 50,
    maxVolumeM3: 500,
    counterparty: 'Södra Skogsägarna',
    feePct: 1.5,
    expiresAt: '2026-06-30',
  },
  {
    id: 'fc-2',
    assortment: 'tallmassaved',
    label: 'Tallmassaved',
    guaranteedPriceSEK: 690,
    spotPriceSEK: 365,
    deliveryWindow: 'Q1 2027',
    minVolumeM3: 50,
    maxVolumeM3: 400,
    counterparty: 'Holmen Skog',
    feePct: 1.2,
    expiresAt: '2026-09-30',
  },
  {
    id: 'fc-3',
    assortment: 'granmassaved',
    label: 'Granmassaved',
    guaranteedPriceSEK: 355,
    spotPriceSEK: 340,
    deliveryWindow: 'Q2 2027',
    minVolumeM3: 100,
    maxVolumeM3: 600,
    counterparty: 'SCA Skog',
    feePct: 1.0,
    expiresAt: '2026-12-31',
  },
  {
    id: 'fc-4',
    assortment: 'talltimmer',
    label: 'Talltimmer',
    guaranteedPriceSEK: 710,
    spotPriceSEK: 680,
    deliveryWindow: 'Q4 2026',
    minVolumeM3: 50,
    maxVolumeM3: 300,
    counterparty: 'Sveaskog',
    feePct: 1.3,
    expiresAt: '2026-08-15',
  },
];

const DEMO_INSURANCE_QUOTES: InsuranceQuote[] = [
  {
    id: 'ins-1',
    assortment: 'grantimmer',
    label: 'Grantimmer',
    floorPriceSEK: 650,
    spotPriceSEK: 720,
    premiumPct: 4.5,
    coveragePeriod: 'Q3 2026 – Q1 2027',
    maxVolumeM3: 500,
  },
  {
    id: 'ins-2',
    assortment: 'talltimmer',
    label: 'Talltimmer',
    floorPriceSEK: 600,
    spotPriceSEK: 680,
    premiumPct: 5.2,
    coveragePeriod: 'Q4 2026 – Q2 2027',
    maxVolumeM3: 300,
  },
  {
    id: 'ins-3',
    assortment: 'granmassaved',
    label: 'Granmassaved',
    floorPriceSEK: 300,
    spotPriceSEK: 340,
    premiumPct: 3.8,
    coveragePeriod: 'Q2 2027 – Q4 2027',
    maxVolumeM3: 400,
  },
];

const DEMO_ACTIVE_HEDGES: ActiveHedge[] = [
  {
    id: 'ah-1',
    type: 'forward',
    assortment: 'grantimmer',
    label: 'Grantimmer',
    volumeM3: 200,
    lockedPriceSEK: 745,
    currentSpotSEK: 720,
    pnlSEK: 5000,
    pnlPerM3SEK: 25,
    deliveryWindow: 'Q3 2026',
    counterparty: 'Södra Skogsägarna',
    createdAt: '2026-01-15',
    expiresAt: '2026-09-30',
    status: 'active',
  },
  {
    id: 'ah-2',
    type: 'insurance',
    assortment: 'tallmassaved',
    label: 'Tallmassaved',
    volumeM3: 300,
    lockedPriceSEK: 350,
    currentSpotSEK: 365,
    pnlSEK: -8400,
    pnlPerM3SEK: 0,
    deliveryWindow: 'Q1 2027',
    counterparty: 'Länsförsäkringar Skog',
    createdAt: '2026-02-01',
    expiresAt: '2027-03-31',
    status: 'active',
    premiumPaidSEK: 8400,
    floorPriceSEK: 350,
    isInTheMoney: false,
  },
];

const DEMO_RECOMMENDATIONS: HedgingRecommendation[] = [
  {
    id: 'rec-1',
    title: 'Hedga grantimmer-exponeringen',
    description: 'Du har 300 m³ ohedgat grantimmer med planerad avverkning Q3 2026. Nuvarande terminskontrakt erbjuder 750 SEK/m³ — 4.2% över spot. Med 12.5% historisk volatilitet är detta en bra tid att låsa priset.',
    urgency: 'high',
    action: 'Visa terminskontrakt',
  },
  {
    id: 'rec-2',
    title: 'Överväg prisförsäkring för talltimmer',
    description: 'Din talltimmer-exponering (150 m³) är helt ohedgad. Priserna är på historiskt höga nivåer. En prisförsäkring med golv 600 SEK/m³ kostar bara 5.2% men skyddar mot nedgång.',
    urgency: 'medium',
    action: 'Visa prisförsäkring',
  },
  {
    id: 'rec-3',
    title: 'Granmassaved: avvakta',
    description: 'Pristrenden för granmassaved är uppåtgående. Med leverans Q2 2027 har du tid att vänta. Överväg hedging om priset når 370 SEK/m³.',
    urgency: 'low',
    action: 'Bevaka pris',
  },
];

const DEMO_PNL_HISTORY: PnlHistoryPoint[] = [
  { date: '2026-01-15', totalPnlSEK: 0 },
  { date: '2026-01-31', totalPnlSEK: 1200 },
  { date: '2026-02-07', totalPnlSEK: 2800 },
  { date: '2026-02-14', totalPnlSEK: 1500 },
  { date: '2026-02-21', totalPnlSEK: 3200 },
  { date: '2026-02-28', totalPnlSEK: -1800 },
  { date: '2026-03-07', totalPnlSEK: -3400 },
  { date: '2026-03-14', totalPnlSEK: -3400 },
  { date: '2026-03-17', totalPnlSEK: -3400 },
];

// ─── Hook ───

export function useTimberHedging(): HedgingState {
  const [activeHedges, setActiveHedges] = useState<ActiveHedge[]>(DEMO_ACTIVE_HEDGES);

  const exposures = DEMO_EXPOSURES;
  const forwardContracts = DEMO_FORWARD_CONTRACTS;
  const insuranceQuotes = DEMO_INSURANCE_QUOTES;
  const recommendations = DEMO_RECOMMENDATIONS;
  const pnlHistory = DEMO_PNL_HISTORY;

  // Computed summaries
  const totalUnhedgedM3 = useMemo(
    () => exposures.reduce((sum, e) => sum + (e.volumeM3 - e.hedgedM3), 0),
    [exposures],
  );

  const totalHedgedM3 = useMemo(
    () => exposures.reduce((sum, e) => sum + e.hedgedM3, 0),
    [exposures],
  );

  const totalPlannedM3 = useMemo(
    () => exposures.reduce((sum, e) => sum + e.volumeM3, 0),
    [exposures],
  );

  const hedgeRatioPct = useMemo(
    () => (totalPlannedM3 > 0 ? Math.round((totalHedgedM3 / totalPlannedM3) * 100) : 0),
    [totalHedgedM3, totalPlannedM3],
  );

  const totalUnhedgedValueSEK = useMemo(
    () => exposures.reduce((sum, e) => sum + (e.volumeM3 - e.hedgedM3) * e.spotPriceSEK, 0),
    [exposures],
  );

  const totalPnlSEK = useMemo(
    () => activeHedges.reduce((sum, h) => sum + h.pnlSEK, 0),
    [activeHedges],
  );

  const valueAtRisk10 = useMemo(() => Math.round(totalUnhedgedValueSEK * 0.1), [totalUnhedgedValueSEK]);
  const valueAtRisk20 = useMemo(() => Math.round(totalUnhedgedValueSEK * 0.2), [totalUnhedgedValueSEK]);
  const valueAtRisk30 = useMemo(() => Math.round(totalUnhedgedValueSEK * 0.3), [totalUnhedgedValueSEK]);

  const signForwardContract = useCallback((contractId: string, volumeM3: number) => {
    const contract = forwardContracts.find((c) => c.id === contractId);
    if (!contract) return;

    const newHedge: ActiveHedge = {
      id: `ah-${Date.now()}`,
      type: 'forward',
      assortment: contract.assortment,
      label: contract.label,
      volumeM3,
      lockedPriceSEK: contract.guaranteedPriceSEK,
      currentSpotSEK: contract.spotPriceSEK,
      pnlSEK: (contract.guaranteedPriceSEK - contract.spotPriceSEK) * volumeM3,
      pnlPerM3SEK: contract.guaranteedPriceSEK - contract.spotPriceSEK,
      deliveryWindow: contract.deliveryWindow,
      counterparty: contract.counterparty,
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt: contract.expiresAt,
      status: 'active',
    };

    setActiveHedges((prev) => [...prev, newHedge]);
  }, [forwardContracts]);

  const purchaseInsurance = useCallback((quoteId: string, volumeM3: number, floorPriceSEK: number) => {
    const quote = insuranceQuotes.find((q) => q.id === quoteId);
    if (!quote) return;

    const premiumSEK = Math.round(volumeM3 * floorPriceSEK * (quote.premiumPct / 100));
    const newHedge: ActiveHedge = {
      id: `ah-${Date.now()}`,
      type: 'insurance',
      assortment: quote.assortment,
      label: quote.label,
      volumeM3,
      lockedPriceSEK: floorPriceSEK,
      currentSpotSEK: quote.spotPriceSEK,
      pnlSEK: -premiumSEK,
      pnlPerM3SEK: 0,
      deliveryWindow: quote.coveragePeriod,
      counterparty: 'Länsförsäkringar Skog',
      createdAt: new Date().toISOString().slice(0, 10),
      expiresAt: '2027-12-31',
      status: 'active',
      premiumPaidSEK: premiumSEK,
      floorPriceSEK,
      isInTheMoney: quote.spotPriceSEK < floorPriceSEK,
    };

    setActiveHedges((prev) => [...prev, newHedge]);
  }, [insuranceQuotes]);

  const closeHedge = useCallback((hedgeId: string) => {
    setActiveHedges((prev) =>
      prev.map((h) => (h.id === hedgeId ? { ...h, status: 'closed' as HedgeStatus } : h)),
    );
  }, []);

  const rollForward = useCallback((hedgeId: string) => {
    setActiveHedges((prev) =>
      prev.map((h) => {
        if (h.id !== hedgeId) return h;
        const newExpiry = new Date(h.expiresAt);
        newExpiry.setMonth(newExpiry.getMonth() + 3);
        return { ...h, expiresAt: newExpiry.toISOString().slice(0, 10) };
      }),
    );
  }, []);

  return {
    exposures,
    forwardContracts,
    insuranceQuotes,
    activeHedges,
    recommendations,
    pnlHistory,
    totalUnhedgedM3,
    totalHedgedM3,
    hedgeRatioPct,
    totalUnhedgedValueSEK,
    totalPnlSEK,
    valueAtRisk10,
    valueAtRisk20,
    valueAtRisk30,
    signForwardContract,
    purchaseInsurance,
    closeHedge,
    rollForward,
  };
}
