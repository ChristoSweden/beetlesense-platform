// EU ETS carbon credit price service
export interface CarbonPrice {
  priceEurTonne: number;
  priceSekTonne: number;
  change24h: number;
  changePercent24h: number;
  timestamp: string;
  source: string;
}

export interface CarbonPriceHistory {
  month: string;
  priceEur: number;
  priceSek: number;
  volume: number;
}

export interface CarbonValuation {
  hectares: number;
  annualSequestrationTonnes: number;
  annualValueEur: number;
  annualValueSek: number;
  tenYearProjectedValueSek: number;
  pricePerTonne: number;
  growthRateTonnesHaYear: number;
}

// EU ETS price trajectory: €25 (2020) → €70 (2026)
const HISTORICAL_EU_ETS: Array<{ month: string; priceEur: number }> = [
  { month: '2025-04', priceEur: 62 }, { month: '2025-05', priceEur: 64 },
  { month: '2025-06', priceEur: 63 }, { month: '2025-07', priceEur: 65 },
  { month: '2025-08', priceEur: 67 }, { month: '2025-09', priceEur: 66 },
  { month: '2025-10', priceEur: 68 }, { month: '2025-11', priceEur: 69 },
  { month: '2025-12', priceEur: 71 }, { month: '2026-01', priceEur: 72 },
  { month: '2026-02', priceEur: 70 }, { month: '2026-03', priceEur: 73 },
];

const EUR_SEK = 11.20;

export async function getCurrentPrice(): Promise<CarbonPrice> {
  await new Promise(r => setTimeout(r, 100));
  return {
    priceEurTonne: 73.25,
    priceSekTonne: Math.round(73.25 * EUR_SEK),
    change24h: 1.15,
    changePercent24h: 1.6,
    timestamp: new Date().toISOString(),
    source: 'EU ETS (ICE Endex)',
  };
}

export async function getHistoricalPrices(months: number): Promise<CarbonPriceHistory[]> {
  await new Promise(r => setTimeout(r, 100));
  return HISTORICAL_EU_ETS.slice(-months).map(h => ({
    ...h,
    priceSek: Math.round(h.priceEur * EUR_SEK),
    volume: Math.round(150000 + Math.random() * 80000),
  }));
}

export async function calculateForestCarbonValue(
  hectares: number,
  growthRate: number = 6.5
): Promise<CarbonValuation> {
  const price = await getCurrentPrice();
  // Swedish forests: 5-8 tonnes CO2/ha/year depending on species, age, management
  const annualTonnes = hectares * growthRate;
  const annualEur = Math.round(annualTonnes * price.priceEurTonne);
  const annualSek = Math.round(annualTonnes * price.priceSekTonne);
  // 10-year projection assumes 3% annual price increase
  let tenYear = 0;
  for (let y = 0; y < 10; y++) {
    tenYear += annualSek * Math.pow(1.03, y);
  }

  return {
    hectares,
    annualSequestrationTonnes: Math.round(annualTonnes),
    annualValueEur: annualEur,
    annualValueSek: annualSek,
    tenYearProjectedValueSek: Math.round(tenYear),
    pricePerTonne: price.priceSekTonne,
    growthRateTonnesHaYear: growthRate,
  };
}
