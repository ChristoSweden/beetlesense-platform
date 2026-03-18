// Nord Pool electricity spot price service for Swedish energy areas
export interface SpotPrice {
  hour: number;
  priceOreKwh: number;
  priceEurMwh: number;
  area: EnergyArea;
  date: string;
}

export type EnergyArea = 'SE1' | 'SE2' | 'SE3' | 'SE4';

export interface BiomassValue {
  energyWoodPriceKrM3: number;
  grotPriceKrM3: number;
  brannvedPriceKrM3: number;
  spotBasis: number;
  area: EnergyArea;
  calculatedAt: string;
}

export interface MonthlyAverage {
  month: string;
  avgOreKwh: number;
  minOreKwh: number;
  maxOreKwh: number;
  area: EnergyArea;
}

const AREA_BASE_PRICES: Record<EnergyArea, number> = {
  SE1: 30,
  SE2: 35,
  SE3: 55,
  SE4: 65,
};

function generateHourlyPrices(area: EnergyArea, date: string): SpotPrice[] {
  const base = AREA_BASE_PRICES[area];
  const hourlyPattern = [
    0.7, 0.65, 0.6, 0.58, 0.6, 0.75, 0.95, 1.3, 1.4, 1.25,
    1.1, 1.05, 1.0, 0.95, 0.9, 0.95, 1.1, 1.35, 1.45, 1.3,
    1.15, 1.0, 0.9, 0.8,
  ];
  return hourlyPattern.map((factor, hour) => {
    const jitter = (Math.sin(hour * 7 + base) * 0.1 + 1);
    const price = Math.round(base * factor * jitter * 100) / 100;
    return {
      hour,
      priceOreKwh: price,
      priceEurMwh: Math.round(price * 0.89 * 100) / 100,
      area,
      date,
    };
  });
}

export async function getSpotPrices(area: EnergyArea, date?: string): Promise<SpotPrice[]> {
  const d = date || new Date().toISOString().slice(0, 10);
  // In production: fetch from Nord Pool API or Entsoe transparency platform
  await new Promise(r => setTimeout(r, 200));
  return generateHourlyPrices(area, d);
}

export async function getBiomassValuation(volumeM3: number, area: EnergyArea): Promise<BiomassValue> {
  const prices = await getSpotPrices(area);
  const avgPrice = prices.reduce((s, p) => s + p.priceOreKwh, 0) / prices.length;
  // Energy wood: ~2 MWh/m3fub, GROT: ~0.9 MWh/m3s, Brännved: ~1.4 MWh/m3
  const eurSek = 11.20;
  const energyWoodPriceKrM3 = Math.round(avgPrice * 0.01 * 2000 * eurSek * 0.35);
  const grotPriceKrM3 = Math.round(avgPrice * 0.01 * 900 * eurSek * 0.25);
  const brannvedPriceKrM3 = Math.round(avgPrice * 0.01 * 1400 * eurSek * 0.30);

  return {
    energyWoodPriceKrM3,
    grotPriceKrM3,
    brannvedPriceKrM3,
    spotBasis: Math.round(avgPrice * 100) / 100,
    area,
    calculatedAt: new Date().toISOString(),
  };
}

export async function getHistoricalPrices(area: EnergyArea, months: number): Promise<MonthlyAverage[]> {
  await new Promise(r => setTimeout(r, 150));
  const base = AREA_BASE_PRICES[area];
  const result: MonthlyAverage[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0, 7);
    const seasonal = 1 + 0.3 * Math.sin((d.getMonth() - 1) * Math.PI / 6);
    const avg = Math.round(base * seasonal * 100) / 100;
    result.push({
      month: monthStr,
      avgOreKwh: avg,
      minOreKwh: Math.round(avg * 0.6 * 100) / 100,
      maxOreKwh: Math.round(avg * 1.5 * 100) / 100,
      area,
    });
  }
  return result;
}
