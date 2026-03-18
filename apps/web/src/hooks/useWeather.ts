import { useState, useEffect, useCallback, useRef } from 'react';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import {
  getPointForecast,
  getDemoWeatherData,
  assessDroughtRisk,
  assessBeetleConditions,
  assessGroundFrost,
  computeHarvestWindows,
  computeStormAlerts,
  computeFrostDates,
  computeSprayWindows,
  computeGrowingDegreeDays,
  estimateSoilMoisture,
  computeMachineAccessibility,
  type SMHIForecast,
  type WeatherPoint,
  type DailyForecast,
  type RiskLevel,
  type HarvestWindow,
  type WindWarning,
  type SprayWindow,
} from '@/services/smhiService';

// ─── Types ───

export interface WeatherResult {
  forecast: SMHIForecast | null;
  current: WeatherPoint | null;
  hourly: WeatherPoint[];
  daily: DailyForecast[];
  droughtRisk: RiskLevel;
  beetleConditions: boolean;
  frostRisk: boolean;
  harvestWindows: HarvestWindow[];
  stormAlerts: WindWarning[];
  frostDates: string[];
  sprayWindows: SprayWindow[];
  gdd: number;
  soilMoisture: number;
  machineAccessibility: number;
  approvedTime: string | null;
  fetchedAt: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseWeatherOptions {
  lat?: number;
  lon?: number;
  parcelId?: string;
}

const AUTO_REFRESH_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── Hook ───

/**
 * Fetch weather data for a location or parcel.
 * In demo mode, returns realistic sample data.
 * Auto-refreshes every 6 hours. Caches in localStorage with 3h TTL (handled by service).
 */
export function useWeather(options: UseWeatherOptions = {}): WeatherResult {
  const { lat: inputLat, lon: inputLon, parcelId } = options;

  const [forecast, setForecast] = useState<SMHIForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  let lat = inputLat;
  let lon = inputLon;

  if (!lat || !lon) {
    if (parcelId) {
      const parcel = DEMO_PARCELS.find((p) => p.id === parcelId);
      if (parcel) {
        lon = parcel.center[0];
        lat = parcel.center[1];
      }
    }

    if (!lat || !lon) {
      lon = DEMO_PARCELS[0].center[0];
      lat = DEMO_PARCELS[0].center[1];
    }
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isDemo()) {
        await new Promise((r) => setTimeout(r, 300));
        const demoData = getDemoWeatherData();
        setForecast({
          ...demoData,
          lat: lat!,
          lon: lon!,
        });
      } else {
        const result = await getPointForecast(lat!, lon!);
        setForecast(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(message);
      const demoData = getDemoWeatherData();
      setForecast({
        ...demoData,
        lat: lat!,
        lon: lon!,
      });
    } finally {
      setIsLoading(false);
    }

  }, [lat, lon]);

  useEffect(() => {
    fetchData();

    refreshTimerRef.current = setInterval(fetchData, AUTO_REFRESH_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [fetchData]);

  const daily = forecast?.daily ?? [];
  const hourly = forecast?.hourly ?? [];

  const droughtRisk: RiskLevel = forecast ? assessDroughtRisk(daily) : 'low';
  const beetleConditions = forecast ? assessBeetleConditions(forecast.current, daily) : false;
  const frostRisk = forecast ? assessGroundFrost(daily) : false;
  const harvestWindows = daily.length > 0 ? computeHarvestWindows(daily) : [];
  const stormAlerts = daily.length > 0 ? computeStormAlerts(daily) : [];
  const frostDates = daily.length > 0 ? computeFrostDates(daily) : [];
  const sprayWindows = hourly.length > 0 ? computeSprayWindows(hourly) : [];
  const gdd = daily.length > 0 ? computeGrowingDegreeDays(daily) : 0;
  const soilMoisture = daily.length > 0 ? estimateSoilMoisture(daily) : 50;
  const machineAccessibility = daily.length > 0 ? computeMachineAccessibility(daily) : 50;

  return {
    forecast,
    current: forecast?.current ?? null,
    hourly,
    daily,
    droughtRisk,
    beetleConditions,
    frostRisk,
    harvestWindows,
    stormAlerts,
    frostDates,
    sprayWindows,
    gdd,
    soilMoisture,
    machineAccessibility,
    approvedTime: forecast?.approvedTime ?? null,
    fetchedAt: forecast?.fetchedAt ?? null,
    isLoading,
    error,
    refetch: fetchData,
  };
}
