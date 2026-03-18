import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type HealthTrend = 'improving' | 'stable' | 'declining';

export interface SubScore {
  key: string;
  value: number;
  weight: number;
}

export interface HealthScoreBreakdownData {
  vegetationHealth: SubScore;
  pestRisk: SubScore;
  speciesDiversity: SubScore;
  growthRate: SubScore;
  soilConditions: SubScore;
}

export interface RegionalBenchmarkData {
  percentile: number;
  county: string;
  countyAverage: number;
  nationalAverage: number;
}

export interface ForestHealthScoreData {
  score: number;
  trend: HealthTrend;
  benchmark: RegionalBenchmarkData;
  breakdown: HealthScoreBreakdownData;
  summary: string;
  isLoading: boolean;
  isDemo: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Demo data ───

const DEMO_BREAKDOWN: HealthScoreBreakdownData = {
  vegetationHealth: { key: 'vegetationHealth', value: 78, weight: 0.30 },
  pestRisk:         { key: 'pestRisk',         value: 62, weight: 0.25 },
  speciesDiversity: { key: 'speciesDiversity', value: 71, weight: 0.15 },
  growthRate:       { key: 'growthRate',       value: 80, weight: 0.15 },
  soilConditions:   { key: 'soilConditions',   value: 73, weight: 0.15 },
};

const DEMO_BENCHMARK: RegionalBenchmarkData = {
  percentile: 68,
  county: 'Jönköpings län',
  countyAverage: 64,
  nationalAverage: 61,
};

const DEMO_SCORE = 72;
const DEMO_TREND: HealthTrend = 'improving';
const DEMO_SUMMARY_EN = 'Your spruce stands show early drought stress in the northeast sector. No active bark beetle infestation detected, but monitoring is recommended as temperatures rise.';
const DEMO_SUMMARY_SV = 'Dina granbestånd visar tidig torkstress i den nordöstra sektorn. Ingen aktiv barkborreangrepp upptäckt, men övervakning rekommenderas när temperaturerna stiger.';

function getDemoSummary(): string {
  const lang = typeof window !== 'undefined' ? localStorage.getItem('beetlesense-lang') : null;
  return lang === 'sv' ? DEMO_SUMMARY_SV : DEMO_SUMMARY_EN;
}

// ─── Score computation from real data ───

function computeScoreFromResults(
  analysisResults: Array<{ module: string; result_data: Record<string, unknown>; confidence_score: number | null }>,
  satelliteData: Array<{ index_data: Record<string, unknown>; acquisition_date: string }>,
): { score: number; breakdown: HealthScoreBreakdownData; trend: HealthTrend; summary: string } {
  // Extract NDVI from latest satellite observation
  let ndviValue = 0.65; // default
  if (satelliteData.length > 0) {
    const latest = satelliteData[0];
    const ndvi = latest.index_data?.ndvi_mean ?? latest.index_data?.ndvi ?? latest.index_data?.mean_ndvi;
    if (typeof ndvi === 'number') {
      ndviValue = ndvi;
    }
  }
  // Normalize NDVI (0-1) to 0-100 scale. Healthy forests: 0.6-0.9
  const vegetationScore = Math.round(Math.min(100, Math.max(0, ((ndviValue - 0.2) / 0.7) * 100)));

  // Pest risk from beetle detection modules
  let pestScore = 85; // default = low risk = high score
  const beetleResults = analysisResults.filter(r => r.module === 'bark_beetle' || r.module === 'beetle_detection');
  if (beetleResults.length > 0) {
    const latestBeetle = beetleResults[0];
    const severity = latestBeetle.result_data?.severity_level ?? latestBeetle.result_data?.risk_level;
    if (severity === 'high' || severity === 'severe') pestScore = 25;
    else if (severity === 'moderate' || severity === 'medium') pestScore = 55;
    else if (severity === 'low') pestScore = 80;
    else if (latestBeetle.confidence_score != null) {
      // Invert: high confidence of detection = low health score for pests
      pestScore = Math.round(100 - (latestBeetle.confidence_score * 100));
    }
  }

  // Species diversity from species_id or tree_health modules
  let diversityScore = 65;
  const speciesResults = analysisResults.filter(r => r.module === 'species_id' || r.module === 'tree_health');
  if (speciesResults.length > 0) {
    const speciesCount = speciesResults[0].result_data?.species_count;
    if (typeof speciesCount === 'number') {
      diversityScore = Math.min(100, Math.round(speciesCount * 20)); // 5 species = 100
    }
  }

  // Growth rate from vegetation index change
  let growthScore = 70;
  if (satelliteData.length >= 2) {
    const current = satelliteData[0].index_data?.ndvi_mean ?? satelliteData[0].index_data?.ndvi;
    const previous = satelliteData[1].index_data?.ndvi_mean ?? satelliteData[1].index_data?.ndvi;
    if (typeof current === 'number' && typeof previous === 'number') {
      const change = current - previous;
      growthScore = Math.round(Math.min(100, Math.max(0, 50 + change * 500)));
    }
  }

  // Soil conditions — derived from terrain analysis or default
  let soilScore = 68;
  const terrainResults = analysisResults.filter(r => r.module === 'terrain' || r.module === 'soil_analysis');
  if (terrainResults.length > 0) {
    const moisture = terrainResults[0].result_data?.soil_moisture_index;
    if (typeof moisture === 'number') {
      soilScore = Math.round(Math.min(100, Math.max(0, moisture * 100)));
    }
  }

  const breakdown: HealthScoreBreakdownData = {
    vegetationHealth: { key: 'vegetationHealth', value: vegetationScore, weight: 0.30 },
    pestRisk:         { key: 'pestRisk',         value: pestScore,       weight: 0.25 },
    speciesDiversity: { key: 'speciesDiversity', value: diversityScore,  weight: 0.15 },
    growthRate:       { key: 'growthRate',       value: growthScore,     weight: 0.15 },
    soilConditions:   { key: 'soilConditions',   value: soilScore,      weight: 0.15 },
  };

  const score = Math.round(
    breakdown.vegetationHealth.value * breakdown.vegetationHealth.weight +
    breakdown.pestRisk.value * breakdown.pestRisk.weight +
    breakdown.speciesDiversity.value * breakdown.speciesDiversity.weight +
    breakdown.growthRate.value * breakdown.growthRate.weight +
    breakdown.soilConditions.value * breakdown.soilConditions.weight,
  );

  // Determine trend from satellite history
  let trend: HealthTrend = 'stable';
  if (satelliteData.length >= 2) {
    const current = satelliteData[0].index_data?.ndvi_mean ?? satelliteData[0].index_data?.ndvi;
    const previous = satelliteData[1].index_data?.ndvi_mean ?? satelliteData[1].index_data?.ndvi;
    if (typeof current === 'number' && typeof previous === 'number') {
      const delta = current - previous;
      if (delta > 0.03) trend = 'improving';
      else if (delta < -0.03) trend = 'declining';
    }
  }

  // Generate a basic summary
  const lang = typeof window !== 'undefined' ? localStorage.getItem('beetlesense-lang') : null;
  let summary: string;
  if (lang === 'sv') {
    const parts: string[] = [];
    if (vegetationScore < 50) parts.push('Vegetationsindex visar stress i beståndet.');
    else parts.push('Vegetationen ser generellt frisk ut.');
    if (pestScore < 50) parts.push('Förhöjd risk för barkborreangrepp upptäckt.');
    else parts.push('Ingen aktiv barkborresignal.');
    summary = parts.join(' ');
  } else {
    const parts: string[] = [];
    if (vegetationScore < 50) parts.push('Vegetation index shows stress in the stand.');
    else parts.push('Vegetation looks generally healthy.');
    if (pestScore < 50) parts.push('Elevated bark beetle risk detected.');
    else parts.push('No active bark beetle signal.');
    summary = parts.join(' ');
  }

  return { score, breakdown, trend, summary };
}

// ─── Hook ───

export function useForestHealthScore(
  parcelIds?: string | string[],
): ForestHealthScoreData {
  const [score, setScore] = useState(0);
  const [trend, setTrend] = useState<HealthTrend>('stable');
  const [benchmark, setBenchmark] = useState<RegionalBenchmarkData>(DEMO_BENCHMARK);
  const [breakdown, setBreakdown] = useState<HealthScoreBreakdownData>(DEMO_BREAKDOWN);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ids = parcelIds
    ? Array.isArray(parcelIds) ? parcelIds : [parcelIds]
    : undefined;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Demo mode
    if (isDemo()) {
      // Simulate a brief loading period
      await new Promise(r => setTimeout(r, 400));
      setScore(DEMO_SCORE);
      setTrend(DEMO_TREND);
      setBenchmark(DEMO_BENCHMARK);
      setBreakdown(DEMO_BREAKDOWN);
      setSummary(getDemoSummary());
      setIsDemoMode(true);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch analysis results
      let analysisQuery = supabase
        .from('analysis_results')
        .select('module, result_data, confidence_score, parcel_id, completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (ids && ids.length > 0) {
        analysisQuery = analysisQuery.in('parcel_id', ids);
      }

      const { data: analysisData, error: analysisError } = await analysisQuery.limit(50);

      if (analysisError) throw new Error(analysisError.message);

      // Fetch satellite observations
      let satQuery = supabase
        .from('satellite_observations')
        .select('index_data, acquisition_date, parcel_id')
        .order('acquisition_date', { ascending: false });

      if (ids && ids.length > 0) {
        satQuery = satQuery.in('parcel_id', ids);
      }

      const { data: satData, error: satError } = await satQuery.limit(20);

      if (satError) throw new Error(satError.message);

      // If no data at all, fall back to demo
      if ((!analysisData || analysisData.length === 0) && (!satData || satData.length === 0)) {
        setScore(DEMO_SCORE);
        setTrend(DEMO_TREND);
        setBenchmark(DEMO_BENCHMARK);
        setBreakdown(DEMO_BREAKDOWN);
        setSummary(getDemoSummary());
        setIsDemoMode(true);
        setIsLoading(false);
        return;
      }

      const computed = computeScoreFromResults(
        (analysisData ?? []) as Array<{ module: string; result_data: Record<string, unknown>; confidence_score: number | null }>,
        (satData ?? []) as Array<{ index_data: Record<string, unknown>; acquisition_date: string }>,
      );

      setScore(computed.score);
      setTrend(computed.trend);
      setBreakdown(computed.breakdown);
      setSummary(computed.summary);

      // Fetch county info for benchmark from parcels
      let county = 'Jönköpings län';
      if (ids && ids.length > 0) {
        const { data: parcelData } = await supabase
          .from('parcels')
          .select('county')
          .in('id', ids)
          .limit(1);
        if (parcelData?.[0]?.county) {
          county = parcelData[0].county;
        }
      }

      // Regional benchmark — approximation based on score distribution
      // In production this would come from a materialized view or analytics table
      const percentile = Math.min(99, Math.max(1, Math.round(computed.score * 1.1 - 5)));
      setBenchmark({
        percentile,
        county,
        countyAverage: Math.round(computed.score * 0.88),
        nationalAverage: Math.round(computed.score * 0.84),
      });

      setIsDemoMode(false);
      setIsLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load health score';
      setError(message);
      // Fall back to demo data on error
      setScore(DEMO_SCORE);
      setTrend(DEMO_TREND);
      setBenchmark(DEMO_BENCHMARK);
      setBreakdown(DEMO_BREAKDOWN);
      setSummary(getDemoSummary());
      setIsDemoMode(true);
      setIsLoading(false);
    }

  }, [ids?.join(',')]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    score,
    trend,
    benchmark,
    breakdown,
    summary,
    isLoading,
    isDemo: isDemoMode,
    error,
    refetch: fetchData,
  };
}
