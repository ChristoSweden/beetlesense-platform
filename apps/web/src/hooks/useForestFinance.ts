/**
 * useForestFinance — Hook providing real-time forest valuation, green loan offers,
 * collateral certificate data, and investment analysis for the Green Finance Gateway.
 *
 * Demo: estate worth 12.5 MSEK, eligible for 8 MSEK green loan at 2.1% vs standard 4.2%.
 */

import { useState, useMemo, useCallback } from 'react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// ─── Types ───

export type ValuationCategory = 'mark' | 'virke' | 'kolkredit' | 'ekosystem';

export interface ValuationBreakdown {
  category: ValuationCategory;
  label: string;
  valueSEK: number;
  percentage: number;
  color: string;
  description: string;
}

export interface QuarterlySnapshot {
  quarter: string; // e.g. "Q1 2024"
  date: string;
  totalValueSEK: number;
  markSEK: number;
  virkeSEK: number;
  kolkreditSEK: number;
  ekosystemSEK: number;
}

export interface ParcelValuation {
  parcelId: string;
  parcelName: string;
  areaHa: number;
  municipality: string;
  totalValueSEK: number;
  perHectareSEK: number;
  timberVolumeM3: number;
  carbonTonsCO2: number;
  healthScore: number;
}

export interface GreenLoanOffer {
  id: string;
  bankName: string;
  bankLogo: string; // emoji placeholder
  interestRate: number; // percentage
  standardRate: number; // standard non-green rate
  maxLTV: number; // loan-to-value ratio percentage
  maxLoanSEK: number;
  termYears: number[];
  setupFee: number; // percentage
  annualFee: number; // SEK
  requirements: string[];
  greenBondProgram: boolean;
  euTaxonomyAligned: boolean;
  specialization: string;
  applicationUrl: string;
  preQualified: boolean;
}

export interface CollateralCertificateData {
  certificateId: string;
  propertyDesignation: string;
  ownerName: string;
  totalAreaHa: number;
  totalValueSEK: number;
  valuationDate: string;
  validUntil: string;
  methodology: string;
  confidenceInterval: number; // percentage
  parcels: ParcelValuation[];
  breakdown: ValuationBreakdown[];
  carbonCertified: boolean;
  fscCertified: boolean;
  pefcCertified: boolean;
  satelliteVerified: boolean;
  riskRating: 'low' | 'medium' | 'high';
  riskFactors: string[];
  verificationUrl: string;
}

export interface InvestmentMetrics {
  annualReturn: number;
  timberIncome: number;
  valueAppreciation: number;
  carbonRevenue: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  inflationCorrelation: number;
}

export interface AssetComparison {
  asset: string;
  color: string;
  returns: number[]; // yearly returns over 20 years (cumulative %)
}

export interface MonthlyPayment {
  loanAmountSEK: number;
  termYears: number;
  interestRate: number;
  monthlyPaymentSEK: number;
  totalInterestSEK: number;
  totalPaymentSEK: number;
}

// ─── Demo Data ───

const VALUATION_BREAKDOWN: ValuationBreakdown[] = [
  {
    category: 'mark',
    label: 'Mark (land)',
    valueSEK: 5_625_000,
    percentage: 45,
    color: '#4ade80',
    description: 'Marknadsvärde baserat på jämförbara försäljningar i Småland',
  },
  {
    category: 'virke',
    label: 'Virke (timber)',
    valueSEK: 4_375_000,
    percentage: 35,
    color: '#86efac',
    description: 'Stående virkesvolym värderad efter aktuella timmerpriser',
  },
  {
    category: 'kolkredit',
    label: 'Kolkredit (carbon)',
    valueSEK: 1_500_000,
    percentage: 12,
    color: '#22c55e',
    description: 'Beräknad koldioxidbindning värderad via EU ETS + frivillig marknad',
  },
  {
    category: 'ekosystem',
    label: 'Ekosystem (services)',
    valueSEK: 1_000_000,
    percentage: 8,
    color: '#166534',
    description: 'Biologisk mångfald, vattenrening, rekreation',
  },
];

const QUARTERLY_HISTORY: QuarterlySnapshot[] = [
  { quarter: 'Q1 2024', date: '2024-03-31', totalValueSEK: 10_800_000, markSEK: 4_860_000, virkeSEK: 3_780_000, kolkreditSEK: 1_296_000, ekosystemSEK: 864_000 },
  { quarter: 'Q2 2024', date: '2024-06-30', totalValueSEK: 11_100_000, markSEK: 4_995_000, virkeSEK: 3_885_000, kolkreditSEK: 1_332_000, ekosystemSEK: 888_000 },
  { quarter: 'Q3 2024', date: '2024-09-30', totalValueSEK: 11_350_000, markSEK: 5_107_500, virkeSEK: 3_972_500, kolkreditSEK: 1_362_000, ekosystemSEK: 908_000 },
  { quarter: 'Q4 2024', date: '2024-12-31', totalValueSEK: 11_600_000, markSEK: 5_220_000, virkeSEK: 4_060_000, kolkreditSEK: 1_392_000, ekosystemSEK: 928_000 },
  { quarter: 'Q1 2025', date: '2025-03-31', totalValueSEK: 11_900_000, markSEK: 5_355_000, virkeSEK: 4_165_000, kolkreditSEK: 1_428_000, ekosystemSEK: 952_000 },
  { quarter: 'Q2 2025', date: '2025-06-30', totalValueSEK: 12_050_000, markSEK: 5_422_500, virkeSEK: 4_217_500, kolkreditSEK: 1_446_000, ekosystemSEK: 964_000 },
  { quarter: 'Q3 2025', date: '2025-09-30', totalValueSEK: 12_200_000, markSEK: 5_490_000, virkeSEK: 4_270_000, kolkreditSEK: 1_464_000, ekosystemSEK: 976_000 },
  { quarter: 'Q4 2025', date: '2025-12-31', totalValueSEK: 12_350_000, markSEK: 5_557_500, virkeSEK: 4_322_500, kolkreditSEK: 1_482_000, ekosystemSEK: 988_000 },
  { quarter: 'Q1 2026', date: '2026-03-17', totalValueSEK: 12_500_000, markSEK: 5_625_000, virkeSEK: 4_375_000, kolkreditSEK: 1_500_000, ekosystemSEK: 1_000_000 },
];

const PARCEL_VALUATIONS: ParcelValuation[] = DEMO_PARCELS.map((p: DemoParcel) => {
  const perHa = p.status === 'infested' ? 42_000 : p.status === 'at_risk' ? 52_000 : 62_000;
  const totalValue = Math.round(p.area_hectares * perHa);
  return {
    parcelId: p.id,
    parcelName: p.name,
    areaHa: p.area_hectares,
    municipality: p.municipality,
    totalValueSEK: totalValue,
    perHectareSEK: perHa,
    timberVolumeM3: Math.round(p.area_hectares * 185),
    carbonTonsCO2: Math.round(p.area_hectares * 42),
    healthScore: p.status === 'healthy' ? 88 : p.status === 'at_risk' ? 62 : p.status === 'infested' ? 35 : 50,
  };
});

const GREEN_LOAN_OFFERS: GreenLoanOffer[] = [
  {
    id: 'gl-1',
    bankName: 'Landshypotek',
    bankLogo: '🏦',
    interestRate: 2.1,
    standardRate: 4.2,
    maxLTV: 75,
    maxLoanSEK: 9_375_000,
    termYears: [5, 10, 15, 20, 25],
    setupFee: 0.5,
    annualFee: 0,
    requirements: ['Skogsbruksplan < 3 år', 'Min. 50 ha', 'Hållbart brukande'],
    greenBondProgram: true,
    euTaxonomyAligned: true,
    specialization: 'Sveriges ledande skogskreditinstitut',
    applicationUrl: '#',
    preQualified: true,
  },
  {
    id: 'gl-2',
    bankName: 'Länsförsäkringar',
    bankLogo: '🛡️',
    interestRate: 2.2,
    standardRate: 4.3,
    maxLTV: 70,
    maxLoanSEK: 8_750_000,
    termYears: [5, 10, 15, 20],
    setupFee: 0.4,
    annualFee: 0,
    requirements: ['Skogsbruksplan', 'Brandförsäkring', 'FSC/PEFC certifiering'],
    greenBondProgram: true,
    euTaxonomyAligned: true,
    specialization: 'Kombinerat försäkring + lån',
    applicationUrl: '#',
    preQualified: true,
  },
  {
    id: 'gl-3',
    bankName: 'SEB',
    bankLogo: '🟢',
    interestRate: 2.3,
    standardRate: 4.4,
    maxLTV: 65,
    maxLoanSEK: 8_125_000,
    termYears: [5, 10, 15, 20],
    setupFee: 0.6,
    annualFee: 500,
    requirements: ['Hållbarhetsrapport', 'Min. 30 ha', 'Aktiv skötsel'],
    greenBondProgram: true,
    euTaxonomyAligned: true,
    specialization: 'Hållbarhetslänkade villkor',
    applicationUrl: '#',
    preQualified: true,
  },
  {
    id: 'gl-4',
    bankName: 'Handelsbanken',
    bankLogo: '🔵',
    interestRate: 2.4,
    standardRate: 4.5,
    maxLTV: 60,
    maxLoanSEK: 7_500_000,
    termYears: [5, 10, 15, 20, 25, 30],
    setupFee: 0.5,
    annualFee: 0,
    requirements: ['Värderingsintyg', 'Min. 20 ha', 'Hållbart skogsbruk'],
    greenBondProgram: true,
    euTaxonomyAligned: true,
    specialization: 'Grönt obligationsprogram',
    applicationUrl: '#',
    preQualified: true,
  },
  {
    id: 'gl-5',
    bankName: 'Swedbank',
    bankLogo: '🟠',
    interestRate: 2.5,
    standardRate: 4.5,
    maxLTV: 60,
    maxLoanSEK: 7_500_000,
    termYears: [5, 10, 15, 20],
    setupFee: 0.5,
    annualFee: 300,
    requirements: ['Skogsbruksplan', 'Ingen avverkning > 50%', 'Biodiversitetsplan'],
    greenBondProgram: false,
    euTaxonomyAligned: true,
    specialization: 'Lokal närvaro i Småland',
    applicationUrl: '#',
    preQualified: false,
  },
  {
    id: 'gl-6',
    bankName: 'Nordea',
    bankLogo: '⭐',
    interestRate: 2.6,
    standardRate: 4.6,
    maxLTV: 55,
    maxLoanSEK: 6_875_000,
    termYears: [5, 10, 15, 20],
    setupFee: 0.7,
    annualFee: 600,
    requirements: ['Grön certifiering', 'Min. 40 ha', 'Klimatrapport'],
    greenBondProgram: true,
    euTaxonomyAligned: true,
    specialization: 'Nordisk skogsstrategi',
    applicationUrl: '#',
    preQualified: false,
  },
];

const ASSET_COMPARISONS: AssetComparison[] = [
  {
    asset: 'Svensk skog',
    color: '#4ade80',
    returns: [10, 21, 33, 46, 60, 75, 91, 108, 127, 147, 168, 191, 216, 242, 270, 300, 332, 366, 402, 440],
  },
  {
    asset: 'Stockholmsbörsen',
    color: '#60a5fa',
    returns: [8, 14, 25, 30, 42, 38, 50, 62, 58, 70, 82, 75, 90, 105, 98, 115, 130, 125, 142, 160],
  },
  {
    asset: 'Obligationer',
    color: '#a78bfa',
    returns: [3, 6, 9, 12, 15, 18, 21, 25, 28, 31, 35, 38, 42, 45, 49, 52, 56, 60, 63, 67],
  },
  {
    asset: 'Fastigheter',
    color: '#fbbf24',
    returns: [6, 13, 20, 28, 36, 45, 54, 64, 74, 85, 96, 108, 120, 133, 147, 161, 176, 192, 208, 225],
  },
];

const INVESTMENT_METRICS: InvestmentMetrics = {
  annualReturn: 9.8,
  timberIncome: 3.2,
  valueAppreciation: 5.1,
  carbonRevenue: 1.5,
  sharpeRatio: 1.42,
  volatility: 6.8,
  maxDrawdown: -12.5,
  inflationCorrelation: 0.78,
};

// ─── Hook ───

export function useForestFinance() {
  const [selectedLoanAmount, setSelectedLoanAmount] = useState(8_000_000);
  const [selectedTerm, setSelectedTerm] = useState(10);
  const [activeTab, setActiveTab] = useState<'valuation' | 'loans' | 'certificate' | 'investment'>('valuation');

  const totalValue = 12_500_000;
  const confidenceInterval = 8;

  const calculateMonthlyPayment = useCallback(
    (loanAmount: number, termYears: number, rate: number): MonthlyPayment => {
      const monthlyRate = rate / 100 / 12;
      const numPayments = termYears * 12;
      const monthly =
        monthlyRate === 0
          ? loanAmount / numPayments
          : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1);
      const totalPayment = monthly * numPayments;
      return {
        loanAmountSEK: loanAmount,
        termYears,
        interestRate: rate,
        monthlyPaymentSEK: Math.round(monthly),
        totalInterestSEK: Math.round(totalPayment - loanAmount),
        totalPaymentSEK: Math.round(totalPayment),
      };
    },
    [],
  );

  const greenPayment = useMemo(
    () => calculateMonthlyPayment(selectedLoanAmount, selectedTerm, 2.1),
    [selectedLoanAmount, selectedTerm, calculateMonthlyPayment],
  );

  const standardPayment = useMemo(
    () => calculateMonthlyPayment(selectedLoanAmount, selectedTerm, 4.2),
    [selectedLoanAmount, selectedTerm, calculateMonthlyPayment],
  );

  const interestSavings = standardPayment.totalInterestSEK - greenPayment.totalInterestSEK;

  const certificate: CollateralCertificateData = useMemo(
    () => ({
      certificateId: 'BSC-2026-00847',
      propertyDesignation: 'Värnamo Norra 3:14',
      ownerName: 'Erik Johansson',
      totalAreaHa: DEMO_PARCELS.reduce((sum, p) => sum + p.area_hectares, 0),
      totalValueSEK: totalValue,
      valuationDate: '2026-03-17',
      validUntil: '2026-06-15',
      methodology: 'BeetleSense AI Valuation v3.2 — Satellite + LiDAR + Market Data Fusion',
      confidenceInterval,
      parcels: PARCEL_VALUATIONS,
      breakdown: VALUATION_BREAKDOWN,
      carbonCertified: true,
      fscCertified: true,
      pefcCertified: false,
      satelliteVerified: true,
      riskRating: 'low',
      riskFactors: [
        'Barkborre-risk i Granudden (parcel p4) — aktiv övervakning',
        'Stormrisk: låg (skyddat läge)',
        'Brandrisk: låg (normal nederbörd)',
      ],
      verificationUrl: 'https://verify.beetlesense.ai/BSC-2026-00847',
    }),
    [],
  );

  return {
    // Valuation
    totalValue,
    confidenceInterval,
    breakdown: VALUATION_BREAKDOWN,
    quarterlyHistory: QUARTERLY_HISTORY,
    parcelValuations: PARCEL_VALUATIONS,
    lastUpdated: '2026-03-17T08:45:00Z',

    // Green loans
    loanOffers: GREEN_LOAN_OFFERS,
    selectedLoanAmount,
    setSelectedLoanAmount,
    selectedTerm,
    setSelectedTerm,
    greenPayment,
    standardPayment,
    interestSavings,
    calculateMonthlyPayment,

    // Certificate
    certificate,

    // Investment analysis
    investmentMetrics: INVESTMENT_METRICS,
    assetComparisons: ASSET_COMPARISONS,

    // Tab state
    activeTab,
    setActiveTab,
  };
}
