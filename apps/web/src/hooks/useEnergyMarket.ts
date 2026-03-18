import { useState, useEffect, useCallback } from 'react';
import { getSpotPrices, getBiomassValuation, getHistoricalPrices, type SpotPrice, type BiomassValue, type MonthlyAverage, type EnergyArea } from '../services/energyPriceService';
import { getCurrentPrice, calculateForestCarbonValue, getHistoricalPrices as getCarbonHistory, type CarbonPrice, type CarbonValuation, type CarbonPriceHistory } from '../services/carbonPriceService';
import { getEURSEK, type ExchangeRate } from '../services/currencyService';

export interface EnergyMarketState {
  spotPrices: SpotPrice[];
  biomassValue: BiomassValue | null;
  historicalPrices: MonthlyAverage[];
  carbonPrice: CarbonPrice | null;
  carbonForestValue: CarbonValuation | null;
  carbonHistory: CarbonPriceHistory[];
  eurSek: ExchangeRate | null;
  area: EnergyArea;
  setArea: (area: EnergyArea) => void;
  optimalSellTime: { hour: number; priceOreKwh: number; reason: string } | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const CACHE_KEY = 'beetlesense_energy_market';
const CACHE_TTL = 1800000; // 30 min

export function useEnergyMarket(hectares: number = 50): EnergyMarketState {
  const [area, setArea] = useState<EnergyArea>('SE3');
  const [spotPrices, setSpotPrices] = useState<SpotPrice[]>([]);
  const [biomassValue, setBiomassValue] = useState<BiomassValue | null>(null);
  const [historicalPrices, setHistoricalPrices] = useState<MonthlyAverage[]>([]);
  const [carbonPrice, setCarbonPrice] = useState<CarbonPrice | null>(null);
  const [carbonForestValue, setCarbonForestValue] = useState<CarbonValuation | null>(null);
  const [carbonHistory, setCarbonHistory] = useState<CarbonPriceHistory[]>([]);
  const [eurSek, setEurSek] = useState<ExchangeRate | null>(null);
  const [optimalSellTime, setOptimalSellTime] = useState<{ hour: number; priceOreKwh: number; reason: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL && data.area === area) {
          setSpotPrices(data.spotPrices);
          setBiomassValue(data.biomassValue);
          setHistoricalPrices(data.historicalPrices);
          setCarbonPrice(data.carbonPrice);
          setCarbonForestValue(data.carbonForestValue);
          setCarbonHistory(data.carbonHistory);
          setEurSek(data.eurSek);
          setOptimalSellTime(data.optimalSellTime);
          setLoading(false);
          return;
        }
      }

      const [spots, biomass, hist, carbon, carbonVal, cHistory, eur] = await Promise.all([
        getSpotPrices(area),
        getBiomassValuation(100, area),
        getHistoricalPrices(area, 12),
        getCurrentPrice(),
        calculateForestCarbonValue(hectares),
        getCarbonHistory(12),
        getEURSEK(),
      ]);

      setSpotPrices(spots);
      setBiomassValue(biomass);
      setHistoricalPrices(hist);
      setCarbonPrice(carbon);
      setCarbonForestValue(carbonVal);
      setCarbonHistory(cHistory);
      setEurSek(eur);

      // Find optimal selling time (highest price hours)
      const sorted = [...spots].sort((a, b) => b.priceOreKwh - a.priceOreKwh);
      if (sorted.length > 0) {
        const best = sorted[0];
        const avg = spots.reduce((s, p) => s + p.priceOreKwh, 0) / spots.length;
        const premium = Math.round(((best.priceOreKwh / avg) - 1) * 100);
        setOptimalSellTime({
          hour: best.hour,
          priceOreKwh: best.priceOreKwh,
          reason: `${premium}% over daily average`,
        });
      }

      const cacheData = { spotPrices: spots, biomassValue: biomass, historicalPrices: hist, carbonPrice: carbon, carbonForestValue: carbonVal, carbonHistory: cHistory, eurSek: eur, optimalSellTime, area };
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: cacheData, ts: Date.now() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, [area, hectares]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(fetchAll, 1800000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return {
    spotPrices, biomassValue, historicalPrices, carbonPrice,
    carbonForestValue, carbonHistory, eurSek, area, setArea,
    optimalSellTime, loading, error, refresh: fetchAll,
  };
}
