/**
 * Enriched demo metrics for charts, dashboards, and key performance indicators.
 * Provides realistic forest health, market, and operational metrics for technical demo.
 */

// ─── Forest Health Portfolio Metrics ───

export interface PortfolioMetrics {
  totalParcelArea: number; // hectares
  totalTimberValue: number; // SEK
  averageHealthScore: number; // 0-100
  parcelsAtRisk: number;
  infestedParcels: number;
  healthyParcels: number;
  unknownParcels: number;
  /** Total carbon sequestration (tonnes CO2 equivalent) */
  totalCarbonStored: number;
  /** Annual carbon sequestration rate */
  annualCarbonSequestration: number;
}

export const DEMO_PORTFOLIO_METRICS: PortfolioMetrics = {
  totalParcelArea: 282.8,
  totalTimberValue: 16_250_000,
  averageHealthScore: 67.4,
  parcelsAtRisk: 1,
  infestedParcels: 1,
  healthyParcels: 2,
  unknownParcels: 1,
  totalCarbonStored: 14250,
  annualCarbonSequestration: 1850,
};

// ─── Timber Volume Breakdown ───

export interface TimberMetrics {
  species: string;
  volumeM3sk: number;
  volumeM3fub: number; // fub = over bark
  sawlogRatio: number;
  pulpRatio: number;
  energyRatio: number;
  meanAge: number;
  meanHeight: number;
  meanDbh: number; // diameter at breast height, cm
  siteIndex: number; // H100 in Swedish system
  mai: number; // mean annual increment
  valuePerM3: number; // SEK
}

export const DEMO_TIMBER_METRICS: TimberMetrics[] = [
  {
    species: 'Spruce (Picea abies)',
    volumeM3sk: 1840,
    volumeM3fub: 2120,
    sawlogRatio: 0.58,
    pulpRatio: 0.32,
    energyRatio: 0.10,
    meanAge: 58,
    meanHeight: 26.2,
    meanDbh: 38.5,
    siteIndex: 27,
    mai: 7.8,
    valuePerM3: 580,
  },
  {
    species: 'Pine (Pinus sylvestris)',
    volumeM3sk: 680,
    volumeM3fub: 755,
    sawlogRatio: 0.70,
    pulpRatio: 0.20,
    energyRatio: 0.10,
    meanAge: 72,
    meanHeight: 24.1,
    meanDbh: 35.2,
    siteIndex: 22,
    mai: 4.5,
    valuePerM3: 620,
  },
  {
    species: 'Birch (Betula spp.)',
    volumeM3sk: 220,
    volumeM3fub: 248,
    sawlogRatio: 0.42,
    pulpRatio: 0.48,
    energyRatio: 0.10,
    meanAge: 45,
    meanHeight: 21.3,
    meanDbh: 28.7,
    siteIndex: 20,
    mai: 5.2,
    valuePerM3: 420,
  },
];

// ─── Early Warning Detections ───

export interface EarlyWarningEvent {
  id: string;
  parcelId: string;
  parcelName: string;
  detectionDate: string;
  severity: 'red' | 'orange' | 'yellow'; // Red=confirmed damage, orange=likely, yellow=stress
  indicator: string;
  confidence: number; // 0-1
  affectedArea: number; // hectares
  estimatedTreeCount: number;
  recommendedAction: string;
  detectionMethod: 'drone_ai' | 'satellite_ndvi' | 'trap_data' | 'ground_scout';
  daysAheadOfSatellite?: number; // How many days earlier drone detection was
}

export const DEMO_EARLY_WARNINGS: EarlyWarningEvent[] = [
  {
    id: 'ew-001',
    parcelId: 'p4',
    parcelName: 'Granudden',
    detectionDate: '2026-03-08',
    severity: 'red',
    indicator: 'Bark beetle exit holes + crown discoloration',
    confidence: 0.96,
    affectedArea: 7.2,
    estimatedTreeCount: 420,
    recommendedAction: 'Emergency salvage harvest zones B3–B7. Immediate intervention needed.',
    detectionMethod: 'drone_ai',
    daysAheadOfSatellite: 12,
  },
  {
    id: 'ew-002',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    detectionDate: '2026-03-06',
    severity: 'orange',
    indicator: 'Moderate beetle activity in NE sector, early stress signs',
    confidence: 0.87,
    affectedArea: 3.1,
    estimatedTreeCount: 72,
    recommendedAction: 'Deploy beetle traps. Monitor weekly. Plan preventive thinning in Avd. 2.',
    detectionMethod: 'drone_ai',
    daysAheadOfSatellite: 8,
  },
  {
    id: 'ew-003',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    detectionDate: '2026-03-10',
    severity: 'yellow',
    indicator: 'Minor stress detected in SW corner, possible drought impact',
    confidence: 0.68,
    affectedArea: 1.8,
    estimatedTreeCount: 34,
    recommendedAction: 'Monitor for next survey. Check soil moisture. Consider irrigation if persistent.',
    detectionMethod: 'drone_ai',
    daysAheadOfSatellite: 5,
  },
];

// ─── Market Price Scenarios ───

export interface MarketPrice {
  date: string;
  // Sawlog prices (SEK/m³ fub)
  spruceAwlogSek: number;
  pineAwlogSek: number;
  // Pulpwood prices (SEK/m³ fub)
  spruceChipSek: number;
  pineChipSek: number;
  // Energy wood (SEK/tonne)
  bioenergySek: number;
  // Index 100 = baseline
  priceTrendIndex: number;
  /** Market outlook: 'bullish' | 'neutral' | 'bearish' */
  outlook: 'bullish' | 'neutral' | 'bearish';
}

export const DEMO_MARKET_PRICES: MarketPrice[] = [
  {
    date: '2025-01',
    spruceAwlogSek: 520,
    pineAwlogSek: 580,
    spruceChipSek: 280,
    pineChipSek: 300,
    bioenergySek: 185,
    priceTrendIndex: 98,
    outlook: 'bearish',
  },
  {
    date: '2025-02',
    spruceAwlogSek: 530,
    pineAwlogSek: 585,
    spruceChipSek: 285,
    pineChipSek: 305,
    bioenergySek: 188,
    priceTrendIndex: 99,
    outlook: 'bearish',
  },
  {
    date: '2025-03',
    spruceAwlogSek: 545,
    pineAwlogSek: 595,
    spruceChipSek: 295,
    pineChipSek: 315,
    bioenergySek: 192,
    priceTrendIndex: 101,
    outlook: 'neutral',
  },
  {
    date: '2025-04',
    spruceAwlogSek: 560,
    pineAwlogSek: 610,
    spruceChipSek: 305,
    pineChipSek: 325,
    bioenergySek: 198,
    priceTrendIndex: 103,
    outlook: 'neutral',
  },
  {
    date: '2025-05',
    spruceAwlogSek: 575,
    pineAwlogSek: 625,
    spruceChipSek: 315,
    pineChipSek: 335,
    bioenergySek: 205,
    priceTrendIndex: 106,
    outlook: 'bullish',
  },
  {
    date: '2025-06',
    spruceAwlogSek: 590,
    pineAwlogSek: 640,
    spruceChipSek: 325,
    pineChipSek: 345,
    bioenergySek: 212,
    priceTrendIndex: 108,
    outlook: 'bullish',
  },
  {
    date: '2025-07',
    spruceAwlogSek: 605,
    pineAwlogSek: 655,
    spruceChipSek: 335,
    pineChipSek: 355,
    bioenergySek: 218,
    priceTrendIndex: 110,
    outlook: 'bullish',
  },
  {
    date: '2025-08',
    spruceAwlogSek: 612,
    pineAwlogSek: 662,
    spruceChipSek: 340,
    pineChipSek: 360,
    bioenergySek: 220,
    priceTrendIndex: 111,
    outlook: 'neutral',
  },
  {
    date: '2025-09',
    spruceAwlogSek: 600,
    pineAwlogSek: 650,
    spruceChipSek: 330,
    pineChipSek: 350,
    bioenergySek: 215,
    priceTrendIndex: 109,
    outlook: 'neutral',
  },
  {
    date: '2025-10',
    spruceAwlogSek: 585,
    pineAwlogSek: 635,
    spruceChipSek: 320,
    pineChipSek: 340,
    bioenergySek: 210,
    priceTrendIndex: 107,
    outlook: 'neutral',
  },
];

// ─── Harvest & Contractor Availability ───

export interface ContractorAvailability {
  name: string;
  specialization: 'harvester' | 'processor' | 'transporter' | 'salvage_specialist';
  municipality: string;
  /** Machines available (e.g., harvesters, forwarders) */
  availableMachines: number;
  /** Current utilization 0-100 */
  utilizationRate: number;
  /** Cost per hectare harvested (SEK) */
  costPerHaSek: number;
  /** Days until availability */
  daysUntilAvailable: number;
  /** Average rating 0-5 */
  ratingStars: number;
  jobsCompleted: number;
}

export const DEMO_CONTRACTORS: ContractorAvailability[] = [
  {
    name: 'Värnamo Skogsvård',
    specialization: 'harvester',
    municipality: 'Värnamo',
    availableMachines: 2,
    utilizationRate: 75,
    costPerHaSek: 2850,
    daysUntilAvailable: 3,
    ratingStars: 4.7,
    jobsCompleted: 148,
  },
  {
    name: 'Smaland Salvage AB',
    specialization: 'salvage_specialist',
    municipality: 'Gislaved',
    availableMachines: 3,
    utilizationRate: 85,
    costPerHaSek: 3200,
    daysUntilAvailable: 1,
    ratingStars: 4.9,
    jobsCompleted: 94,
  },
  {
    name: 'Björnstad Transport',
    specialization: 'transporter',
    municipality: 'Värnamo',
    availableMachines: 5,
    utilizationRate: 60,
    costPerHaSek: 1200,
    daysUntilAvailable: 0,
    ratingStars: 4.5,
    jobsCompleted: 267,
  },
  {
    name: 'Jönköping Sagverk',
    specialization: 'processor',
    municipality: 'Jönköping',
    availableMachines: 1,
    utilizationRate: 95,
    costPerHaSek: 450,
    daysUntilAvailable: 8,
    ratingStars: 4.3,
    jobsCompleted: 52,
  },
];

// ─── Regulatory Compliance Status ───

export interface ComplianceItem {
  requirement: string;
  status: 'compliant' | 'at_risk' | 'non_compliant';
  daysToDeadline?: number;
  notes: string;
}

export const DEMO_COMPLIANCE: ComplianceItem[] = [
  {
    requirement: 'Buffer zones (Natura 2000 compliance)',
    status: 'compliant',
    notes: 'All parcels maintain 30m+ buffer on streams and water features.',
  },
  {
    requirement: 'Retention trees (dead wood for biodiversity)',
    status: 'compliant',
    notes: '5.2% retention areas across portfolio (target: ≥5%).',
  },
  {
    requirement: 'FSC certification audit',
    status: 'at_risk',
    daysToDeadline: 45,
    notes: 'Annual audit due by Q2 2026. Documentation in progress.',
  },
  {
    requirement: 'Beetle control reporting (Skogsstyrelsen)',
    status: 'compliant',
    notes: 'Monthly trap data submitted. Outbreak status: yellow (moderate risk).',
  },
  {
    requirement: 'Drainage maintenance (wet forest areas)',
    status: 'compliant',
    notes: 'Björklund parcel (p5) ditches cleared Mar 2026.',
  },
];

// ─── Species Diversity Metrics ───

export interface BiodiversityMetric {
  parcelId: string;
  parcelName: string;
  treeSpeciesCount: number;
  understorySpeciesCount: number;
  /// Protected or rare species present
  rareSpecies: string[];
  /** Deadwood volume (m³/ha) */
  deadwoodM3ha: number;
  /** Wildlife habitat quality 0-100 */
  habitatQualityScore: number;
}

export const DEMO_BIODIVERSITY: BiodiversityMetric[] = [
  {
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    treeSpeciesCount: 4,
    understorySpeciesCount: 18,
    rareSpecies: [],
    deadwoodM3ha: 8.2,
    habitatQualityScore: 68,
  },
  {
    parcelId: 'p2',
    parcelName: 'Ekbacken',
    treeSpeciesCount: 5,
    understorySpeciesCount: 22,
    rareSpecies: ['Liriodendron tulipifera (rare in Sweden)'],
    deadwoodM3ha: 12.5,
    habitatQualityScore: 82,
  },
  {
    parcelId: 'p3',
    parcelName: 'Tallmon',
    treeSpeciesCount: 3,
    understorySpeciesCount: 14,
    rareSpecies: [],
    deadwoodM3ha: 5.1,
    habitatQualityScore: 54,
  },
  {
    parcelId: 'p4',
    parcelName: 'Granudden',
    treeSpeciesCount: 3,
    understorySpeciesCount: 9,
    rareSpecies: [],
    deadwoodM3ha: 2.8,
    habitatQualityScore: 38,
  },
  {
    parcelId: 'p5',
    parcelName: 'Björklund',
    treeSpeciesCount: 4,
    understorySpeciesCount: 26,
    rareSpecies: ['Carex davalliana (fen rare)'],
    deadwoodM3ha: 18.3,
    habitatQualityScore: 91,
  },
];

// ─── Harvest Planning ───

export interface HarvestPlan {
  parcelId: string;
  plannedYear: number;
  plannedVolume: number; // m³sk
  estimatedValue: number; // SEK
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reason: string;
}

export const DEMO_HARVEST_PLANS: HarvestPlan[] = [
  {
    parcelId: 'p4',
    plannedYear: 2026,
    plannedVolume: 580,
    estimatedValue: 336_400,
    priority: 'urgent',
    reason: 'Salvage harvest due to beetle infestation. Critical intervention required.',
  },
  {
    parcelId: 'p1',
    plannedYear: 2027,
    plannedVolume: 420,
    estimatedValue: 243_600,
    priority: 'high',
    reason: 'Preventive thinning to reduce beetle risk in Avd. 2.',
  },
  {
    parcelId: 'p3',
    plannedYear: 2029,
    plannedVolume: 1840,
    estimatedValue: 1_113_920,
    priority: 'medium',
    reason: 'Final harvest of mature pine stand (70+ years).',
  },
  {
    parcelId: 'p2',
    plannedYear: 2032,
    plannedVolume: 320,
    estimatedValue: 134_400,
    priority: 'low',
    reason: 'Future thinning for biodiversity. Oak forest management.',
  },
];

// ─── Helper functions ───

export function getParcelMetrics(parcelId: string) {
  return {
    timber: DEMO_TIMBER_METRICS,
    biodiversity: DEMO_BIODIVERSITY.find((b) => b.parcelId === parcelId),
    harvestPlan: DEMO_HARVEST_PLANS.find((h) => h.parcelId === parcelId),
    warnings: DEMO_EARLY_WARNINGS.filter((w) => w.parcelId === parcelId),
  };
}

export function getTotalHarvestValue(): number {
  return DEMO_HARVEST_PLANS.reduce((sum, plan) => sum + plan.estimatedValue, 0);
}

export function getLatestMarketPrice(): MarketPrice {
  return DEMO_MARKET_PRICES[DEMO_MARKET_PRICES.length - 1]!;
}
