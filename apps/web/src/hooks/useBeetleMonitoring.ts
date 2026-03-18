import { useState, useEffect, useCallback } from 'react';
import { getBeetleTrapData, getPestZones, getAllCountyTrapData, type TrapReading, type PestZone } from '../services/skogsstyrelsenService';

export interface BeetleMonitoringState {
  trapData: TrapReading[];
  allCountyData: Record<string, TrapReading[]>;
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  trend: 'increasing' | 'stable' | 'decreasing';
  swarmPrediction: { estimatedDate: string; daysUntil: number; gddCurrent: number; gddThreshold: number } | null;
  nearbyOutbreaks: PestZone[];
  county: string;
  setCounty: (county: string) => void;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBeetleMonitoring(defaultCounty: string = 'Kronoberg'): BeetleMonitoringState {
  const [county, setCounty] = useState(defaultCounty);
  const [trapData, setTrapData] = useState<TrapReading[]>([]);
  const [allCountyData, setAllCountyData] = useState<Record<string, TrapReading[]>>({});
  const [nearbyOutbreaks, setNearbyOutbreaks] = useState<PestZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [traps, allCounty, zones] = await Promise.all([
        getBeetleTrapData(county),
        getAllCountyTrapData(),
        getPestZones(),
      ]);
      setTrapData(traps);
      setAllCountyData(allCounty);
      setNearbyOutbreaks(zones);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch beetle data');
    } finally {
      setLoading(false);
    }
  }, [county]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Compute risk level from latest trap data
  const latestWeek = trapData.length > 0 ? trapData[trapData.length - 1] : null;
  const riskLevel: BeetleMonitoringState['riskLevel'] = !latestWeek ? 'low'
    : latestWeek.count > latestWeek.threshold * 1.5 ? 'critical'
    : latestWeek.count > latestWeek.threshold ? 'high'
    : latestWeek.count > latestWeek.threshold * 0.6 ? 'moderate'
    : 'low';

  const trend = latestWeek?.trend || 'stable';

  // GDD-based swarming prediction
  // Ips typographus first flight at GDD ~600 (base 5°C)
  const gddCurrent = 285; // Mock: mid-March accumulation
  const gddThreshold = 600;
  const daysUntil = Math.round((gddThreshold - gddCurrent) / 8); // ~8 GDD/day in spring
  const estimatedDate = new Date(Date.now() + daysUntil * 86400000).toISOString().slice(0, 10);

  return {
    trapData,
    allCountyData,
    riskLevel,
    trend,
    swarmPrediction: { estimatedDate, daysUntil, gddCurrent, gddThreshold },
    nearbyOutbreaks,
    county,
    setCounty,
    loading,
    error,
    refresh: fetchAll,
  };
}
