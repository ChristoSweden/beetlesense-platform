import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

/* ── Types ── */

export interface SatelliteDate {
  date: string; // ISO date string
  source: 'sentinel-2' | 'landsat' | 'drone';
  cloudCoverPct: number;
  thumbnailUrl?: string;
}

export interface TimelineEvent {
  date: string;
  type: 'storm' | 'harvest' | 'drought' | 'pest-outbreak' | 'planting';
  label: string;
}

export interface BenchmarkMetric {
  key: 'ndvi' | 'pestRisk' | 'speciesDiversity';
  labelKey: string;
  yourValue: number;
  countyAverage: number;
  /** 0–100 percentile rank within the county */
  percentile: number;
  unit: string;
}

export interface RegionalBenchmark {
  county: string;
  metrics: BenchmarkMetric[];
}

export interface HistoricalYearSnapshot {
  year: number;
  date: string;
  thumbnailUrl: string;
  ndvi: number;
  canopyCoverPct: number;
  damageAreaHa: number;
}

export interface ComparisonData {
  availableDates: SatelliteDate[];
  timelineEvents: TimelineEvent[];
  benchmarks: RegionalBenchmark | null;
  historicalTrend: HistoricalYearSnapshot[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/* ── Demo data ── */

const DEMO_SATELLITE_DATES: SatelliteDate[] = [
  { date: '2026-03-10', source: 'sentinel-2', cloudCoverPct: 5 },
  { date: '2026-02-15', source: 'sentinel-2', cloudCoverPct: 12 },
  { date: '2026-01-20', source: 'sentinel-2', cloudCoverPct: 8 },
  { date: '2025-11-05', source: 'sentinel-2', cloudCoverPct: 18 },
  { date: '2025-09-22', source: 'sentinel-2', cloudCoverPct: 3 },
  { date: '2025-08-10', source: 'sentinel-2', cloudCoverPct: 7 },
  { date: '2025-06-18', source: 'sentinel-2', cloudCoverPct: 10 },
  { date: '2025-04-30', source: 'sentinel-2', cloudCoverPct: 22 },
  { date: '2025-03-15', source: 'sentinel-2', cloudCoverPct: 15 },
  { date: '2024-09-10', source: 'sentinel-2', cloudCoverPct: 6 },
  { date: '2024-06-20', source: 'sentinel-2', cloudCoverPct: 9 },
  { date: '2024-03-05', source: 'sentinel-2', cloudCoverPct: 20 },
  { date: '2023-08-25', source: 'sentinel-2', cloudCoverPct: 4 },
  { date: '2023-06-12', source: 'sentinel-2', cloudCoverPct: 11 },
  { date: '2022-07-15', source: 'sentinel-2', cloudCoverPct: 8 },
  { date: '2021-08-01', source: 'sentinel-2', cloudCoverPct: 14 },
];

const DEMO_TIMELINE_EVENTS: TimelineEvent[] = [
  { date: '2025-11-22', type: 'storm', label: 'Storm Babet' },
  { date: '2025-07-01', type: 'drought', label: 'July heatwave' },
  { date: '2024-10-15', type: 'harvest', label: 'Thinning operation' },
  { date: '2023-07-20', type: 'pest-outbreak', label: 'Bark beetle outbreak' },
  { date: '2022-04-10', type: 'planting', label: 'Replanting 2.5 ha' },
];

function demoBenchmarks(county: string): RegionalBenchmark {
  return {
    county,
    metrics: [
      {
        key: 'ndvi',
        labelKey: 'comparison.benchmark.ndvi',
        yourValue: 0.72,
        countyAverage: 0.65,
        percentile: 73,
        unit: '',
      },
      {
        key: 'pestRisk',
        labelKey: 'comparison.benchmark.pestRisk',
        yourValue: 0.28,
        countyAverage: 0.35,
        percentile: 68,
        unit: '',
      },
      {
        key: 'speciesDiversity',
        labelKey: 'comparison.benchmark.speciesDiversity',
        yourValue: 2.8,
        countyAverage: 2.3,
        percentile: 77,
        unit: '',
      },
    ],
  };
}

const DEMO_HISTORICAL_TREND: HistoricalYearSnapshot[] = [
  { year: 2022, date: '2022-07-15', thumbnailUrl: '', ndvi: 0.68, canopyCoverPct: 82, damageAreaHa: 0.3 },
  { year: 2023, date: '2023-08-25', thumbnailUrl: '', ndvi: 0.61, canopyCoverPct: 78, damageAreaHa: 2.1 },
  { year: 2024, date: '2024-06-20', thumbnailUrl: '', ndvi: 0.65, canopyCoverPct: 76, damageAreaHa: 1.4 },
  { year: 2025, date: '2025-08-10', thumbnailUrl: '', ndvi: 0.70, canopyCoverPct: 79, damageAreaHa: 0.8 },
  { year: 2026, date: '2026-03-10', thumbnailUrl: '', ndvi: 0.72, canopyCoverPct: 80, damageAreaHa: 0.5 },
];

/* ── Hook ── */

export function useComparisonData(parcelId: string | undefined): ComparisonData {
  const [availableDates, setAvailableDates] = useState<SatelliteDate[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [benchmarks, setBenchmarks] = useState<RegionalBenchmark | null>(null);
  const [historicalTrend, setHistoricalTrend] = useState<HistoricalYearSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!parcelId) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isDemo() || !isSupabaseConfigured) {
        // Simulate network delay for realism
        await new Promise((r) => setTimeout(r, 400));
        setAvailableDates(DEMO_SATELLITE_DATES);
        setTimelineEvents(DEMO_TIMELINE_EVENTS);
        setBenchmarks(demoBenchmarks('Kronoberg'));
        setHistoricalTrend(DEMO_HISTORICAL_TREND);
      } else {
        // Fetch satellite imagery dates for this parcel
        const { data: imageryRows, error: imgErr } = await supabase
          .from('satellite_imagery')
          .select('captured_at, source, cloud_cover_pct, thumbnail_url')
          .eq('parcel_id', parcelId)
          .order('captured_at', { ascending: false });

        if (imgErr) throw imgErr;

        setAvailableDates(
          (imageryRows ?? []).map((r) => ({
            date: r.captured_at,
            source: r.source ?? 'sentinel-2',
            cloudCoverPct: r.cloud_cover_pct ?? 0,
            thumbnailUrl: r.thumbnail_url ?? undefined,
          })),
        );

        // Fetch timeline events (alerts + activities for this parcel)
        const { data: eventRows, error: evErr } = await supabase
          .from('parcel_events')
          .select('occurred_at, event_type, label')
          .eq('parcel_id', parcelId)
          .order('occurred_at', { ascending: true });

        if (evErr) throw evErr;

        setTimelineEvents(
          (eventRows ?? []).map((r) => ({
            date: r.occurred_at,
            type: r.event_type ?? 'storm',
            label: r.label ?? '',
          })),
        );

        // Fetch regional benchmarks
        const { data: benchmarkRow, error: bmErr } = await supabase
          .rpc('get_parcel_benchmarks', { p_parcel_id: parcelId })
          .single();

        if (bmErr) throw bmErr;

        if (benchmarkRow) {
          const bm = benchmarkRow as Record<string, unknown>;
          setBenchmarks({
            county: bm.county as string,
            metrics: (bm.metrics as BenchmarkMetric[]) ?? [],
          });
        }

        // Fetch historical trend
        const { data: trendRows, error: trErr } = await supabase
          .from('parcel_annual_snapshots')
          .select('year, captured_at, thumbnail_url, ndvi, canopy_cover_pct, damage_area_ha')
          .eq('parcel_id', parcelId)
          .order('year', { ascending: true });

        if (trErr) throw trErr;

        setHistoricalTrend(
          (trendRows ?? []).map((r) => ({
            year: r.year,
            date: r.captured_at,
            thumbnailUrl: r.thumbnail_url ?? '',
            ndvi: r.ndvi ?? 0,
            canopyCoverPct: r.canopy_cover_pct ?? 0,
            damageAreaHa: r.damage_area_ha ?? 0,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  }, [parcelId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    availableDates,
    timelineEvents,
    benchmarks,
    historicalTrend,
    isLoading,
    error,
    refetch: fetchData,
  };
}
