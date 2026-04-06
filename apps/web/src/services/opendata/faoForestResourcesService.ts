/**
 * FAO Global Forest Resources Assessment (FRA) — Country-Level Forest Statistics
 *
 * The FAO FRA is the most comprehensive global assessment of forest resources,
 * published every 5 years. Provides country-level data on forest area, cover,
 * deforestation rates, and carbon stocks for benchmarking.
 *
 * Used in BeetleSense for contextualizing Swedish forest data against Nordic
 * and EU averages — essential for grant applications and investor reporting.
 *
 * This service uses demo data based on real FRA 2020 figures.
 *
 * Docs: https://www.fao.org/forest-resources-assessment/
 */

// ─── Types ───

export interface CountryForestStats {
  country: string;
  countryCode: string;
  totalForestAreaHa: number;
  forestCoverPercent: number;
  annualDeforestationHa: number;
  annualAfforestationHa: number;
  netAnnualChangeHa: number;
  carbonStockMtC: number;
  carbonStockPerHaTonnes: number;
  primaryForestPercent: number;
  plantedForestPercent: number;
  fraYear: number;
}

export interface GlobalBenchmark {
  swedenStats: CountryForestStats;
  nordicAverage: {
    forestCoverPercent: number;
    carbonStockPerHaTonnes: number;
    annualChangePercent: number;
  };
  euAverage: {
    forestCoverPercent: number;
    carbonStockPerHaTonnes: number;
    annualChangePercent: number;
  };
  swedenRanking: {
    forestAreaInEU: number;
    carbonStockInEU: number;
    sustainabilityScore: string;
  };
}

// ─── Constants ───

export const FAO_FRA_SOURCE_INFO = {
  name: 'FAO Global Forest Resources Assessment (FRA)',
  provider: 'Food and Agriculture Organization of the United Nations',
  website: 'https://www.fao.org/forest-resources-assessment/',
  dataYear: 2020,
  publishedYear: 2020,
  updateFrequency: 'Every 5 years (next: FRA 2025)',
  coverage: '236 countries and territories',
  license: 'Open access (FAO Open Data)',
  note: 'Demo data based on real FRA 2020 published figures for Nordic/EU countries.',
};

// ─── Demo Data (based on real FRA 2020 figures) ───

const COUNTRY_STATS: Record<string, CountryForestStats> = {
  SE: {
    country: 'Sweden',
    countryCode: 'SE',
    totalForestAreaHa: 28_100_000,
    forestCoverPercent: 68.7,
    annualDeforestationHa: 2_000,
    annualAfforestationHa: 14_000,
    netAnnualChangeHa: 12_000,
    carbonStockMtC: 2_540,
    carbonStockPerHaTonnes: 90.4,
    primaryForestPercent: 18.2,
    plantedForestPercent: 9.5,
    fraYear: 2020,
  },
  FI: {
    country: 'Finland',
    countryCode: 'FI',
    totalForestAreaHa: 22_409_000,
    forestCoverPercent: 73.1,
    annualDeforestationHa: 1_000,
    annualAfforestationHa: 8_000,
    netAnnualChangeHa: 7_000,
    carbonStockMtC: 1_890,
    carbonStockPerHaTonnes: 84.3,
    primaryForestPercent: 5.1,
    plantedForestPercent: 6.2,
    fraYear: 2020,
  },
  NO: {
    country: 'Norway',
    countryCode: 'NO',
    totalForestAreaHa: 12_112_000,
    forestCoverPercent: 33.2,
    annualDeforestationHa: 500,
    annualAfforestationHa: 15_000,
    netAnnualChangeHa: 14_500,
    carbonStockMtC: 1_110,
    carbonStockPerHaTonnes: 91.6,
    primaryForestPercent: 28.4,
    plantedForestPercent: 3.8,
    fraYear: 2020,
  },
  DK: {
    country: 'Denmark',
    countryCode: 'DK',
    totalForestAreaHa: 612_000,
    forestCoverPercent: 14.6,
    annualDeforestationHa: 100,
    annualAfforestationHa: 3_000,
    netAnnualChangeHa: 2_900,
    carbonStockMtC: 56,
    carbonStockPerHaTonnes: 91.5,
    primaryForestPercent: 2.0,
    plantedForestPercent: 22.0,
    fraYear: 2020,
  },
  DE: {
    country: 'Germany',
    countryCode: 'DE',
    totalForestAreaHa: 11_419_000,
    forestCoverPercent: 32.7,
    annualDeforestationHa: 0,
    annualAfforestationHa: 2_000,
    netAnnualChangeHa: 2_000,
    carbonStockMtC: 1_290,
    carbonStockPerHaTonnes: 113.0,
    primaryForestPercent: 0.4,
    plantedForestPercent: 10.0,
    fraYear: 2020,
  },
  FR: {
    country: 'France',
    countryCode: 'FR',
    totalForestAreaHa: 17_253_000,
    forestCoverPercent: 31.5,
    annualDeforestationHa: 0,
    annualAfforestationHa: 80_000,
    netAnnualChangeHa: 80_000,
    carbonStockMtC: 2_300,
    carbonStockPerHaTonnes: 133.3,
    primaryForestPercent: 0.2,
    plantedForestPercent: 8.5,
    fraYear: 2020,
  },
  PL: {
    country: 'Poland',
    countryCode: 'PL',
    totalForestAreaHa: 9_435_000,
    forestCoverPercent: 30.8,
    annualDeforestationHa: 1_000,
    annualAfforestationHa: 12_000,
    netAnnualChangeHa: 11_000,
    carbonStockMtC: 990,
    carbonStockPerHaTonnes: 104.9,
    primaryForestPercent: 0.3,
    plantedForestPercent: 3.2,
    fraYear: 2020,
  },
  EE: {
    country: 'Estonia',
    countryCode: 'EE',
    totalForestAreaHa: 2_438_000,
    forestCoverPercent: 54.8,
    annualDeforestationHa: 500,
    annualAfforestationHa: 1_500,
    netAnnualChangeHa: 1_000,
    carbonStockMtC: 196,
    carbonStockPerHaTonnes: 80.4,
    primaryForestPercent: 3.5,
    plantedForestPercent: 7.0,
    fraYear: 2020,
  },
  LV: {
    country: 'Latvia',
    countryCode: 'LV',
    totalForestAreaHa: 3_411_000,
    forestCoverPercent: 54.8,
    annualDeforestationHa: 200,
    annualAfforestationHa: 3_000,
    netAnnualChangeHa: 2_800,
    carbonStockMtC: 270,
    carbonStockPerHaTonnes: 79.2,
    primaryForestPercent: 1.5,
    plantedForestPercent: 4.8,
    fraYear: 2020,
  },
};

// ─── API Functions ───

/**
 * Fetch forest statistics for a specific country.
 * Uses demo data based on real FAO FRA 2020 figures.
 */
export async function fetchCountryStats(
  countryCode: string
): Promise<CountryForestStats | null> {
  const code = countryCode.toUpperCase();
  return COUNTRY_STATS[code] ?? null;
}

/**
 * Get a global benchmark comparing Sweden against Nordic and EU averages.
 * Useful for grant applications, investor reporting, and contextualization.
 */
export async function getGlobalBenchmark(): Promise<GlobalBenchmark> {
  const sweden = COUNTRY_STATS['SE'];

  // Nordic average (SE, FI, NO, DK)
  const nordic = [COUNTRY_STATS['SE'], COUNTRY_STATS['FI'], COUNTRY_STATS['NO'], COUNTRY_STATS['DK']];
  const nordicAvgCover = nordic.reduce((s, c) => s + c.forestCoverPercent, 0) / nordic.length;
  const nordicAvgCarbon = nordic.reduce((s, c) => s + c.carbonStockPerHaTonnes, 0) / nordic.length;
  const nordicTotalArea = nordic.reduce((s, c) => s + c.totalForestAreaHa, 0);
  const nordicNetChange = nordic.reduce((s, c) => s + c.netAnnualChangeHa, 0);
  const nordicAvgChange = (nordicNetChange / nordicTotalArea) * 100;

  // EU average (sample of major forest countries)
  const eu = Object.values(COUNTRY_STATS);
  const euAvgCover = eu.reduce((s, c) => s + c.forestCoverPercent, 0) / eu.length;
  const euAvgCarbon = eu.reduce((s, c) => s + c.carbonStockPerHaTonnes, 0) / eu.length;
  const euTotalArea = eu.reduce((s, c) => s + c.totalForestAreaHa, 0);
  const euNetChange = eu.reduce((s, c) => s + c.netAnnualChangeHa, 0);
  const euAvgChange = (euNetChange / euTotalArea) * 100;

  // Sweden's ranking among EU countries
  const sortedByArea = [...eu].sort((a, b) => b.totalForestAreaHa - a.totalForestAreaHa);
  const sortedByCarbon = [...eu].sort((a, b) => b.carbonStockMtC - a.carbonStockMtC);
  const areaRank = sortedByArea.findIndex((c) => c.countryCode === 'SE') + 1;
  const carbonRank = sortedByCarbon.findIndex((c) => c.countryCode === 'SE') + 1;

  return {
    swedenStats: sweden,
    nordicAverage: {
      forestCoverPercent: Math.round(nordicAvgCover * 10) / 10,
      carbonStockPerHaTonnes: Math.round(nordicAvgCarbon * 10) / 10,
      annualChangePercent: Math.round(nordicAvgChange * 1000) / 1000,
    },
    euAverage: {
      forestCoverPercent: Math.round(euAvgCover * 10) / 10,
      carbonStockPerHaTonnes: Math.round(euAvgCarbon * 10) / 10,
      annualChangePercent: Math.round(euAvgChange * 1000) / 1000,
    },
    swedenRanking: {
      forestAreaInEU: areaRank,
      carbonStockInEU: carbonRank,
      sustainabilityScore: 'A — Net positive forest growth with strong regulatory framework',
    },
  };
}

/**
 * Fetch a Nordic comparison table — Sweden, Finland, Norway, Denmark.
 * Ideal for displaying in a benchmark dashboard widget.
 */
export async function fetchNordicComparison(): Promise<CountryForestStats[]> {
  return [
    COUNTRY_STATS['SE'],
    COUNTRY_STATS['FI'],
    COUNTRY_STATS['NO'],
    COUNTRY_STATS['DK'],
  ];
}
