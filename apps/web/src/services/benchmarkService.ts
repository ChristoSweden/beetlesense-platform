/**
 * BenchmarkService — Peer benchmarking and market intelligence for Swedish forest owners.
 *
 * Provides county-level aggregated statistics for all 21 Swedish counties (län),
 * national averages, percentile calculation logic, and market intelligence data.
 *
 * All data is anonymized and aggregated — no individual forest owner data is exposed.
 */

// ─── Types ───

export interface BenchmarkMetric {
  /** Unique key for the metric */
  key: string;
  /** User's value */
  userValue: number;
  /** County average */
  countyAvg: number;
  /** National average */
  nationalAvg: number;
  /** User's percentile within the county (0-100, higher is better) */
  percentile: number;
  /** Unit label */
  unit: string;
  /** Trend direction: positive = improving, negative = declining */
  trend: 'up' | 'down' | 'stable';
  /** Trend magnitude (e.g. +0.3 m³/ha/year) */
  trendValue: number;
}

export interface CountyBenchmarkData {
  countyCode: string;
  countyName: string;
  metrics: BenchmarkMetric[];
  /** Total forest owners in county (for context) */
  totalOwners: number;
  /** Last updated timestamp */
  updatedAt: string;
}

export interface MarketIntelligenceData {
  /** Regional timber harvest volumes */
  harvestVolumes: {
    currentSeason: number;
    previousSeason: number;
    unit: string;
    changePercent: number;
  };
  /** Beetle damage statistics for the county */
  beetleDamage: {
    affectedHectares: number;
    previousYear: number;
    changePercent: number;
    riskLevel: 'low' | 'moderate' | 'high';
  };
  /** Upcoming forestry events */
  events: Array<{
    id: string;
    title: string;
    titleSv: string;
    date: string;
    type: 'auction' | 'seminar' | 'inspection' | 'market';
    location: string;
  }>;
  /** Timber price trends */
  priceTrends: Array<{
    species: string;
    speciesSv: string;
    currentPrice: number;
    previousPrice: number;
    changePercent: number;
    unit: string;
  }>;
}

export interface ParcelOption {
  id: string;
  name: string;
  area: number;
  county: string;
  countyCode: string;
}

// ─── Swedish Counties ───

export const SWEDISH_COUNTIES: Record<string, string> = {
  'AB': 'Stockholms län',
  'C':  'Uppsala län',
  'D':  'Södermanlands län',
  'E':  'Östergötlands län',
  'F':  'Jönköpings län',
  'G':  'Kronobergs län',
  'H':  'Kalmar län',
  'I':  'Gotlands län',
  'K':  'Blekinge län',
  'M':  'Skåne län',
  'N':  'Hallands län',
  'O':  'Västra Götalands län',
  'S':  'Värmlands län',
  'T':  'Örebro län',
  'U':  'Västmanlands län',
  'W':  'Dalarnas län',
  'X':  'Gävleborgs län',
  'Y':  'Västernorrlands län',
  'Z':  'Jämtlands län',
  'AC': 'Västerbottens län',
  'BD': 'Norrbottens län',
};

// ─── County Averages (demo data based on Riksskogstaxeringen patterns) ───

interface CountyAverages {
  growth: number;       // m³/ha/year
  valueDensity: number; // kr/ha
  healthScore: number;  // 0-100
  carbonSeq: number;    // ton CO₂/ha/year
  diversityIdx: number; // 0-1 Shannon index
}

const COUNTY_AVERAGES: Record<string, CountyAverages> = {
  'AB': { growth: 5.8, valueDensity: 130000, healthScore: 70, carbonSeq: 2.8, diversityIdx: 0.55 },
  'C':  { growth: 5.5, valueDensity: 125000, healthScore: 69, carbonSeq: 2.6, diversityIdx: 0.52 },
  'D':  { growth: 5.6, valueDensity: 128000, healthScore: 68, carbonSeq: 2.7, diversityIdx: 0.53 },
  'E':  { growth: 6.0, valueDensity: 135000, healthScore: 71, carbonSeq: 2.9, diversityIdx: 0.56 },
  'F':  { growth: 6.2, valueDensity: 140000, healthScore: 73, carbonSeq: 3.0, diversityIdx: 0.58 },
  'G':  { growth: 6.5, valueDensity: 145000, healthScore: 72, carbonSeq: 3.1, diversityIdx: 0.60 },
  'H':  { growth: 6.1, valueDensity: 137000, healthScore: 70, carbonSeq: 2.9, diversityIdx: 0.57 },
  'I':  { growth: 4.8, valueDensity: 110000, healthScore: 74, carbonSeq: 2.3, diversityIdx: 0.62 },
  'K':  { growth: 5.9, valueDensity: 132000, healthScore: 69, carbonSeq: 2.8, diversityIdx: 0.54 },
  'M':  { growth: 6.8, valueDensity: 150000, healthScore: 71, carbonSeq: 3.2, diversityIdx: 0.65 },
  'N':  { growth: 6.3, valueDensity: 142000, healthScore: 72, carbonSeq: 3.0, diversityIdx: 0.59 },
  'O':  { growth: 5.9, valueDensity: 133000, healthScore: 71, carbonSeq: 2.8, diversityIdx: 0.57 },
  'S':  { growth: 5.2, valueDensity: 118000, healthScore: 68, carbonSeq: 2.5, diversityIdx: 0.50 },
  'T':  { growth: 5.4, valueDensity: 122000, healthScore: 69, carbonSeq: 2.6, diversityIdx: 0.51 },
  'U':  { growth: 5.3, valueDensity: 120000, healthScore: 68, carbonSeq: 2.5, diversityIdx: 0.50 },
  'W':  { growth: 4.5, valueDensity: 100000, healthScore: 66, carbonSeq: 2.1, diversityIdx: 0.45 },
  'X':  { growth: 4.2, valueDensity: 95000,  healthScore: 65, carbonSeq: 2.0, diversityIdx: 0.43 },
  'Y':  { growth: 3.8, valueDensity: 85000,  healthScore: 64, carbonSeq: 1.8, diversityIdx: 0.40 },
  'Z':  { growth: 3.5, valueDensity: 78000,  healthScore: 63, carbonSeq: 1.7, diversityIdx: 0.38 },
  'AC': { growth: 3.2, valueDensity: 72000,  healthScore: 62, carbonSeq: 1.5, diversityIdx: 0.36 },
  'BD': { growth: 2.8, valueDensity: 65000,  healthScore: 61, carbonSeq: 1.3, diversityIdx: 0.33 },
};

// ─── National Averages (computed as weighted mean, ~10% below southern counties) ───

const NATIONAL_AVERAGES: CountyAverages = {
  growth: 5.0,
  valueDensity: 115000,
  healthScore: 67,
  carbonSeq: 2.4,
  diversityIdx: 0.49,
};

// ─── Percentile Calculation ───

/**
 * Calculate the percentile ranking of a user's value within a distribution.
 * Uses a simple normal approximation based on county average and assumed std dev.
 *
 * @param userValue - The user's actual metric value
 * @param countyAvg - The county average
 * @param stdDevFactor - Standard deviation as a fraction of the mean (default 0.25)
 * @returns Percentile (0-100), where 100 = top
 */
export function calculatePercentile(
  userValue: number,
  countyAvg: number,
  stdDevFactor: number = 0.25,
): number {
  const stdDev = countyAvg * stdDevFactor;
  if (stdDev === 0) return 50;

  const zScore = (userValue - countyAvg) / stdDev;
  // Approximate CDF using logistic function (close to normal CDF)
  const cdf = 1 / (1 + Math.exp(-1.7 * zScore));
  return Math.round(cdf * 100);
}

// ─── Demo Data for Kronoberg (G) ───

const DEMO_USER_KRONOBERG = {
  growth: 7.8,
  valueDensity: 168000,
  healthScore: 85,
  carbonSeq: 3.7,
  diversityIdx: 0.72,
};

// ─── Service Functions ───

/**
 * Get demo parcels for the parcel selector.
 */
export function getDemoParcels(): ParcelOption[] {
  return [
    { id: 'p1', name: 'Norra Skogen', area: 45, county: 'Kronobergs län', countyCode: 'G' },
    { id: 'p2', name: 'Ekbacken', area: 28, county: 'Kronobergs län', countyCode: 'G' },
    { id: 'p3', name: 'Granholmen', area: 62, county: 'Kronobergs län', countyCode: 'G' },
  ];
}

/**
 * Fetch benchmark data for a given county, comparing with user's parcel.
 * In production this would call the backend; for now uses demo data.
 */
export function getBenchmarkData(countyCode: string = 'G'): CountyBenchmarkData {
  const countyAvgs = COUNTY_AVERAGES[countyCode] ?? COUNTY_AVERAGES['G'];
  const countyName = SWEDISH_COUNTIES[countyCode] ?? 'Kronobergs län';
  const user = DEMO_USER_KRONOBERG;

  const metrics: BenchmarkMetric[] = [
    {
      key: 'volumeGrowth',
      userValue: user.growth,
      countyAvg: countyAvgs.growth,
      nationalAvg: NATIONAL_AVERAGES.growth,
      percentile: calculatePercentile(user.growth, countyAvgs.growth),
      unit: 'm\u00B3/ha/yr',
      trend: 'up',
      trendValue: 0.3,
    },
    {
      key: 'timberValue',
      userValue: user.valueDensity,
      countyAvg: countyAvgs.valueDensity,
      nationalAvg: NATIONAL_AVERAGES.valueDensity,
      percentile: calculatePercentile(user.valueDensity, countyAvgs.valueDensity),
      unit: 'kr/ha',
      trend: 'up',
      trendValue: 5000,
    },
    {
      key: 'healthScore',
      userValue: user.healthScore,
      countyAvg: countyAvgs.healthScore,
      nationalAvg: NATIONAL_AVERAGES.healthScore,
      percentile: calculatePercentile(user.healthScore, countyAvgs.healthScore),
      unit: '/100',
      trend: 'up',
      trendValue: 2,
    },
    {
      key: 'carbonSequestration',
      userValue: user.carbonSeq,
      countyAvg: countyAvgs.carbonSeq,
      nationalAvg: NATIONAL_AVERAGES.carbonSeq,
      percentile: calculatePercentile(user.carbonSeq, countyAvgs.carbonSeq),
      unit: 't CO\u2082/ha/yr',
      trend: 'stable',
      trendValue: 0,
    },
    {
      key: 'speciesDiversity',
      userValue: user.diversityIdx,
      countyAvg: countyAvgs.diversityIdx,
      nationalAvg: NATIONAL_AVERAGES.diversityIdx,
      percentile: calculatePercentile(user.diversityIdx, countyAvgs.diversityIdx),
      unit: 'index',
      trend: 'up',
      trendValue: 0.05,
    },
  ];

  return {
    countyCode,
    countyName,
    metrics,
    totalOwners: 3450,
    updatedAt: '2026-03-15',
  };
}

/**
 * Get market intelligence data for a county.
 */
export function getMarketIntelligence(_countyCode: string = 'G'): MarketIntelligenceData {
  return {
    harvestVolumes: {
      currentSeason: 285000,
      previousSeason: 268000,
      unit: 'm\u00B3fub',
      changePercent: 6.3,
    },
    beetleDamage: {
      affectedHectares: 1240,
      previousYear: 980,
      changePercent: 26.5,
      riskLevel: 'moderate',
    },
    events: [
      {
        id: 'e1',
        title: 'Timber Auction — Kronoberg Spring',
        titleSv: 'Virkesauktion — Kronoberg v\u00E5r',
        date: '2026-04-12',
        type: 'auction',
        location: 'V\u00E4xj\u00F6',
      },
      {
        id: 'e2',
        title: 'Bark Beetle Preparedness Seminar',
        titleSv: 'Seminarium om barkborreberedskap',
        date: '2026-04-05',
        type: 'seminar',
        location: 'Ljungby',
      },
      {
        id: 'e3',
        title: 'Forest Owner Day — Sm\u00E5land',
        titleSv: 'Skogsdag — Sm\u00E5land',
        date: '2026-05-18',
        type: 'market',
        location: '\u00C4lmhult',
      },
    ],
    priceTrends: [
      {
        species: 'Spruce sawlog',
        speciesSv: 'Gran s\u00E5gtimmer',
        currentPrice: 650,
        previousPrice: 620,
        changePercent: 4.8,
        unit: 'kr/m\u00B3fub',
      },
      {
        species: 'Pine sawlog',
        speciesSv: 'Tall s\u00E5gtimmer',
        currentPrice: 600,
        previousPrice: 580,
        changePercent: 3.4,
        unit: 'kr/m\u00B3fub',
      },
      {
        species: 'Spruce pulpwood',
        speciesSv: 'Gran massaved',
        currentPrice: 350,
        previousPrice: 340,
        changePercent: 2.9,
        unit: 'kr/m\u00B3fub',
      },
      {
        species: 'Birch pulpwood',
        speciesSv: 'Bj\u00F6rk massaved',
        currentPrice: 300,
        previousPrice: 290,
        changePercent: 3.4,
        unit: 'kr/m\u00B3fub',
      },
    ],
  };
}

/**
 * Format a number with Swedish thousand separators.
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
