/**
 * useEcosystemServices — quantifies 7 ecosystem services per forest parcel.
 *
 * Values based on Swedish research:
 * - Naturvårdsverket PES pilot programs
 * - SLU ecosystem valuation studies
 * - TEEB (The Economics of Ecosystems & Biodiversity) Nordic reports
 * - Replacement cost / avoided damage cost methodologies
 */

import { useMemo } from 'react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// ─── Types ───

export type ServiceStatus = 'monetized' | 'potential' | 'not_applicable';
export type ServiceTrend = 'increasing' | 'stable' | 'decreasing';
export type VerificationMethod = 'satellite' | 'hydrology_model' | 'biodiversity_survey' | 'field_measurement' | 'visitor_statistics';
export type BuyerType = 'kommun' | 'vattenbolag' | 'jordbrukare' | 'trafikverket' | 'länsstyrelse' | 'turismbolag' | 'energibolag';

export interface EcosystemBuyer {
  id: string;
  name: string;
  type: BuyerType;
  potentialContractSEK: number;
  contractType: 'annual' | 'multi_year';
  contactEmail: string;
  status: 'matched' | 'contacted' | 'negotiating' | 'contracted';
}

export interface EcosystemService {
  id: string;
  nameEn: string;
  nameSv: string;
  icon: string;
  /** Output quantity (e.g., m³, tonnes, ha, visitor-days) */
  quantity: number;
  unit: string;
  unitSv: string;
  /** Formatted output string */
  outputDescription: string;
  /** SEK per hectare per year — range */
  priceLow: number;
  priceHigh: number;
  /** Actual SEK/ha/year used for this parcel */
  pricePerHa: number;
  /** Total annual value for the parcel */
  annualValueSEK: number;
  status: ServiceStatus;
  trend: ServiceTrend;
  verificationMethod: VerificationMethod;
  buyers: EcosystemBuyer[];
  /** Percentage of total ecosystem value */
  sharePercent: number;
  color: string;
}

export interface ParcelEcosystemAnalysis {
  parcelId: string;
  parcelName: string;
  areaHa: number;
  services: EcosystemService[];
  totalEcosystemValueSEK: number;
  timberValueSEK: number;
  carbonValueSEK: number;
  totalForestValueSEK: number;
  timberSharePercent: number;
  ecosystemSharePercent: number;
  carbonSharePercent: number;
}

export interface PESContract {
  id: string;
  serviceId: string;
  serviceName: string;
  buyerName: string;
  annualPaymentSEK: number;
  durationYears: number;
  startDate: string;
  verificationMethod: VerificationMethod;
  reportingFrequency: 'quarterly' | 'annual';
  status: 'active' | 'pending' | 'expired';
  areaHa: number;
}

export interface EcosystemSummary {
  analyses: ParcelEcosystemAnalysis[];
  totalEcosystemValueSEK: number;
  totalTimberValueSEK: number;
  totalCarbonValueSEK: number;
  totalForestValueSEK: number;
  timberSharePercent: number;
  ecosystemSharePercent: number;
  carbonSharePercent: number;
  pesContracts: PESContract[];
  activePESRevenueSEK: number;
  projectedPES10YearSEK: number;
  allBuyers: EcosystemBuyer[];
}

// ─── Pricing constants (SEK/ha/year) ───

const PRICING = {
  water: { low: 200, high: 500 },
  flood: { low: 100, high: 400 },
  air: { low: 50, high: 200 },
  pollination: { low: 100, high: 300 },
  recreation: { low: 150, high: 500 },
  erosion: { low: 50, high: 150 },
  carbon: { low: 400, high: 800 },
} as const;

// ─── Service colors ───

const COLORS = {
  water: '#38bdf8',
  flood: '#818cf8',
  air: '#a78bfa',
  pollination: '#f59e0b',
  carbon: '#4ade80',
  recreation: '#fb923c',
  erosion: '#a3a3a3',
  timber: '#92400e',
} as const;

// ─── Buyer database ───

const BUYER_DB: Record<string, EcosystemBuyer[]> = {
  water: [
    { id: 'b1', name: 'Värnamo kommun vattenverk', type: 'vattenbolag', potentialContractSEK: 45000, contractType: 'multi_year', contactEmail: 'vatten@varnamo.se', status: 'matched' },
    { id: 'b2', name: 'Sydvatten AB', type: 'vattenbolag', potentialContractSEK: 62000, contractType: 'multi_year', contactEmail: 'pes@sydvatten.se', status: 'contacted' },
  ],
  flood: [
    { id: 'b3', name: 'Länsstyrelsen Jönköping', type: 'länsstyrelse', potentialContractSEK: 38000, contractType: 'annual', contactEmail: 'miljo@lansstyrelsen.se', status: 'matched' },
    { id: 'b4', name: 'Värnamo kommun', type: 'kommun', potentialContractSEK: 28000, contractType: 'annual', contactEmail: 'klimat@varnamo.se', status: 'negotiating' },
  ],
  air: [
    { id: 'b5', name: 'Jönköpings kommun', type: 'kommun', potentialContractSEK: 22000, contractType: 'annual', contactEmail: 'miljo@jonkoping.se', status: 'matched' },
  ],
  pollination: [
    { id: 'b6', name: 'Lantbrukarkooperativ Småland', type: 'jordbrukare', potentialContractSEK: 35000, contractType: 'annual', contactEmail: 'info@smalandlantbruk.se', status: 'matched' },
    { id: 'b7', name: 'Gislaveds kommun jordbruk', type: 'kommun', potentialContractSEK: 18000, contractType: 'annual', contactEmail: 'lantbruk@gislaved.se', status: 'matched' },
  ],
  recreation: [
    { id: 'b8', name: 'Naturturism Småland', type: 'turismbolag', potentialContractSEK: 55000, contractType: 'multi_year', contactEmail: 'samarbete@naturturism.se', status: 'contacted' },
    { id: 'b9', name: 'Värnamo kommun friluftsstrategi', type: 'kommun', potentialContractSEK: 30000, contractType: 'multi_year', contactEmail: 'friluftsliv@varnamo.se', status: 'matched' },
  ],
  erosion: [
    { id: 'b10', name: 'Trafikverket Region Syd', type: 'trafikverket', potentialContractSEK: 25000, contractType: 'multi_year', contactEmail: 'miljo@trafikverket.se', status: 'matched' },
  ],
};

// ─── Demo PES contracts ───

const DEMO_PES_CONTRACTS: PESContract[] = [
  {
    id: 'pes1',
    serviceId: 'water',
    serviceName: 'Vattenrening',
    buyerName: 'Värnamo kommun vattenverk',
    annualPaymentSEK: 14200,
    durationYears: 5,
    startDate: '2025-06-01',
    verificationMethod: 'hydrology_model',
    reportingFrequency: 'annual',
    status: 'active',
    areaHa: 42.5,
  },
  {
    id: 'pes2',
    serviceId: 'flood',
    serviceName: 'Översvämningsskydd',
    buyerName: 'Länsstyrelsen Jönköping',
    annualPaymentSEK: 8400,
    durationYears: 3,
    startDate: '2025-09-01',
    verificationMethod: 'hydrology_model',
    reportingFrequency: 'annual',
    status: 'active',
    areaHa: 42.5,
  },
  {
    id: 'pes3',
    serviceId: 'recreation',
    serviceName: 'Rekreation',
    buyerName: 'Naturturism Småland',
    annualPaymentSEK: 6500,
    durationYears: 3,
    startDate: '2026-01-01',
    verificationMethod: 'visitor_statistics',
    reportingFrequency: 'quarterly',
    status: 'pending',
    areaHa: 18.3,
  },
];

// ─── Calculation helpers ───

function getWaterPrice(parcel: DemoParcel): number {
  // Higher for clay/peat soils near water sources, spruce-heavy stands filter more
  const soilBonus = parcel.soil_type === 'Clay' ? 1.3 : parcel.soil_type === 'Peat' ? 1.4 : 1.0;
  const base = 320 * soilBonus;
  return Math.min(PRICING.water.high, Math.max(PRICING.water.low, Math.round(base)));
}

function getFloodPrice(parcel: DemoParcel): number {
  // Higher for low elevation, peat soil retains more
  const elevBonus = parcel.elevation_m < 250 ? 1.3 : 1.0;
  const soilBonus = parcel.soil_type === 'Peat' ? 1.5 : parcel.soil_type === 'Clay' ? 1.2 : 1.0;
  const base = 200 * elevBonus * soilBonus;
  return Math.min(PRICING.flood.high, Math.max(PRICING.flood.low, Math.round(base)));
}

function getAirPrice(parcel: DemoParcel): number {
  // More value near urban areas
  const muni = parcel.municipality;
  const urbanBonus = muni === 'Jönköping' ? 1.5 : muni === 'Värnamo' ? 1.2 : 1.0;
  const base = 120 * urbanBonus;
  return Math.min(PRICING.air.high, Math.max(PRICING.air.low, Math.round(base)));
}

function getPollinationPrice(parcel: DemoParcel): number {
  // Higher for deciduous/mixed stands near agricultural land
  const deciduousPct = parcel.species_mix.filter(s => ['Birch', 'Oak', 'Alder'].includes(s.species)).reduce((s, sp) => s + sp.pct, 0);
  const mixBonus = deciduousPct > 30 ? 1.4 : 1.0;
  const base = 180 * mixBonus;
  return Math.min(PRICING.pollination.high, Math.max(PRICING.pollination.low, Math.round(base)));
}

function getRecreationPrice(parcel: DemoParcel): number {
  // Higher for mixed species, moderate elevation, accessible terrain
  const mixScore = parcel.species_mix.length >= 3 ? 1.3 : 1.0;
  const base = 280 * mixScore;
  return Math.min(PRICING.recreation.high, Math.max(PRICING.recreation.low, Math.round(base)));
}

function getErosionPrice(parcel: DemoParcel): number {
  // Higher for steep terrain (higher elevation proxy) and moraine soil
  const slopeBonus = parcel.elevation_m > 250 ? 1.3 : 1.0;
  const soilBonus = parcel.soil_type === 'Sandy moraine' ? 1.4 : parcel.soil_type === 'Moraine' ? 1.2 : 1.0;
  const base = 80 * slopeBonus * soilBonus;
  return Math.min(PRICING.erosion.high, Math.max(PRICING.erosion.low, Math.round(base)));
}

function getCarbonPrice(parcel: DemoParcel): number {
  const sprucePct = parcel.species_mix.find(s => s.species === 'Spruce')?.pct ?? 0;
  const pinePct = parcel.species_mix.find(s => s.species === 'Pine')?.pct ?? 0;
  const coniferBonus = (sprucePct + pinePct) > 60 ? 1.3 : 1.0;
  const base = 550 * coniferBonus;
  return Math.min(PRICING.carbon.high, Math.max(PRICING.carbon.low, Math.round(base)));
}

function getTimberValuePerHa(parcel: DemoParcel): number {
  // Typical Swedish forest: 4,000-8,000 SEK/ha/year from timber
  const sprucePct = parcel.species_mix.find(s => s.species === 'Spruce')?.pct ?? 0;
  const pinePct = parcel.species_mix.find(s => s.species === 'Pine')?.pct ?? 0;
  const coniferShare = (sprucePct + pinePct) / 100;
  return Math.round(4500 + coniferShare * 2500);
}

function analyzeParcel(parcel: DemoParcel): ParcelEcosystemAnalysis {
  const ha = parcel.area_hectares;

  const waterPrice = getWaterPrice(parcel);
  const floodPrice = getFloodPrice(parcel);
  const airPrice = getAirPrice(parcel);
  const pollinationPrice = getPollinationPrice(parcel);
  const recreationPrice = getRecreationPrice(parcel);
  const erosionPrice = getErosionPrice(parcel);
  const carbonPrice = getCarbonPrice(parcel);
  const timberPerHa = getTimberValuePerHa(parcel);

  const waterValue = waterPrice * ha;
  const floodValue = floodPrice * ha;
  const airValue = airPrice * ha;
  const pollinationValue = pollinationPrice * ha;
  const recreationValue = recreationPrice * ha;
  const erosionValue = erosionPrice * ha;
  const carbonValue = carbonPrice * ha;
  const timberValue = timberPerHa * ha;

  const nonCarbonEcosystem = waterValue + floodValue + airValue + pollinationValue + recreationValue + erosionValue;
  const totalForest = timberValue + carbonValue + nonCarbonEcosystem;

  // Water quantity: ~300 m³ filtered per ha per year
  const waterQuantity = Math.round(ha * 300);
  // Flood: ~150 m³ retained per ha per year
  const floodQuantity = Math.round(ha * 150);
  // Air: ~0.3 tonnes pollutants per ha per year
  const airQuantity = parseFloat((ha * 0.3).toFixed(1));
  // Pollination: ~0.8 ha ag land supported per ha forest
  const pollinationQuantity = parseFloat((ha * 0.8).toFixed(1));
  // Recreation: ~12 visitor-days per ha per year
  const recreationQuantity = Math.round(ha * 12);
  // Erosion: ~2.5 tonnes soil retained per ha per year
  const erosionQuantity = parseFloat((ha * 2.5).toFixed(1));

  const isInfested = parcel.status === 'infested';

  const services: EcosystemService[] = [
    {
      id: 'water',
      nameEn: 'Water Purification',
      nameSv: 'Vattenrening',
      icon: 'droplets',
      quantity: waterQuantity,
      unit: 'm³/year',
      unitSv: 'm³/år',
      outputDescription: `${waterQuantity.toLocaleString('sv-SE')} m³ vatten renat per år`,
      priceLow: PRICING.water.low,
      priceHigh: PRICING.water.high,
      pricePerHa: waterPrice,
      annualValueSEK: Math.round(waterValue),
      status: parcel.id === 'p1' ? 'monetized' : 'potential',
      trend: isInfested ? 'decreasing' : 'stable',
      verificationMethod: 'hydrology_model',
      buyers: BUYER_DB.water,
      sharePercent: 0,
      color: COLORS.water,
    },
    {
      id: 'flood',
      nameEn: 'Flood Mitigation',
      nameSv: 'Översvämningsskydd',
      icon: 'shield',
      quantity: floodQuantity,
      unit: 'm³ retained/year',
      unitSv: 'm³ kvarhållet/år',
      outputDescription: `${floodQuantity.toLocaleString('sv-SE')} m³ vatten kvarhållet per år`,
      priceLow: PRICING.flood.low,
      priceHigh: PRICING.flood.high,
      pricePerHa: floodPrice,
      annualValueSEK: Math.round(floodValue),
      status: parcel.id === 'p1' ? 'monetized' : 'potential',
      trend: 'stable',
      verificationMethod: 'hydrology_model',
      buyers: BUYER_DB.flood,
      sharePercent: 0,
      color: COLORS.flood,
    },
    {
      id: 'air',
      nameEn: 'Air Quality',
      nameSv: 'Luftkvalitet',
      icon: 'wind',
      quantity: airQuantity,
      unit: 'tonnes/year',
      unitSv: 'ton/år',
      outputDescription: `${airQuantity} ton föroreningar absorberade per år`,
      priceLow: PRICING.air.low,
      priceHigh: PRICING.air.high,
      pricePerHa: airPrice,
      annualValueSEK: Math.round(airValue),
      status: 'potential',
      trend: isInfested ? 'decreasing' : 'increasing',
      verificationMethod: 'satellite',
      buyers: BUYER_DB.air,
      sharePercent: 0,
      color: COLORS.air,
    },
    {
      id: 'pollination',
      nameEn: 'Pollination Corridors',
      nameSv: 'Pollinering',
      icon: 'flower',
      quantity: pollinationQuantity,
      unit: 'ha supported',
      unitSv: 'ha jordbruksmark',
      outputDescription: `${pollinationQuantity} ha jordbruksmark stöds`,
      priceLow: PRICING.pollination.low,
      priceHigh: PRICING.pollination.high,
      pricePerHa: pollinationPrice,
      annualValueSEK: Math.round(pollinationValue),
      status: 'potential',
      trend: 'stable',
      verificationMethod: 'biodiversity_survey',
      buyers: BUYER_DB.pollination,
      sharePercent: 0,
      color: COLORS.pollination,
    },
    {
      id: 'carbon',
      nameEn: 'Carbon Storage',
      nameSv: 'Kollagring',
      icon: 'leaf',
      quantity: parseFloat((ha * 8.5).toFixed(1)),
      unit: 'ton CO₂/year',
      unitSv: 'ton CO₂/år',
      outputDescription: `${(ha * 8.5).toFixed(1)} ton CO₂ bundet per år`,
      priceLow: PRICING.carbon.low,
      priceHigh: PRICING.carbon.high,
      pricePerHa: carbonPrice,
      annualValueSEK: Math.round(carbonValue),
      status: 'potential',
      trend: isInfested ? 'decreasing' : 'increasing',
      verificationMethod: 'satellite',
      buyers: [],
      sharePercent: 0,
      color: COLORS.carbon,
    },
    {
      id: 'recreation',
      nameEn: 'Recreation',
      nameSv: 'Rekreation',
      icon: 'tent',
      quantity: recreationQuantity,
      unit: 'visitor-days/year',
      unitSv: 'besöksdagar/år',
      outputDescription: `${recreationQuantity.toLocaleString('sv-SE')} besöksdagar per år`,
      priceLow: PRICING.recreation.low,
      priceHigh: PRICING.recreation.high,
      pricePerHa: recreationPrice,
      annualValueSEK: Math.round(recreationValue),
      status: 'potential',
      trend: 'increasing',
      verificationMethod: 'visitor_statistics',
      buyers: BUYER_DB.recreation,
      sharePercent: 0,
      color: COLORS.recreation,
    },
    {
      id: 'erosion',
      nameEn: 'Erosion Control',
      nameSv: 'Erosionsskydd',
      icon: 'mountain',
      quantity: erosionQuantity,
      unit: 'tonnes soil/year',
      unitSv: 'ton jord/år',
      outputDescription: `${erosionQuantity} ton jord skyddad per år`,
      priceLow: PRICING.erosion.low,
      priceHigh: PRICING.erosion.high,
      pricePerHa: erosionPrice,
      annualValueSEK: Math.round(erosionValue),
      status: parcel.soil_type === 'Sandy moraine' ? 'potential' : (parcel.elevation_m > 250 ? 'potential' : 'not_applicable'),
      trend: 'stable',
      verificationMethod: 'field_measurement',
      buyers: BUYER_DB.erosion,
      sharePercent: 0,
      color: COLORS.erosion,
    },
  ];

  // Calculate share percentages (excluding carbon link from ecosystem total)
  const ecosystemTotal = services.filter(s => s.id !== 'carbon').reduce((s, sv) => s + sv.annualValueSEK, 0);
  services.forEach(s => {
    s.sharePercent = totalForest > 0 ? Math.round((s.annualValueSEK / totalForest) * 100) : 0;
  });

  return {
    parcelId: parcel.id,
    parcelName: parcel.name,
    areaHa: ha,
    services,
    totalEcosystemValueSEK: Math.round(ecosystemTotal),
    timberValueSEK: Math.round(timberValue),
    carbonValueSEK: Math.round(carbonValue),
    totalForestValueSEK: Math.round(totalForest),
    timberSharePercent: totalForest > 0 ? Math.round((timberValue / totalForest) * 100) : 0,
    ecosystemSharePercent: totalForest > 0 ? Math.round((ecosystemTotal / totalForest) * 100) : 0,
    carbonSharePercent: totalForest > 0 ? Math.round((carbonValue / totalForest) * 100) : 0,
  };
}

// ─── Hook ───

export function useEcosystemServices(): EcosystemSummary {
  return useMemo(() => {
    const analyses = DEMO_PARCELS.map(analyzeParcel);

    const totalEcosystem = analyses.reduce((s, a) => s + a.totalEcosystemValueSEK, 0);
    const totalTimber = analyses.reduce((s, a) => s + a.timberValueSEK, 0);
    const totalCarbon = analyses.reduce((s, a) => s + a.carbonValueSEK, 0);
    const totalForest = analyses.reduce((s, a) => s + a.totalForestValueSEK, 0);

    const activePESRevenue = DEMO_PES_CONTRACTS
      .filter(c => c.status === 'active')
      .reduce((s, c) => s + c.annualPaymentSEK, 0);

    const projectedTotal = DEMO_PES_CONTRACTS.reduce(
      (s, c) => s + c.annualPaymentSEK * c.durationYears,
      0,
    );
    // Project 10-year: existing contracts + potential from all ecosystem services
    const projected10Year = projectedTotal + totalEcosystem * 8; // 8 more years beyond current

    // Collect all unique buyers
    const buyerMap = new Map<string, EcosystemBuyer>();
    analyses.forEach(a => {
      a.services.forEach(s => {
        s.buyers.forEach(b => buyerMap.set(b.id, b));
      });
    });

    return {
      analyses,
      totalEcosystemValueSEK: totalEcosystem,
      totalTimberValueSEK: totalTimber,
      totalCarbonValueSEK: totalCarbon,
      totalForestValueSEK: totalForest,
      timberSharePercent: totalForest > 0 ? Math.round((totalTimber / totalForest) * 100) : 0,
      ecosystemSharePercent: totalForest > 0 ? Math.round((totalEcosystem / totalForest) * 100) : 0,
      carbonSharePercent: totalForest > 0 ? Math.round((totalCarbon / totalForest) * 100) : 0,
      pesContracts: DEMO_PES_CONTRACTS,
      activePESRevenueSEK: activePESRevenue,
      projectedPES10YearSEK: projected10Year,
      allBuyers: Array.from(buyerMap.values()),
    };
  }, []);
}
