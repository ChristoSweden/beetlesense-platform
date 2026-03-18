/**
 * useTimberPrices — Live timber price intelligence hook.
 *
 * Calls the timber-prices Edge Function to fetch real scraped prices from
 * all major Swedish timber buyers (Sodra, SCA, Holmen, Stora Enso, Sveaskog,
 * Vida, Setra, Moelven). Falls back to hardcoded demo prices when the Edge
 * Function is unavailable.
 *
 * Returns prices grouped by buyer and assortment, with computed best prices,
 * ranges, and averages.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ───

export type Region = 'Gotaland' | 'Svealand' | 'Norrland' | 'Hela Sverige';

export interface TimberPriceRow {
  id?: string;
  buyer: string;
  assortment: string;
  price_sek_per_m3fub: number;
  region: Region | string;
  valid_from: string;
  valid_to: string | null;
  source_url: string;
  is_estimated: boolean;
  is_stale?: boolean;
  fetched_at: string;
}

export interface PriceByAssortment {
  assortment: string;
  best: { buyer: string; price: number };
  worst: { buyer: string; price: number };
  average: number;
  range: [number, number];
  buyers: { buyer: string; price: number; is_estimated: boolean; is_stale: boolean }[];
}

export interface PriceByBuyer {
  buyer: string;
  region: string;
  source_url: string;
  assortments: Record<string, number>;
  is_estimated: boolean;
  fetched_at: string;
}

export interface TimberPricesData {
  /** Raw price rows */
  prices: TimberPriceRow[];
  /** Prices grouped by assortment with best/worst/average */
  byAssortment: PriceByAssortment[];
  /** Prices grouped by buyer */
  byBuyer: PriceByBuyer[];
  /** Best price for each assortment */
  bestPrices: Record<string, { buyer: string; price: number }>;
  /** All unique buyer names */
  buyers: string[];
  /** All unique assortment names */
  assortments: string[];
  /** Timestamp of most recent fetch */
  lastUpdated: string | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether using fallback demo data */
  isDemo: boolean;
  /** Force refresh prices from sources */
  refresh: () => Promise<void>;
}

// ─── DEMO FALLBACK PRICES ───
// Based on real 2025-2026 Swedish market prices

const DEMO_PRICES: TimberPriceRow[] = [
  // Sodra - Gotaland
  { buyer: 'Sodra', assortment: 'Talltimmer', price_sek_per_m3fub: 780, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sodra.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Sodra', assortment: 'Grantimmer', price_sek_per_m3fub: 720, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sodra.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Sodra', assortment: 'Massaved tall', price_sek_per_m3fub: 370, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sodra.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Sodra', assortment: 'Massaved gran', price_sek_per_m3fub: 350, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sodra.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Sodra', assortment: 'Bjorkmassa', price_sek_per_m3fub: 400, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sodra.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  // SCA - Norrland
  { buyer: 'SCA', assortment: 'Talltimmer', price_sek_per_m3fub: 730, region: 'Norrland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sca.com/sv/skogsliv/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'SCA', assortment: 'Grantimmer', price_sek_per_m3fub: 680, region: 'Norrland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sca.com/sv/skogsliv/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'SCA', assortment: 'Massaved tall', price_sek_per_m3fub: 340, region: 'Norrland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sca.com/sv/skogsliv/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'SCA', assortment: 'Massaved gran', price_sek_per_m3fub: 320, region: 'Norrland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sca.com/sv/skogsliv/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'SCA', assortment: 'Bjorkmassa', price_sek_per_m3fub: 370, region: 'Norrland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sca.com/sv/skogsliv/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  // Stora Enso - Svealand
  { buyer: 'Stora Enso', assortment: 'Talltimmer', price_sek_per_m3fub: 760, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.storaenso.com/sv-se/skog/virkespriser', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Stora Enso', assortment: 'Grantimmer', price_sek_per_m3fub: 710, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.storaenso.com/sv-se/skog/virkespriser', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Stora Enso', assortment: 'Massaved tall', price_sek_per_m3fub: 360, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.storaenso.com/sv-se/skog/virkespriser', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Stora Enso', assortment: 'Massaved gran', price_sek_per_m3fub: 340, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.storaenso.com/sv-se/skog/virkespriser', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Stora Enso', assortment: 'Bjorkmassa', price_sek_per_m3fub: 390, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.storaenso.com/sv-se/skog/virkespriser', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  // Holmen - Svealand
  { buyer: 'Holmen', assortment: 'Talltimmer', price_sek_per_m3fub: 750, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.holmen.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Holmen', assortment: 'Grantimmer', price_sek_per_m3fub: 700, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.holmen.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Holmen', assortment: 'Massaved tall', price_sek_per_m3fub: 355, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.holmen.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Holmen', assortment: 'Massaved gran', price_sek_per_m3fub: 335, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.holmen.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Holmen', assortment: 'Bjorkmassa', price_sek_per_m3fub: 385, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.holmen.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  // Sveaskog - Hela Sverige
  { buyer: 'Sveaskog', assortment: 'Talltimmer', price_sek_per_m3fub: 770, region: 'Hela Sverige', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Sveaskog', assortment: 'Grantimmer', price_sek_per_m3fub: 715, region: 'Hela Sverige', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Sveaskog', assortment: 'Massaved tall', price_sek_per_m3fub: 365, region: 'Hela Sverige', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Sveaskog', assortment: 'Massaved gran', price_sek_per_m3fub: 345, region: 'Hela Sverige', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Sveaskog', assortment: 'Bjorkmassa', price_sek_per_m3fub: 395, region: 'Hela Sverige', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.sveaskog.se/kop-eller-salj-virke/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  // Vida - Gotaland
  { buyer: 'Vida', assortment: 'Talltimmer', price_sek_per_m3fub: 790, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.vida.se/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Vida', assortment: 'Grantimmer', price_sek_per_m3fub: 735, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.vida.se/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Vida', assortment: 'Massaved tall', price_sek_per_m3fub: 375, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.vida.se/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Vida', assortment: 'Massaved gran', price_sek_per_m3fub: 355, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.vida.se/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Vida', assortment: 'Bjorkmassa', price_sek_per_m3fub: 405, region: 'Gotaland', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.vida.se/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  // Setra - Svealand
  { buyer: 'Setra', assortment: 'Talltimmer', price_sek_per_m3fub: 775, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.setragroup.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Setra', assortment: 'Grantimmer', price_sek_per_m3fub: 725, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.setragroup.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Setra', assortment: 'Massaved tall', price_sek_per_m3fub: 360, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.setragroup.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Setra', assortment: 'Massaved gran', price_sek_per_m3fub: 345, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.setragroup.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Setra', assortment: 'Bjorkmassa', price_sek_per_m3fub: 390, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.setragroup.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  // Moelven - Svealand
  { buyer: 'Moelven', assortment: 'Talltimmer', price_sek_per_m3fub: 765, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.moelven.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Moelven', assortment: 'Grantimmer', price_sek_per_m3fub: 710, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.moelven.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Moelven', assortment: 'Massaved tall', price_sek_per_m3fub: 350, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.moelven.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Moelven', assortment: 'Massaved gran', price_sek_per_m3fub: 335, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.moelven.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
  { buyer: 'Moelven', assortment: 'Bjorkmassa', price_sek_per_m3fub: 380, region: 'Svealand', valid_from: '2026-01-01', valid_to: null, source_url: 'https://www.moelven.com/sv/skog/virkespriser/', is_estimated: true, fetched_at: '2026-01-15T00:00:00Z' },
];

const ALL_ASSORTMENTS = ['Talltimmer', 'Grantimmer', 'Massaved tall', 'Massaved gran', 'Bjorkmassa'];
const _ALL_BUYERS = ['Sodra', 'SCA', 'Stora Enso', 'Holmen', 'Sveaskog', 'Vida', 'Setra', 'Moelven'];

// ─── Hook ───

export function useTimberPrices(regionFilter?: Region): TimberPricesData {
  const [prices, setPrices] = useState<TimberPriceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchPrices = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setPrices(DEMO_PRICES);
      setIsDemo(true);
      setIsLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (force) params.set('force', 'true');
      if (regionFilter) params.set('region', regionFilter);

      const { data, error: fnError } = await supabase.functions.invoke('timber-prices', {
        body: undefined,
        method: 'GET',
        headers: {},
      });

      if (fnError) throw fnError;

      if (data?.data?.prices && data.data.prices.length > 0) {
        setPrices(data.data.prices);
        setIsDemo(false);
      } else {
        // Edge Function returned no prices — fall back to direct table query
        const { data: dbPrices, error: dbError } = await supabase
          .from('timber_prices')
          .select('*')
          .order('buyer', { ascending: true });

        if (dbError || !dbPrices || dbPrices.length === 0) {
          setPrices(DEMO_PRICES);
          setIsDemo(true);
        } else {
          setPrices(dbPrices);
          setIsDemo(false);
        }
      }
    } catch (e) {
      console.warn('useTimberPrices: Edge Function unavailable, using demo data', e);
      // Try direct table read as fallback
      try {
        const { data: dbPrices } = await supabase
          .from('timber_prices')
          .select('*')
          .order('buyer', { ascending: true });

        if (dbPrices && dbPrices.length > 0) {
          setPrices(dbPrices);
          setIsDemo(false);
        } else {
          setPrices(DEMO_PRICES);
          setIsDemo(true);
        }
      } catch {
        setPrices(DEMO_PRICES);
        setIsDemo(true);
      }
      setError('Kunde inte hamta priser. Visar uppskattade priser.');
    } finally {
      setIsLoading(false);
    }
  }, [regionFilter]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const refresh = useCallback(async () => {
    await fetchPrices(true);
  }, [fetchPrices]);

  // Filter by region if specified
  const filteredPrices = useMemo(() => {
    if (!regionFilter) return prices;
    return prices.filter(
      (p) => p.region === regionFilter || p.region === 'Hela Sverige'
    );
  }, [prices, regionFilter]);

  // Group by assortment with computed stats
  const byAssortment = useMemo((): PriceByAssortment[] => {
    return ALL_ASSORTMENTS.map((assortment) => {
      const rows = filteredPrices.filter((p) => p.assortment === assortment);
      if (rows.length === 0) {
        return {
          assortment,
          best: { buyer: '-', price: 0 },
          worst: { buyer: '-', price: 0 },
          average: 0,
          range: [0, 0] as [number, number],
          buyers: [],
        };
      }

      const sorted = [...rows].sort((a, b) => b.price_sek_per_m3fub - a.price_sek_per_m3fub);
      const priceValues = rows.map((r) => r.price_sek_per_m3fub);
      const avg = Math.round(priceValues.reduce((s, v) => s + v, 0) / priceValues.length);

      return {
        assortment,
        best: { buyer: sorted[0].buyer, price: sorted[0].price_sek_per_m3fub },
        worst: { buyer: sorted[sorted.length - 1].buyer, price: sorted[sorted.length - 1].price_sek_per_m3fub },
        average: avg,
        range: [Math.min(...priceValues), Math.max(...priceValues)] as [number, number],
        buyers: rows.map((r) => ({
          buyer: r.buyer,
          price: r.price_sek_per_m3fub,
          is_estimated: r.is_estimated,
          is_stale: r.is_stale ?? false,
        })),
      };
    });
  }, [filteredPrices]);

  // Group by buyer
  const byBuyer = useMemo((): PriceByBuyer[] => {
    const buyerMap = new Map<string, PriceByBuyer>();

    for (const p of filteredPrices) {
      if (!buyerMap.has(p.buyer)) {
        buyerMap.set(p.buyer, {
          buyer: p.buyer,
          region: p.region,
          source_url: p.source_url,
          assortments: {},
          is_estimated: p.is_estimated,
          fetched_at: p.fetched_at,
        });
      }
      buyerMap.get(p.buyer)!.assortments[p.assortment] = p.price_sek_per_m3fub;
    }

    return Array.from(buyerMap.values()).sort((a, b) => a.buyer.localeCompare(b.buyer));
  }, [filteredPrices]);

  // Best price per assortment
  const bestPrices = useMemo(() => {
    const result: Record<string, { buyer: string; price: number }> = {};
    for (const a of byAssortment) {
      result[a.assortment] = a.best;
    }
    return result;
  }, [byAssortment]);

  // Unique lists
  const buyers = useMemo(
    () => [...new Set(filteredPrices.map((p) => p.buyer))].sort(),
    [filteredPrices]
  );
  const assortments = useMemo(
    () => [...new Set(filteredPrices.map((p) => p.assortment))],
    [filteredPrices]
  );

  // Last updated
  const lastUpdated = useMemo(() => {
    if (filteredPrices.length === 0) return null;
    return filteredPrices.reduce((latest, p) => {
      return p.fetched_at > latest ? p.fetched_at : latest;
    }, filteredPrices[0].fetched_at);
  }, [filteredPrices]);

  return {
    prices: filteredPrices,
    byAssortment,
    byBuyer,
    bestPrices,
    buyers,
    assortments,
    lastUpdated,
    isLoading,
    error,
    isDemo,
    refresh,
  };
}
