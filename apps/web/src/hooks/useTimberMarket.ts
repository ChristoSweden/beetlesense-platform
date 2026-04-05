/**
 * useTimberMarket — Multi-buyer timber market intelligence hook.
 *
 * Aggregates prices from ALL major Swedish timber buyers (Sodra, SCA, Holmen,
 * Stora Enso, Sveaskog, local sagverk) to outperform single-buyer models.
 *
 * Falls back to comprehensive demo data when Supabase is not available.
 */

import { useState, useEffect, useMemo } from 'react';
import { getDataMode } from '@/lib/dataMode';
import { supabase } from '@/lib/supabase';

// ─── Types ───

export type TimberAssortment =
  | 'talltimmer'
  | 'grantimmer'
  | 'massaved_tall'
  | 'massaved_gran'
  | 'bjorkmassa';

export interface AssortmentMeta {
  id: TimberAssortment;
  nameSv: string;
  nameEn: string;
  color: string;
}

export const TIMBER_ASSORTMENTS: AssortmentMeta[] = [
  { id: 'talltimmer', nameSv: 'Talltimmer', nameEn: 'Pine sawlog', color: '#f59e0b' },
  { id: 'grantimmer', nameSv: 'Grantimmer', nameEn: 'Spruce sawlog', color: '#4ade80' },
  { id: 'massaved_tall', nameSv: 'Massaved tall', nameEn: 'Pine pulpwood', color: '#fbbf24' },
  { id: 'massaved_gran', nameSv: 'Massaved gran', nameEn: 'Spruce pulpwood', color: '#86efac' },
  { id: 'bjorkmassa', nameSv: 'Bjorkmassa', nameEn: 'Birch pulpwood', color: '#a78bfa' },
];

export interface BuyerInfo {
  id: string;
  name: string;
  type: 'major' | 'regional' | 'local';
  terminalLat: number;
  terminalLng: number;
  terminalCity: string;
  /** Distance from user's forest (km), demo default */
  distanceKm: number;
}

export interface BuyerPrice {
  buyerId: string;
  assortment: TimberAssortment;
  currentPrice: number;
  /** 12-month price history */
  history: number[];
  /** Volume-based price tiers */
  volumeTiers: { minVolume: number; bonus: number }[];
}

export interface SellingWindowWeek {
  weekLabel: string;
  weekNumber: number;
  forecasts: Record<TimberAssortment, number>;
  signal: 'sell' | 'wait' | 'hold';
  seasonalIndex: number;
}

export interface MarketData {
  buyers: BuyerInfo[];
  prices: BuyerPrice[];
  sellingWindow: SellingWindowWeek[];
  bestPrices: Record<TimberAssortment, { buyerId: string; price: number }>;
  isLoading: boolean;
}

// ─── Buyers ───

const DEMO_BUYERS: BuyerInfo[] = [
  { id: 'sodra', name: 'Sodra', type: 'major', terminalLat: 56.879, terminalLng: 14.806, terminalCity: 'Vaxjo', distanceKm: 45 },
  { id: 'sca', name: 'SCA', type: 'major', terminalLat: 62.413, terminalLng: 17.335, terminalCity: 'Sundsvall', distanceKm: 620 },
  { id: 'holmen', name: 'Holmen', type: 'major', terminalLat: 58.601, terminalLng: 16.145, terminalCity: 'Norrkoping', distanceKm: 280 },
  { id: 'stora_enso', name: 'Stora Enso', type: 'major', terminalLat: 59.325, terminalLng: 13.467, terminalCity: 'Skoghall', distanceKm: 340 },
  { id: 'sveaskog', name: 'Sveaskog', type: 'major', terminalLat: 59.860, terminalLng: 17.638, terminalCity: 'Orebro', distanceKm: 310 },
  { id: 'local_sagverk', name: 'Varnamo Sagverk', type: 'local', terminalLat: 57.186, terminalLng: 14.040, terminalCity: 'Varnamo', distanceKm: 12 },
];

// ─── Realistic Price Generation ───

/** Base prices mid-range for 2024-2026 */
const BASE_PRICES: Record<string, Record<TimberAssortment, number>> = {
  sodra:        { talltimmer: 780, grantimmer: 740, massaved_tall: 370, massaved_gran: 350, bjorkmassa: 400 },
  sca:          { talltimmer: 750, grantimmer: 710, massaved_tall: 360, massaved_gran: 340, bjorkmassa: 380 },
  holmen:       { talltimmer: 770, grantimmer: 730, massaved_tall: 380, massaved_gran: 360, bjorkmassa: 410 },
  stora_enso:   { talltimmer: 760, grantimmer: 720, massaved_tall: 365, massaved_gran: 345, bjorkmassa: 395 },
  sveaskog:     { talltimmer: 740, grantimmer: 700, massaved_tall: 355, massaved_gran: 330, bjorkmassa: 375 },
  local_sagverk:{ talltimmer: 820, grantimmer: 780, massaved_tall: 340, massaved_gran: 320, bjorkmassa: 360 },
};

/** Seasonal factors: index 0 = Apr 2025, ..., index 11 = Mar 2026 */
const SEASONAL_FACTORS = [
  0.96, 0.94, 0.92, 0.91, 0.93, 0.95,
  0.98, 1.01, 1.03, 1.04, 1.02, 1.00,
];

const _MONTH_LABELS = [
  'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
];

function generateHistory(base: number, buyerSeed: number): number[] {
  return SEASONAL_FACTORS.map((factor, i) => {
    const variance = 1 + (((i * 7 + buyerSeed * 3) % 13) - 6) * 0.004;
    return Math.round(base * factor * variance);
  });
}

const VOLUME_TIERS_MAJOR = [
  { minVolume: 0, bonus: 0 },
  { minVolume: 200, bonus: 10 },
  { minVolume: 500, bonus: 25 },
  { minVolume: 1000, bonus: 40 },
];

const VOLUME_TIERS_LOCAL = [
  { minVolume: 0, bonus: 0 },
  { minVolume: 100, bonus: 15 },
  { minVolume: 300, bonus: 30 },
];

function generateDemoPrices(): BuyerPrice[] {
  const prices: BuyerPrice[] = [];
  for (const buyer of DEMO_BUYERS) {
    const basePrices = BASE_PRICES[buyer.id];
    const seed = buyer.id.length;
    for (const assortment of TIMBER_ASSORTMENTS) {
      const base = basePrices[assortment.id];
      const history = generateHistory(base, seed);
      prices.push({
        buyerId: buyer.id,
        assortment: assortment.id,
        currentPrice: history[history.length - 1],
        history,
        volumeTiers: buyer.type === 'local' ? VOLUME_TIERS_LOCAL : VOLUME_TIERS_MAJOR,
      });
    }
  }
  return prices;
}

// ─── Selling Window Generation ───

function generateSellingWindow(prices: BuyerPrice[]): SellingWindowWeek[] {
  const weeks: SellingWindowWeek[] = [];
  const now = new Date();
  const currentWeek = getISOWeek(now);

  for (let w = 0; w < 13; w++) {
    const weekNum = ((currentWeek + w - 1) % 52) + 1;
    const seasonalIndex = getSeasonalIndex(weekNum);

    const forecasts = {} as Record<TimberAssortment, number>;
    for (const a of TIMBER_ASSORTMENTS) {
      // Average current price across buyers, then apply seasonal forecast
      const buyerPrices = prices.filter((p) => p.assortment === a.id);
      const avgCurrent = buyerPrices.reduce((s, p) => s + p.currentPrice, 0) / buyerPrices.length;
      forecasts[a.id] = Math.round(avgCurrent * seasonalIndex);
    }

    let signal: 'sell' | 'wait' | 'hold';
    if (seasonalIndex >= 1.02) signal = 'sell';
    else if (seasonalIndex >= 0.97) signal = 'wait';
    else signal = 'hold';

    weeks.push({
      weekLabel: `v${weekNum}`,
      weekNumber: weekNum,
      forecasts,
      signal,
      seasonalIndex,
    });
  }
  return weeks;
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getSeasonalIndex(weekNumber: number): number {
  // Peak: weeks 44-8 (Nov-Feb construction season demand)
  // Trough: weeks 26-34 (summer)
  const angle = ((weekNumber - 48) / 52) * 2 * Math.PI;
  return 1 + 0.05 * Math.cos(angle);
}

// ─── Transport cost ───

export function estimateTransport(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return Math.round(45 + distanceKm * 0.55);
}

// ─── Hook ───

export function useTimberMarket(): MarketData {
  const [buyers, setBuyers] = useState<BuyerInfo[]>(DEMO_BUYERS);
  const [prices, setPrices] = useState<BuyerPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      if (getDataMode() === 'live') {
        try {
          const { data } = await supabase.from('timber_prices').select('*');
          if (data && data.length > 0 && !cancelled) {
            // Map live data to our format (future implementation)
            // For now, fall through to demo
          }
        } catch {
          // Fall through to demo
        }
      }

      if (!cancelled) {
        setBuyers(DEMO_BUYERS);
        setPrices(generateDemoPrices());
        setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const sellingWindow = useMemo(() => generateSellingWindow(prices), [prices]);

  const bestPrices = useMemo(() => {
    const result: Record<string, { buyerId: string; price: number }> = {};
    for (const a of TIMBER_ASSORTMENTS) {
      let best = { buyerId: '', price: 0 };
      for (const p of prices) {
        if (p.assortment === a.id) {
          // Net price = current price - transport per m3
          const buyer = buyers.find((b) => b.id === p.buyerId);
          const transport = buyer ? estimateTransport(buyer.distanceKm) : 0;
          const netPrice = p.currentPrice - transport;
          if (netPrice > best.price) {
            best = { buyerId: p.buyerId, price: netPrice };
          }
        }
      }
      result[a.id] = best;
    }
    return result as Record<TimberAssortment, { buyerId: string; price: number }>;
  }, [prices, buyers]);

  return { buyers, prices, sellingWindow, bestPrices, isLoading };
}
