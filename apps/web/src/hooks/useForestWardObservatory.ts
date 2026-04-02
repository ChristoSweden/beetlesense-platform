import { useState, useEffect, useCallback } from 'react';
import {
  getObservatoryStatus,
  getPhenologicalStations,
  getBBOAAlerts,
  getCrossBorderSignals,
  getContributions,
  getGDDValidation,
  enrichAlertsWithDistance,
  clearForestWardCache,
  type ObservatoryStatus,
  type PhenologicalStation,
  type BBOAAlert,
  type CrossBorderSignal,
  type ForestWardContribution,
  type GDDValidation,
} from '@/services/forestWardObservatoryService';

export interface ForestWardObservatoryState {
  status: ObservatoryStatus | null;
  stations: PhenologicalStation[];
  alerts: BBOAAlert[];
  signals: CrossBorderSignal[];
  contributions: ForestWardContribution[];
  validation: GDDValidation[];
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
  refresh: () => void;
}

export function useForestWardObservatory(
  userLat: number = 57.15,
  userLon: number = 14.95
): ForestWardObservatoryState {
  const [status, setStatus] = useState<ObservatoryStatus | null>(null);
  const [stations, setStations] = useState<PhenologicalStation[]>([]);
  const [alerts, setAlerts] = useState<BBOAAlert[]>([]);
  const [signals, setSignals] = useState<CrossBorderSignal[]>([]);
  const [contributions, setContributions] = useState<ForestWardContribution[]>([]);
  const [validation, setValidation] = useState<GDDValidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, st, al, sig, con, val] = await Promise.all([
        getObservatoryStatus(),
        getPhenologicalStations(),
        getBBOAAlerts(),
        getCrossBorderSignals(),
        getContributions(),
        getGDDValidation(),
      ]);
      setStatus(s);
      setStations(st);
      setAlerts(enrichAlertsWithDistance(al, userLat, userLon));
      setSignals(sig);
      setContributions(con);
      setValidation(val);
      setLastFetched(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ForestWard data');
    } finally {
      setLoading(false);
    }
  }, [userLat, userLon]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(fetchAll, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const refresh = useCallback(() => {
    clearForestWardCache();
    fetchAll();
  }, [fetchAll]);

  return { status, stations, alerts, signals, contributions, validation, loading, error, lastFetched, refresh };
}
