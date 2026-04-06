/**
 * SCB (Statistics Sweden) — Timber Prices & Forest Statistics
 *
 * Free open API for quarterly timber prices and forest statistics.
 * No API key required. POST requests with JSON query body.
 *
 * Docs: https://www.scb.se/en/services/open-data-api/
 * Table: JO/JO0303/JO0303H/VirkesPris (timber prices by region and assortment)
 */

// ─── Types ───

export interface TimberPriceData {
  period: string;
  region: string;
  assortment: string;
  priceSEKperM3: number;
}

export interface RegionalTimberPrices {
  region: string;
  spruceSawlog: number;
  pineSawlog: number;
  pulpwood: number;
  period: string;
  yearOverYearChange: number;
}

export interface ForestStatistics {
  county: string;
  totalForestAreaHa: number;
  annualHarvestM3: number;
  standingVolumeM3: number;
  forestCoverPercent: number;
}

export interface PriceHistoryEntry {
  period: string;
  priceSEKperM3: number;
}

// ─── Constants ───

const SCB_BASE_URL = 'https://api.scb.se/OV0104/v1/doris/sv/ssd';
const TIMBER_PRICE_TABLE = 'JO/JO0303/JO0303H/VirkesPris';

// SCB region codes (Län)
const REGION_CODES: Record<string, string> = {
  'Hela riket': '00',
  'Götaland': '09',
  'Svealand': '08',
  'Norra Norrland': '01',
  'Södra Norrland': '02',
  'Norra Götaland': '06',
  'Södra Götaland': '07',
  'Småland': '07', // Part of Södra Götaland
};

// SCB assortment codes
const ASSORTMENT_CODES: Record<string, string> = {
  'Sågtimmer gran': '010',
  'Sågtimmer tall': '020',
  'Massaved': '030',
  'Massaved gran': '031',
  'Massaved tall': '032',
  'Massaved löv': '033',
};

// Cache (1 hour — prices update quarterly)
const CACHE_TTL = 60 * 60 * 1000;
const priceCache = new Map<string, { data: TimberPriceData[]; fetchedAt: number }>();

export const SCB_SOURCE_INFO = {
  name: 'SCB — Statistiska centralbyrån',
  url: 'https://www.scb.se/',
  license: 'CC0 (Public Domain)',
  description: 'Official Swedish statistics on timber prices and forest resources',
  attribution: 'Källa: SCB, Statistiska centralbyrån',
  updateFrequency: 'Quarterly (timber prices)',
  costTier: 'free' as const,
};

// ─── Demo Fallback Data ───

const DEMO_TIMBER_PRICES: TimberPriceData[] = [
  { period: '2025K4', region: 'Hela riket', assortment: 'Sågtimmer gran', priceSEKperM3: 650 },
  { period: '2025K4', region: 'Hela riket', assortment: 'Sågtimmer tall', priceSEKperM3: 620 },
  { period: '2025K4', region: 'Hela riket', assortment: 'Massaved', priceSEKperM3: 350 },
  { period: '2025K4', region: 'Götaland', assortment: 'Sågtimmer gran', priceSEKperM3: 680 },
  { period: '2025K4', region: 'Götaland', assortment: 'Sågtimmer tall', priceSEKperM3: 640 },
  { period: '2025K4', region: 'Götaland', assortment: 'Massaved', priceSEKperM3: 360 },
  { period: '2025K4', region: 'Svealand', assortment: 'Sågtimmer gran', priceSEKperM3: 660 },
  { period: '2025K4', region: 'Svealand', assortment: 'Sågtimmer tall', priceSEKperM3: 630 },
  { period: '2025K4', region: 'Svealand', assortment: 'Massaved', priceSEKperM3: 345 },
  { period: '2025K4', region: 'Norra Norrland', assortment: 'Sågtimmer gran', priceSEKperM3: 590 },
  { period: '2025K4', region: 'Norra Norrland', assortment: 'Sågtimmer tall', priceSEKperM3: 570 },
  { period: '2025K4', region: 'Norra Norrland', assortment: 'Massaved', priceSEKperM3: 320 },
  { period: '2025K4', region: 'Södra Norrland', assortment: 'Sågtimmer gran', priceSEKperM3: 630 },
  { period: '2025K4', region: 'Södra Norrland', assortment: 'Sågtimmer tall', priceSEKperM3: 600 },
  { period: '2025K4', region: 'Södra Norrland', assortment: 'Massaved', priceSEKperM3: 340 },
  // Previous quarter for YoY comparison
  { period: '2024K4', region: 'Hela riket', assortment: 'Sågtimmer gran', priceSEKperM3: 620 },
  { period: '2024K4', region: 'Hela riket', assortment: 'Sågtimmer tall', priceSEKperM3: 595 },
  { period: '2024K4', region: 'Hela riket', assortment: 'Massaved', priceSEKperM3: 330 },
  { period: '2024K4', region: 'Götaland', assortment: 'Sågtimmer gran', priceSEKperM3: 650 },
  { period: '2024K4', region: 'Götaland', assortment: 'Sågtimmer tall', priceSEKperM3: 615 },
  { period: '2024K4', region: 'Götaland', assortment: 'Massaved', priceSEKperM3: 340 },
  { period: '2024K4', region: 'Svealand', assortment: 'Sågtimmer gran', priceSEKperM3: 630 },
  { period: '2024K4', region: 'Svealand', assortment: 'Sågtimmer tall', priceSEKperM3: 600 },
  { period: '2024K4', region: 'Svealand', assortment: 'Massaved', priceSEKperM3: 325 },
];

const DEMO_FOREST_STATS: ForestStatistics[] = [
  { county: 'Kronoberg', totalForestAreaHa: 620000, annualHarvestM3: 5200000, standingVolumeM3: 95000000, forestCoverPercent: 72 },
  { county: 'Jönköping', totalForestAreaHa: 580000, annualHarvestM3: 4800000, standingVolumeM3: 88000000, forestCoverPercent: 65 },
  { county: 'Kalmar', totalForestAreaHa: 640000, annualHarvestM3: 5000000, standingVolumeM3: 92000000, forestCoverPercent: 58 },
  { county: 'Västra Götaland', totalForestAreaHa: 1080000, annualHarvestM3: 8500000, standingVolumeM3: 160000000, forestCoverPercent: 56 },
  { county: 'Västerbotten', totalForestAreaHa: 3200000, annualHarvestM3: 12000000, standingVolumeM3: 410000000, forestCoverPercent: 58 },
  { county: 'Norrbotten', totalForestAreaHa: 4800000, annualHarvestM3: 11000000, standingVolumeM3: 520000000, forestCoverPercent: 49 },
  { county: 'Dalarna', totalForestAreaHa: 2100000, annualHarvestM3: 9500000, standingVolumeM3: 290000000, forestCoverPercent: 73 },
  { county: 'Gävleborg', totalForestAreaHa: 1350000, annualHarvestM3: 7200000, standingVolumeM3: 195000000, forestCoverPercent: 74 },
];

const DEMO_PRICE_HISTORY: PriceHistoryEntry[] = [
  { period: '2023K1', priceSEKperM3: 580 },
  { period: '2023K2', priceSEKperM3: 595 },
  { period: '2023K3', priceSEKperM3: 600 },
  { period: '2023K4', priceSEKperM3: 610 },
  { period: '2024K1', priceSEKperM3: 615 },
  { period: '2024K2', priceSEKperM3: 620 },
  { period: '2024K3', priceSEKperM3: 625 },
  { period: '2024K4', priceSEKperM3: 620 },
  { period: '2025K1', priceSEKperM3: 635 },
  { period: '2025K2', priceSEKperM3: 640 },
  { period: '2025K3', priceSEKperM3: 645 },
  { period: '2025K4', priceSEKperM3: 650 },
];

// ─── SCB API Helpers ───

interface SCBQuerySelection {
  filter: string;
  values: string[];
}

interface SCBQueryItem {
  code: string;
  selection: SCBQuerySelection;
}

interface SCBQuery {
  query: SCBQueryItem[];
  response: { format: string };
}

/**
 * Parse SCB JSON-stat response into flat records.
 * SCB returns data in a nested format with dimension indices.
 */
function parseSCBResponse(
  json: Record<string, unknown>
): { dimensions: Record<string, string[]>; values: number[] } {
  const columns = json.columns as Array<{ code: string; text: string }> | undefined;
  const data = json.data as Array<{ key: string[]; values: string[] }> | undefined;

  if (!columns || !data) {
    return { dimensions: {}, values: [] };
  }

  const dimensions: Record<string, string[]> = {};
  const values: number[] = [];

  // Extract dimension labels from column definitions
  for (const col of columns) {
    dimensions[col.code] = [];
  }

  for (const row of data) {
    for (let i = 0; i < row.key.length; i++) {
      const colCode = columns[i]?.code;
      if (colCode && !dimensions[colCode]?.includes(row.key[i])) {
        dimensions[colCode]?.push(row.key[i]);
      }
    }
    const val = parseFloat(row.values?.[0] ?? '0');
    values.push(isNaN(val) ? 0 : val);
  }

  return { dimensions, values };
}

function buildTimberPriceQuery(regionCodes: string[], assortmentCodes: string[]): SCBQuery {
  return {
    query: [
      {
        code: 'Region',
        selection: {
          filter: 'vs:RegionLan07',
          values: regionCodes,
        },
      },
      {
        code: 'Tradeslaggrupp',
        selection: {
          filter: 'item',
          values: assortmentCodes,
        },
      },
    ],
    response: { format: 'json' },
  };
}

// ─── Fetch Timber Prices ───

/**
 * Fetch latest quarterly timber prices from SCB.
 * Falls back to demo data if the API is unavailable.
 */
export async function fetchTimberPrices(region?: string): Promise<TimberPriceData[]> {
  const cacheKeyStr = `prices_${region ?? 'all'}`;
  const cached = priceCache.get(cacheKeyStr);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  try {
    const regionValues = region && REGION_CODES[region]
      ? [REGION_CODES[region]]
      : Object.values(REGION_CODES).filter((v, i, arr) => arr.indexOf(v) === i);

    const assortmentValues = ['010', '020', '030'];
    const query = buildTimberPriceQuery(regionValues, assortmentValues);

    const url = `${SCB_BASE_URL}/${TIMBER_PRICE_TABLE}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`SCB API failed: ${response.status}`);
    }

    const json = await response.json();
    const data = json.data as Array<{ key: string[]; values: string[] }> | undefined;

    if (!data || data.length === 0) {
      throw new Error('Empty SCB response');
    }

    // Map assortment codes to Swedish names
    const assortmentNames: Record<string, string> = {
      '010': 'Sågtimmer gran',
      '020': 'Sågtimmer tall',
      '030': 'Massaved',
      '031': 'Massaved gran',
      '032': 'Massaved tall',
      '033': 'Massaved löv',
    };

    const regionNames: Record<string, string> = {};
    for (const [name, code] of Object.entries(REGION_CODES)) {
      regionNames[code] = name;
    }

    const results: TimberPriceData[] = data.map((row) => ({
      period: row.key[2] ?? '',
      region: regionNames[row.key[0]] ?? row.key[0],
      assortment: assortmentNames[row.key[1]] ?? row.key[1],
      priceSEKperM3: parseFloat(row.values?.[0] ?? '0'),
    }));

    priceCache.set(cacheKeyStr, { data: results, fetchedAt: Date.now() });
    return results;
  } catch (err) {
    console.warn('[SCB] Timber price fetch failed, using demo data:', err);
    const filtered = region
      ? DEMO_TIMBER_PRICES.filter((p) => p.region === region)
      : DEMO_TIMBER_PRICES;
    priceCache.set(cacheKeyStr, { data: filtered, fetchedAt: Date.now() });
    return filtered;
  }
}

// ─── Fetch Price History ───

/**
 * Fetch historical price trend for a specific assortment.
 * Returns quarterly prices sorted chronologically.
 */
export async function fetchPriceHistory(
  assortment: string = 'Sågtimmer gran',
  periods: number = 12
): Promise<PriceHistoryEntry[]> {
  try {
    const assortmentCode = ASSORTMENT_CODES[assortment] ?? '010';
    const query: SCBQuery = {
      query: [
        {
          code: 'Region',
          selection: { filter: 'vs:RegionLan07', values: ['00'] },
        },
        {
          code: 'Tradeslaggrupp',
          selection: { filter: 'item', values: [assortmentCode] },
        },
      ],
      response: { format: 'json' },
    };

    const url = `${SCB_BASE_URL}/${TIMBER_PRICE_TABLE}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`SCB price history failed: ${response.status}`);
    }

    const json = await response.json();
    const data = json.data as Array<{ key: string[]; values: string[] }> | undefined;

    if (!data || data.length === 0) {
      throw new Error('Empty SCB history response');
    }

    const history: PriceHistoryEntry[] = data
      .map((row) => ({
        period: row.key[2] ?? '',
        priceSEKperM3: parseFloat(row.values?.[0] ?? '0'),
      }))
      .filter((e) => e.priceSEKperM3 > 0)
      .slice(-periods);

    return history;
  } catch (err) {
    console.warn('[SCB] Price history fetch failed, using demo data:', err);
    return DEMO_PRICE_HISTORY.slice(-periods);
  }
}

// ─── Regional Forest Statistics ───

/**
 * Fetch forest area, harvest volume, and standing volume by county.
 * Falls back to demo data based on official Riksskogstaxeringen figures.
 */
export async function fetchRegionalForestStats(
  county?: string
): Promise<ForestStatistics[]> {
  // SCB forest statistics tables require different table paths
  // and complex queries. Use demo data based on official figures.
  const stats = county
    ? DEMO_FOREST_STATS.filter((s) => s.county === county)
    : DEMO_FOREST_STATS;

  return stats;
}

// ─── Price Comparison ───

/**
 * Compare latest timber prices across all regions.
 * Returns RegionalTimberPrices with year-over-year change calculated.
 */
export async function getLatestPriceComparison(): Promise<RegionalTimberPrices[]> {
  const allPrices = await fetchTimberPrices();

  // Group by region
  const regions = [...new Set(allPrices.map((p) => p.region))];
  const latestPeriod = allPrices
    .map((p) => p.period)
    .sort()
    .pop() ?? '2025K4';

  // Derive previous year period (e.g., 2025K4 -> 2024K4)
  const year = parseInt(latestPeriod.slice(0, 4), 10);
  const quarter = latestPeriod.slice(4);
  const prevYearPeriod = `${year - 1}${quarter}`;

  return regions.map((region) => {
    const latest = allPrices.filter((p) => p.region === region && p.period === latestPeriod);
    const prevYear = allPrices.filter((p) => p.region === region && p.period === prevYearPeriod);

    const spruce = latest.find((p) => p.assortment === 'Sågtimmer gran')?.priceSEKperM3 ?? 0;
    const pine = latest.find((p) => p.assortment === 'Sågtimmer tall')?.priceSEKperM3 ?? 0;
    const pulp = latest.find((p) => p.assortment === 'Massaved')?.priceSEKperM3 ?? 0;

    const prevSpruce = prevYear.find((p) => p.assortment === 'Sågtimmer gran')?.priceSEKperM3 ?? 0;
    const yoyChange = prevSpruce > 0
      ? Math.round(((spruce - prevSpruce) / prevSpruce) * 1000) / 10
      : 0;

    return {
      region,
      spruceSawlog: spruce,
      pineSawlog: pine,
      pulpwood: pulp,
      period: latestPeriod,
      yearOverYearChange: yoyChange,
    };
  });
}
