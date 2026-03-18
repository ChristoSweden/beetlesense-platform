import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type WarningSeverity = 'green' | 'yellow' | 'orange' | 'red';

export interface NDVIDataPoint {
  date: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  isAnomaly: boolean;
}

export interface EarlyWarning {
  id: string;
  parcelId: string;
  parcelName: string;
  standNumber: string;
  severity: WarningSeverity;
  areaHectares: number;
  ndviDeviation: number; // percentage deviation from 3-year rolling average
  currentNdvi: number;
  baselineNdvi: number;
  estimatedSpreadRate: number; // hectares per week
  detectionDate: string;
  firstAnomalyDate: string;
  daysSinceFirstAnomaly: number;
  recommendedAction: string;
  center: [number, number]; // [lng, lat] WGS84
  ndviTimeSeries: NDVIDataPoint[];
}

export interface UseEarlyWarningReturn {
  warnings: EarlyWarning[];
  loading: boolean;
  error: string | null;
  severityCounts: Record<WarningSeverity, number>;
  refresh: () => Promise<void>;
}

// ─── Severity Classification ───

function classifySeverity(ndviDeviation: number, currentNdvi: number): WarningSeverity {
  if (currentNdvi <= 0.4 || ndviDeviation >= 40) return 'red';
  if (currentNdvi <= 0.55 || ndviDeviation >= 25) return 'orange';
  if (currentNdvi <= 0.65 || ndviDeviation >= 12) return 'yellow';
  return 'green';
}

function getRecommendedAction(severity: WarningSeverity): string {
  switch (severity) {
    case 'red':
      return 'immediateAction';
    case 'orange':
      return 'orderDroneSurvey';
    case 'yellow':
      return 'monitorClosely';
    case 'green':
      return 'noActionNeeded';
  }
}

// ─── Generate Realistic NDVI Time Series ───

function generateNDVITimeSeries(
  baselineNdvi: number,
  currentNdvi: number,
  severity: WarningSeverity,
): NDVIDataPoint[] {
  const points: NDVIDataPoint[] = [];
  const startDate = new Date('2026-01-12');
  const numPoints = 12; // ~weekly satellite passes over 3 months

  for (let i = 0; i < numPoints; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i * 7);

    // Simulate gradual decline for affected zones
    let progress: number;
    if (severity === 'green') {
      progress = 0;
    } else {
      // Anomaly starts becoming visible partway through the time series
      const anomalyStart = severity === 'red' ? 4 : severity === 'orange' ? 6 : 8;
      progress = i <= anomalyStart ? 0 : (i - anomalyStart) / (numPoints - anomalyStart);
    }

    const value = Number(
      (baselineNdvi - (baselineNdvi - currentNdvi) * progress + (Math.random() - 0.5) * 0.03).toFixed(3),
    );

    const prevValue = points.length > 0 ? points[points.length - 1].value : baselineNdvi;
    const diff = value - prevValue;
    const trend: 'up' | 'down' | 'stable' = diff > 0.02 ? 'up' : diff < -0.02 ? 'down' : 'stable';

    const isAnomaly = value < baselineNdvi * 0.88;

    points.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0.15, Math.min(0.9, value)),
      trend,
      isAnomaly,
    });
  }

  return points;
}

// ─── Demo Data — Kronoberg/Småland Region ───

const DEMO_WARNINGS: EarlyWarning[] = [
  {
    id: 'ew-1',
    parcelId: 'p4',
    parcelName: 'Granudden',
    standNumber: 'Avd. 3',
    severity: 'red',
    areaHectares: 4.2,
    ndviDeviation: 47,
    currentNdvi: 0.31,
    baselineNdvi: 0.78,
    estimatedSpreadRate: 0.8,
    detectionDate: '2026-03-08',
    firstAnomalyDate: '2026-02-10',
    daysSinceFirstAnomaly: 34,
    recommendedAction: 'immediateAction',
    center: [14.105, 57.218],
    ndviTimeSeries: [],
  },
  {
    id: 'ew-2',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    standNumber: 'Avd. 7',
    severity: 'orange',
    areaHectares: 6.8,
    ndviDeviation: 28,
    currentNdvi: 0.52,
    baselineNdvi: 0.76,
    estimatedSpreadRate: 0.4,
    detectionDate: '2026-03-12',
    firstAnomalyDate: '2026-02-24',
    daysSinceFirstAnomaly: 20,
    recommendedAction: 'orderDroneSurvey',
    center: [14.045, 57.195],
    ndviTimeSeries: [],
  },
  {
    id: 'ew-3',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    standNumber: 'Avd. 2',
    severity: 'yellow',
    areaHectares: 3.1,
    ndviDeviation: 16,
    currentNdvi: 0.62,
    baselineNdvi: 0.77,
    estimatedSpreadRate: 0.1,
    detectionDate: '2026-03-14',
    firstAnomalyDate: '2026-03-07',
    daysSinceFirstAnomaly: 9,
    recommendedAction: 'monitorClosely',
    center: [14.038, 57.192],
    ndviTimeSeries: [],
  },
  {
    id: 'ew-4',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    standNumber: 'Avd. 5',
    severity: 'yellow',
    areaHectares: 2.5,
    ndviDeviation: 14,
    currentNdvi: 0.64,
    baselineNdvi: 0.79,
    estimatedSpreadRate: 0.05,
    detectionDate: '2026-03-15',
    firstAnomalyDate: '2026-03-10',
    daysSinceFirstAnomaly: 6,
    recommendedAction: 'monitorClosely',
    center: [14.155, 57.775],
    ndviTimeSeries: [],
  },
];

// Populate time series for demo data
DEMO_WARNINGS.forEach((w) => {
  w.ndviTimeSeries = generateNDVITimeSeries(w.baselineNdvi, w.currentNdvi, w.severity);
});

// ─── Hook ───

export function useEarlyWarning(): UseEarlyWarningReturn {
  const { profile } = useAuthStore();
  const [warnings, setWarnings] = useState<EarlyWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWarnings = useCallback(async () => {
    if (!profile) return;

    // Demo mode
    if (isDemo() || !isSupabaseConfigured) {
      // Sort by urgency: red > orange > yellow > green
      const severityOrder: Record<WarningSeverity, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
      const sorted = [...DEMO_WARNINGS].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
      );
      setWarnings(sorted);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('analysis_results')
        .select('*, parcels(name, center)')
        .eq('analysis_type', 'ndvi_anomaly')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        const mapped: EarlyWarning[] = data.map((row: Record<string, unknown>) => {
          const meta = (row.metadata ?? {}) as Record<string, unknown>;
          const currentNdvi = (meta.current_ndvi as number) ?? 0.5;
          const baselineNdvi = (meta.baseline_ndvi as number) ?? 0.78;
          const deviation = Math.round(((baselineNdvi - currentNdvi) / baselineNdvi) * 100);
          const severity = classifySeverity(deviation, currentNdvi);

          return {
            id: row.id as string,
            parcelId: row.parcel_id as string,
            parcelName: ((row.parcels as Record<string, unknown>)?.name as string) ?? 'Unknown',
            standNumber: (meta.stand_number as string) ?? 'Avd. ?',
            severity,
            areaHectares: (meta.area_hectares as number) ?? 0,
            ndviDeviation: deviation,
            currentNdvi,
            baselineNdvi,
            estimatedSpreadRate: (meta.spread_rate as number) ?? 0,
            detectionDate: row.created_at as string,
            firstAnomalyDate: (meta.first_anomaly_date as string) ?? (row.created_at as string),
            daysSinceFirstAnomaly: Math.floor(
              (Date.now() - new Date((meta.first_anomaly_date as string) ?? (row.created_at as string)).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
            recommendedAction: getRecommendedAction(severity),
            center: ((row.parcels as Record<string, unknown>)?.center as [number, number]) ?? [14.0, 57.2],
            ndviTimeSeries: generateNDVITimeSeries(baselineNdvi, currentNdvi, severity),
          };
        });

        const severityOrder: Record<WarningSeverity, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
        mapped.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
        setWarnings(mapped);
      } else {
        // No real data — fall back to demo
        const severityOrder: Record<WarningSeverity, number> = { red: 0, orange: 1, yellow: 2, green: 3 };
        const sorted = [...DEMO_WARNINGS].sort(
          (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
        );
        setWarnings(sorted);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load early warnings';
      console.error('Failed to fetch early warnings:', err);
      setError(message);
      // Fall back to demo data
      setWarnings([...DEMO_WARNINGS]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchWarnings();
  }, [fetchWarnings]);

  const severityCounts: Record<WarningSeverity, number> = { green: 0, yellow: 0, orange: 0, red: 0 };
  warnings.forEach((w) => {
    severityCounts[w.severity]++;
  });

  return {
    warnings,
    loading,
    error,
    severityCounts,
    refresh: fetchWarnings,
  };
}
