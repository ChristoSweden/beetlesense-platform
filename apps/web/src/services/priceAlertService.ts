/**
 * PriceAlertService — Smart price alerts with personalized sell signals.
 *
 * Connects real timber prices to YOUR parcels and tells you when to sell.
 * Prices in SEK/m³fub, based on Swedish regional market data.
 */

// ─── Types ───

export interface PriceAlert {
  id: string;
  species: 'spruce' | 'pine' | 'birch';
  region: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  trend: 'rising' | 'falling' | 'stable';
  historicalAvg: number;
  aboveAverage: boolean;
  percentAboveAvg: number;
  timestamp: Date;
}

export interface SellSignal {
  id: string;
  parcelName: string;
  species: 'spruce' | 'pine' | 'birch';
  readyVolume: number;
  currentPrice: number;
  userMinPrice: number;
  estimatedRevenue: number;
  signal: 'strong_sell' | 'sell' | 'hold' | 'wait';
  reasoning: string;
  expiresAt: Date;
}

export interface PriceAlertSettings {
  userId: string;
  enableAlerts: boolean;
  species: Array<'spruce' | 'pine' | 'birch'>;
  region: string;
  minPriceSpruce: number;
  minPricePine: number;
  minPriceBirch: number;
  alertOnRise: boolean;
  alertOnDrop: boolean;
  weeklyDigest: boolean;
}

export interface MonthlyPricePoint {
  month: string; // YYYY-MM
  label: string;
  spruce: number;
  pine: number;
  birch: number;
}

export type Species = 'spruce' | 'pine' | 'birch';

// ─── Constants ───

export const REGIONS = ['Småland', 'Götaland', 'Svealand'] as const;

export const SPECIES_CONFIG: Record<Species, { nameSv: string; nameEn: string; color: string }> = {
  spruce: { nameSv: 'Gran', nameEn: 'Spruce', color: '#4ade80' },
  pine: { nameSv: 'Tall', nameEn: 'Pine', color: '#f59e0b' },
  birch: { nameSv: 'Björk', nameEn: 'Birch', color: '#a78bfa' },
};

// ─── Demo price generation ───

/** Generate seasonal variation: higher in winter (Oct-Feb), lower in summer (May-Jul) */
function seasonalFactor(monthIndex: number): number {
  // monthIndex 0 = Jan, 11 = Dec
  const factors = [1.04, 1.03, 1.01, 0.99, 0.96, 0.94, 0.95, 0.97, 0.99, 1.02, 1.04, 1.05];
  return factors[monthIndex] ?? 1;
}

/** Seeded pseudo-random for consistent demo data */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function generatePriceHistory(basePrice: number, species: Species): MonthlyPricePoint[] {
  const now = new Date();
  const points: MonthlyPricePoint[] = [];
  const speciesSeed = species === 'spruce' ? 1 : species === 'pine' ? 2 : 3;

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthIdx = d.getMonth();
    const noise = (seededRandom(speciesSeed * 100 + i) - 0.5) * 30;
    const price = Math.round(basePrice * seasonalFactor(monthIdx) + noise);

    points.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('sv-SE', { month: 'short' }),
      spruce: species === 'spruce' ? price : 0,
      pine: species === 'pine' ? price : 0,
      birch: species === 'birch' ? price : 0,
    });
  }

  return points;
}

function generate12MonthHistory(): MonthlyPricePoint[] {
  const spruceHistory = generatePriceHistory(650, 'spruce');
  const pineHistory = generatePriceHistory(585, 'pine');
  const birchHistory = generatePriceHistory(485, 'birch');

  return spruceHistory.map((sp, i) => ({
    month: sp.month,
    label: sp.label,
    spruce: sp.spruce,
    pine: pineHistory[i]?.pine ?? 0,
    birch: birchHistory[i]?.birch ?? 0,
  }));
}

// ─── Demo data ───

const DEMO_HISTORY = generate12MonthHistory();

function avg5Year(species: Species): number {
  // Simulated 5-year averages (slightly lower than current highs)
  if (species === 'spruce') return 610;
  if (species === 'pine') return 555;
  return 460;
}

function generateRegionalPrices(): PriceAlert[] {
  const alerts: PriceAlert[] = [];
  const now = new Date();

  const basePrices: Record<Species, [number, number]> = {
    spruce: [620, 680],
    pine: [550, 620],
    birch: [450, 520],
  };

  for (const region of REGIONS) {
    for (const species of ['spruce', 'pine', 'birch'] as Species[]) {
      const regionSeed = region === 'Småland' ? 1 : region === 'Götaland' ? 2 : 3;
      const speciesSeed = species === 'spruce' ? 10 : species === 'pine' ? 20 : 30;
      const rand = seededRandom(regionSeed + speciesSeed);
      const [lo, hi] = basePrices[species];
      const currentPrice = Math.round(lo + rand * (hi - lo));
      const prevRand = seededRandom(regionSeed + speciesSeed + 100);
      const previousPrice = Math.round(lo + prevRand * (hi - lo) * 0.95);
      const changePercent = previousPrice > 0
        ? Math.round(((currentPrice - previousPrice) / previousPrice) * 1000) / 10
        : 0;
      const historical = avg5Year(species);
      const percentAboveAvg = historical > 0
        ? Math.round(((currentPrice - historical) / historical) * 1000) / 10
        : 0;

      alerts.push({
        id: `${region}-${species}`,
        species,
        region,
        currentPrice,
        previousPrice,
        changePercent,
        trend: changePercent > 1 ? 'rising' : changePercent < -1 ? 'falling' : 'stable',
        historicalAvg: historical,
        aboveAverage: currentPrice > historical,
        percentAboveAvg,
        timestamp: now,
      });
    }
  }

  return alerts;
}

function generateSellSignals(prices: PriceAlert[]): SellSignal[] {
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Demo parcels with ready timber
  const parcels = [
    { name: 'Norra Skiftet', species: 'spruce' as Species, volume: 200, minPrice: 580 },
    { name: 'Södermalm Skog', species: 'pine' as Species, volume: 120, minPrice: 560 },
    { name: 'Björklunden', species: 'birch' as Species, volume: 80, minPrice: 470 },
  ];

  return parcels.map((parcel) => {
    const priceData = prices.find(
      (p) => p.species === parcel.species && p.region === 'Småland',
    );
    const currentPrice = priceData?.currentPrice ?? 0;
    const estimatedRevenue = currentPrice * parcel.volume;
    const abovePct = priceData?.percentAboveAvg ?? 0;
    const aboveMin = parcel.minPrice > 0
      ? Math.round(((currentPrice - parcel.minPrice) / parcel.minPrice) * 100)
      : 0;

    let signal: SellSignal['signal'] = 'wait';
    let reasoning = '';

    if (aboveMin >= 10 && abovePct >= 5) {
      signal = 'strong_sell';
      reasoning = `${SPECIES_CONFIG[parcel.species].nameEn} prices are ${aboveMin}% above your minimum and ${abovePct}% above the 5-year average. Prices typically decline in May-June.`;
    } else if (aboveMin >= 5 || abovePct >= 3) {
      signal = 'sell';
      reasoning = `Prices are ${aboveMin}% above your target. Current market conditions are favorable — consider selling within the next few weeks.`;
    } else if (currentPrice >= parcel.minPrice) {
      signal = 'hold';
      reasoning = `Prices have reached your minimum but are near the 5-year average. The trend is stable — no urgency, but conditions are acceptable.`;
    } else {
      signal = 'wait';
      reasoning = `Prices are ${Math.abs(aboveMin)}% below your target. Market forecasts suggest improvement in Q4.`;
    }

    return {
      id: `sell-${parcel.name.toLowerCase().replace(/\s/g, '-')}`,
      parcelName: parcel.name,
      species: parcel.species,
      readyVolume: parcel.volume,
      currentPrice,
      userMinPrice: parcel.minPrice,
      estimatedRevenue,
      signal,
      reasoning,
      expiresAt: expires,
    };
  });
}

// ─── Public API ───

const CACHED_PRICES = generateRegionalPrices();
const CACHED_SIGNALS = generateSellSignals(CACHED_PRICES);
const CACHED_HISTORY = DEMO_HISTORY;

/** Get current prices for all species and regions */
export function getPriceAlerts(region?: string): PriceAlert[] {
  if (region) return CACHED_PRICES.filter((p) => p.region === region);
  return CACHED_PRICES;
}

/** Get prices for a specific region (default: Småland) */
export function getRegionalPrices(region: string = 'Småland'): PriceAlert[] {
  return CACHED_PRICES.filter((p) => p.region === region);
}

/** Get the best current price for a species across all regions */
export function getBestPrice(species: Species): PriceAlert | undefined {
  return CACHED_PRICES
    .filter((p) => p.species === species)
    .sort((a, b) => b.currentPrice - a.currentPrice)[0];
}

/** Get personalized sell signals */
export function getSellSignals(): SellSignal[] {
  return CACHED_SIGNALS;
}

/** Get the strongest active sell signal (for the dashboard widget) */
export function getTopSellSignal(): SellSignal | null {
  const strong = CACHED_SIGNALS.find((s) => s.signal === 'strong_sell');
  if (strong) return strong;
  const sell = CACHED_SIGNALS.find((s) => s.signal === 'sell');
  return sell ?? null;
}

/** Get 12-month price history */
export function getPriceHistory(): MonthlyPricePoint[] {
  return CACHED_HISTORY;
}

/** Get 5-year average for a species */
export function get5YearAverage(species: Species): number {
  return avg5Year(species);
}

/** Format SEK value for display */
export function formatSEK(value: number): string {
  return value.toLocaleString('sv-SE');
}

/** Default settings for new users */
export function getDefaultSettings(): PriceAlertSettings {
  return {
    userId: 'demo-user',
    enableAlerts: true,
    species: ['spruce', 'pine', 'birch'],
    region: 'Småland',
    minPriceSpruce: 600,
    minPricePine: 570,
    minPriceBirch: 470,
    alertOnRise: true,
    alertOnDrop: true,
    weeklyDigest: true,
  };
}
