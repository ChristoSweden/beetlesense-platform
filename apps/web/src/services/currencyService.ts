// Riksbanken exchange rate service
export interface ExchangeRate {
  pair: string;
  rate: number;
  change24h: number;
  changePercent: number;
  timestamp: string;
  source: string;
}

export interface ExchangeRateHistory {
  date: string;
  rate: number;
}

export async function getEURSEK(): Promise<ExchangeRate> {
  // In production: fetch from Riksbanken open API
  // https://api.riksbank.se/swea/v1/CrossRates/SEKEURPMI/
  await new Promise(r => setTimeout(r, 80));
  return {
    pair: 'EUR/SEK',
    rate: 11.1847,
    change24h: -0.0231,
    changePercent: -0.21,
    timestamp: new Date().toISOString(),
    source: 'Riksbanken',
  };
}

export async function getUSDSEK(): Promise<ExchangeRate> {
  await new Promise(r => setTimeout(r, 80));
  return {
    pair: 'USD/SEK',
    rate: 10.3215,
    change24h: 0.0145,
    changePercent: 0.14,
    timestamp: new Date().toISOString(),
    source: 'Riksbanken',
  };
}

export async function getHistorical(months: number): Promise<ExchangeRateHistory[]> {
  await new Promise(r => setTimeout(r, 100));
  const result: ExchangeRateHistory[] = [];
  const now = new Date();
  for (let i = months * 30; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 86400000);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const base = 11.20;
    const trend = -0.001 * i;
    const noise = Math.sin(i * 0.3) * 0.15 + Math.cos(i * 0.7) * 0.1;
    result.push({
      date: d.toISOString().slice(0, 10),
      rate: Math.round((base + trend + noise) * 10000) / 10000,
    });
  }
  return result;
}
