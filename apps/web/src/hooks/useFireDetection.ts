import { useState, useEffect, useCallback } from 'react';
import { getActiveFiresNearby, getFiresInSweden, getFireRiskIndex, type FireDetection, type FireRisk, type FireAlert } from '../services/fireService';

export interface FireDetectionState {
  nearbyFires: FireDetection[];
  swedenFires: FireDetection[];
  alerts: FireAlert[];
  riskLevel: FireRisk | null;
  lastChecked: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const ALERT_THRESHOLDS = [
  { radiusKm: 5, severity: 'critical' as const },
  { radiusKm: 10, severity: 'warning' as const },
  { radiusKm: 25, severity: 'watch' as const },
];

export function useFireDetection(lat: number = 57.15, lon: number = 14.95): FireDetectionState {
  const [nearbyFires, setNearbyFires] = useState<FireDetection[]>([]);
  const [swedenFires, setSwedenFires] = useState<FireDetection[]>([]);
  const [alerts, setAlerts] = useState<FireAlert[]>([]);
  const [riskLevel, setRiskLevel] = useState<FireRisk | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nearby, sweden, risk] = await Promise.all([
        getActiveFiresNearby(lat, lon, 50),
        getFiresInSweden(7),
        getFireRiskIndex(lat, lon),
      ]);

      setNearbyFires(nearby);
      setSwedenFires(sweden);
      setRiskLevel(risk);
      setLastChecked(new Date().toISOString());

      // Generate alerts based on proximity
      const newAlerts: FireAlert[] = [];
      for (const fire of nearby) {
        const dist = fire.distanceKm || 999;
        for (const threshold of ALERT_THRESHOLDS) {
          if (dist <= threshold.radiusKm) {
            newAlerts.push({
              id: `${fire.latitude}-${fire.longitude}-${fire.acq_time}`,
              fire,
              distanceKm: dist,
              bearing: fire.bearing || 'N',
              severity: threshold.severity,
              message: threshold.severity === 'critical'
                ? `Brand upptäckt ${dist.toFixed(1)} km bort — omedelbar uppmärksamhet krävs`
                : threshold.severity === 'warning'
                ? `Brand ${dist.toFixed(1)} km ${fire.bearing} — bevaka utvecklingen`
                : `Brand registrerad ${dist.toFixed(1)} km bort — låg risk`,
              timestamp: `${fire.acq_date}T${fire.acq_time.slice(0, 2)}:${fire.acq_time.slice(2)}:00Z`,
            });
            break; // Only use closest threshold
          }
        }
      }
      setAlerts(newAlerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fire data');
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 3 hours
  useEffect(() => {
    const interval = setInterval(fetchAll, 3 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { nearbyFires, swedenFires, alerts, riskLevel, lastChecked, loading, error, refresh: fetchAll };
}
