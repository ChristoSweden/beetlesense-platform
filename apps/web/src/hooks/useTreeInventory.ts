/**
 * useTreeInventory — Fetches per-tree inventory records from multi-sensor fusion.
 *
 * Retrieves tree_inventory records for a given parcelId or surveyId, with
 * support for filtering by species, stress_flag, and health_score range.
 * Computes aggregate statistics (count, average health, species breakdown,
 * volume totals). Results are sorted by health_score ascending to surface
 * stressed trees first.
 *
 * In demo mode, generates realistic tree data for Swedish forests with a
 * typical Gran/Tall/Björk species mix.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type StressType = 'beetle' | 'drought' | 'disease' | 'mechanical';

export interface TreeRecord {
  id: string;
  survey_id: string;
  parcel_id: string;
  tree_number: number;
  /** Height in meters (LiDAR-derived) */
  height_m: number | null;
  /** Crown diameter in meters */
  crown_diameter_m: number | null;
  /** Crown area in m² */
  crown_area_m2: number | null;
  /** Estimated diameter at breast height in cm */
  dbh_cm: number | null;
  /** Estimated stem volume in m³ */
  volume_m3: number | null;
  /** Normalized Difference Vegetation Index */
  ndvi: number | null;
  /** Normalized Difference Red Edge */
  ndre: number | null;
  /** Chlorophyll content (µg/cm²) */
  chlorophyll: number | null;
  /** Crown surface temperature in °C */
  crown_temp_c: number | null;
  /** Temperature anomaly z-score relative to stand mean */
  temp_anomaly: number | null;
  /** AI-predicted species */
  species_prediction: string | null;
  /** Species prediction confidence (0–1) */
  species_confidence: number | null;
  /** Composite health score (0–100) */
  health_score: number | null;
  /** Whether the tree is flagged as stressed */
  stress_flag: boolean;
  /** Type of stress if flagged */
  stress_type: StressType | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SpeciesBreakdown {
  species: string;
  count: number;
  percentage: number;
  avgHealth: number;
  avgHeight: number | null;
  totalVolume: number;
}

export interface TreeInventoryStats {
  /** Total number of trees */
  count: number;
  /** Average health score (0–100) */
  avgHealth: number;
  /** Number of trees flagged as stressed */
  stressedCount: number;
  /** Percentage of trees under stress */
  stressedPct: number;
  /** Species distribution with per-species stats */
  speciesBreakdown: SpeciesBreakdown[];
  /** Average tree height in meters */
  avgHeight: number | null;
  /** Total estimated stem volume in m³ */
  totalVolume: number;
  /** Average DBH in cm */
  avgDbh: number | null;
  /** Stress type distribution */
  stressTypes: Record<string, number>;
}

export interface TreeInventoryFilters {
  /** Filter by species name */
  species?: string;
  /** Filter by stress flag */
  stressOnly?: boolean;
  /** Minimum health score (inclusive) */
  healthMin?: number;
  /** Maximum health score (inclusive) */
  healthMax?: number;
}

export interface TreeInventoryData {
  /** Filtered tree records, sorted by health_score ascending */
  trees: TreeRecord[];
  /** Aggregate statistics computed from filtered trees */
  stats: TreeInventoryStats;
  /** Whether data is loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether using demo data */
  isDemo: boolean;
  /** Force refresh data from backend */
  refresh: () => Promise<void>;
}

// ─── Demo data generation ───

const DEMO_SURVEY_ID = 's1';
const DEMO_PARCEL_ID = 'p1';
const DEMO_CREATED = '2026-03-06T14:30:00Z';

/**
 * Seeded pseudo-random number generator for deterministic demo data.
 * Uses a simple linear congruential generator.
 */
function createRng(seed: number) {
  let state = seed;
  return (): number => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

function generateDemoTrees(parcelId: string, surveyId: string): TreeRecord[] {
  const rng = createRng(42);
  const trees: TreeRecord[] = [];
  const treeCount = 3240;

  // Swedish boreal forest species distribution: 65% Gran, 25% Tall, 10% Björk
  const speciesConfig: Array<{
    name: string;
    weight: number;
    heightRange: [number, number];
    dbhRange: [number, number];
    healthBase: number;
    ndviRange: [number, number];
  }> = [
    { name: 'Gran',  weight: 0.65, heightRange: [12, 30], dbhRange: [15, 45], healthBase: 72, ndviRange: [0.55, 0.88] },
    { name: 'Tall',  weight: 0.25, heightRange: [15, 28], dbhRange: [18, 40], healthBase: 78, ndviRange: [0.58, 0.85] },
    { name: 'Björk', weight: 0.10, heightRange: [8, 22],  dbhRange: [10, 30], healthBase: 80, ndviRange: [0.60, 0.90] },
  ];

  for (let i = 1; i <= treeCount; i++) {
    // Pick species based on weighted distribution
    const r = rng();
    let cumulative = 0;
    let species = speciesConfig[0];
    for (const sp of speciesConfig) {
      cumulative += sp.weight;
      if (r < cumulative) {
        species = sp;
        break;
      }
    }

    const height = species.heightRange[0] + rng() * (species.heightRange[1] - species.heightRange[0]);
    const dbh = species.dbhRange[0] + rng() * (species.dbhRange[1] - species.dbhRange[0]);
    const crownDiameter = dbh * 0.12 + rng() * 2; // rough crown-DBH relationship
    const crownArea = Math.PI * (crownDiameter / 2) ** 2;

    // Volume estimation using Swedish SLU allometric equations (simplified)
    // V = 0.0000567 * DBH^2.034 * H^0.936 (approximate for gran/tall)
    const volume = 0.0000567 * Math.pow(dbh, 2.034) * Math.pow(height, 0.936);

    const ndvi = species.ndviRange[0] + rng() * (species.ndviRange[1] - species.ndviRange[0]);
    const ndre = ndvi * 0.55 + rng() * 0.1;
    const chlorophyll = 15 + rng() * 35;

    // Temperature: stressed trees run hotter
    const baseTempC = 12 + rng() * 5;

    // Health score: normally distributed around species base, some outliers
    let healthScore = species.healthBase + (rng() - 0.5) * 30;
    healthScore = Math.max(5, Math.min(100, healthScore));

    // Stress determination
    let stressFlag = false;
    let stressType: StressType | null = null;
    let tempAnomaly = (rng() - 0.5) * 1.5; // normally near 0

    // About 15% of Gran are beetle-stressed, 5% of others
    const stressThreshold = species.name === 'Gran' ? 0.85 : 0.95;
    if (rng() > stressThreshold) {
      stressFlag = true;
      healthScore = Math.max(5, Math.min(45, 20 + rng() * 25));

      const stressRoll = rng();
      if (species.name === 'Gran' && stressRoll < 0.7) {
        stressType = 'beetle';
      } else if (stressRoll < 0.5) {
        stressType = 'drought';
      } else if (stressRoll < 0.8) {
        stressType = 'disease';
      } else {
        stressType = 'mechanical';
      }

      tempAnomaly = 1.5 + rng() * 2.5; // stressed trees are warmer
    }

    trees.push({
      id: `tree-${i}`,
      survey_id: surveyId || DEMO_SURVEY_ID,
      parcel_id: parcelId || DEMO_PARCEL_ID,
      tree_number: i,
      height_m: Math.round(height * 10) / 10,
      crown_diameter_m: Math.round(crownDiameter * 10) / 10,
      crown_area_m2: Math.round(crownArea * 10) / 10,
      dbh_cm: Math.round(dbh * 10) / 10,
      volume_m3: Math.round(volume * 1000) / 1000,
      ndvi: Math.round(ndvi * 1000) / 1000,
      ndre: Math.round(ndre * 1000) / 1000,
      chlorophyll: Math.round(chlorophyll * 10) / 10,
      crown_temp_c: Math.round((baseTempC + tempAnomaly * 1.2) * 10) / 10,
      temp_anomaly: Math.round(tempAnomaly * 100) / 100,
      species_prediction: species.name,
      species_confidence: Math.round((0.85 + rng() * 0.14) * 100) / 100,
      health_score: Math.round(healthScore * 10) / 10,
      stress_flag: stressFlag,
      stress_type: stressType,
      metadata: {},
      created_at: DEMO_CREATED,
    });
  }

  // Sort by health_score ascending — stressed trees first
  trees.sort((a, b) => (a.health_score ?? 100) - (b.health_score ?? 100));

  return trees;
}

// Cache demo trees so they are stable across re-renders
let _cachedDemoTrees: TreeRecord[] | null = null;

function getDemoTrees(parcelId: string, surveyId: string): TreeRecord[] {
  if (!_cachedDemoTrees) {
    _cachedDemoTrees = generateDemoTrees(parcelId, surveyId);
  }
  return _cachedDemoTrees;
}

// ─── Statistics computation ───

function computeStats(trees: TreeRecord[]): TreeInventoryStats {
  if (trees.length === 0) {
    return {
      count: 0,
      avgHealth: 0,
      stressedCount: 0,
      stressedPct: 0,
      speciesBreakdown: [],
      avgHeight: null,
      totalVolume: 0,
      avgDbh: null,
      stressTypes: {},
    };
  }

  const count = trees.length;

  // Average health
  const healthValues = trees.filter(t => t.health_score != null).map(t => t.health_score!);
  const avgHealth = healthValues.length > 0
    ? Math.round((healthValues.reduce((s, v) => s + v, 0) / healthValues.length) * 10) / 10
    : 0;

  // Stressed count
  const stressedCount = trees.filter(t => t.stress_flag).length;
  const stressedPct = Math.round((stressedCount / count) * 1000) / 10;

  // Stress type distribution
  const stressTypes: Record<string, number> = {};
  for (const tree of trees) {
    if (tree.stress_flag && tree.stress_type) {
      stressTypes[tree.stress_type] = (stressTypes[tree.stress_type] ?? 0) + 1;
    }
  }

  // Average height
  const heightValues = trees.filter(t => t.height_m != null).map(t => t.height_m!);
  const avgHeight = heightValues.length > 0
    ? Math.round((heightValues.reduce((s, v) => s + v, 0) / heightValues.length) * 10) / 10
    : null;

  // Total volume
  const totalVolume = Math.round(
    trees.filter(t => t.volume_m3 != null).reduce((s, t) => s + t.volume_m3!, 0) * 10,
  ) / 10;

  // Average DBH
  const dbhValues = trees.filter(t => t.dbh_cm != null).map(t => t.dbh_cm!);
  const avgDbh = dbhValues.length > 0
    ? Math.round((dbhValues.reduce((s, v) => s + v, 0) / dbhValues.length) * 10) / 10
    : null;

  // Species breakdown
  const speciesMap = new Map<string, TreeRecord[]>();
  for (const tree of trees) {
    const species = tree.species_prediction ?? 'Okänd';
    if (!speciesMap.has(species)) speciesMap.set(species, []);
    speciesMap.get(species)!.push(tree);
  }

  const speciesBreakdown: SpeciesBreakdown[] = Array.from(speciesMap.entries())
    .map(([species, speciesTrees]) => {
      const spHealthValues = speciesTrees.filter(t => t.health_score != null).map(t => t.health_score!);
      const spHeightValues = speciesTrees.filter(t => t.height_m != null).map(t => t.height_m!);
      const spVolume = speciesTrees.filter(t => t.volume_m3 != null).reduce((s, t) => s + t.volume_m3!, 0);

      return {
        species,
        count: speciesTrees.length,
        percentage: Math.round((speciesTrees.length / count) * 1000) / 10,
        avgHealth: spHealthValues.length > 0
          ? Math.round((spHealthValues.reduce((s, v) => s + v, 0) / spHealthValues.length) * 10) / 10
          : 0,
        avgHeight: spHeightValues.length > 0
          ? Math.round((spHeightValues.reduce((s, v) => s + v, 0) / spHeightValues.length) * 10) / 10
          : null,
        totalVolume: Math.round(spVolume * 10) / 10,
      };
    })
    .sort((a, b) => b.count - a.count); // sort by count descending

  return {
    count,
    avgHealth,
    stressedCount,
    stressedPct,
    speciesBreakdown,
    avgHeight,
    totalVolume,
    avgDbh,
    stressTypes,
  };
}

// ─── Hook ───

export function useTreeInventory(
  options: {
    parcelId?: string;
    surveyId?: string;
    filters?: TreeInventoryFilters;
  },
): TreeInventoryData {
  const { parcelId, surveyId, filters } = options;

  const [allTrees, setAllTrees] = useState<TreeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Demo mode
    if (isDemo()) {
      await new Promise(r => setTimeout(r, 400));
      const demoTrees = getDemoTrees(parcelId ?? DEMO_PARCEL_ID, surveyId ?? DEMO_SURVEY_ID);
      setAllTrees(demoTrees);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('tree_inventory')
        .select('*')
        .order('health_score', { ascending: true }); // stressed trees first

      if (parcelId) query = query.eq('parcel_id', parcelId);
      if (surveyId) query = query.eq('survey_id', surveyId);

      const { data, error: dbError } = await query;

      if (dbError) throw new Error(dbError.message);

      // If no data, fall back to demo
      if (!data || data.length === 0) {
        const demoTrees = getDemoTrees(parcelId ?? DEMO_PARCEL_ID, surveyId ?? DEMO_SURVEY_ID);
        setAllTrees(demoTrees);
        setIsDemoMode(true);
        setLoading(false);
        return;
      }

      setAllTrees(data as TreeRecord[]);
      setIsDemoMode(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tree inventory';
      console.warn('useTreeInventory: fetch failed, using demo data', err);
      setError(message);
      const demoTrees = getDemoTrees(parcelId ?? DEMO_PARCEL_ID, surveyId ?? DEMO_SURVEY_ID);
      setAllTrees(demoTrees);
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, [parcelId, surveyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Apply client-side filters
  const filteredTrees = useMemo(() => {
    let result = allTrees;

    if (filters?.species) {
      const speciesLower = filters.species.toLowerCase();
      result = result.filter(
        t => t.species_prediction?.toLowerCase() === speciesLower,
      );
    }

    if (filters?.stressOnly) {
      result = result.filter(t => t.stress_flag);
    }

    if (filters?.healthMin != null) {
      result = result.filter(t => t.health_score != null && t.health_score >= filters.healthMin!);
    }

    if (filters?.healthMax != null) {
      result = result.filter(t => t.health_score != null && t.health_score <= filters.healthMax!);
    }

    return result;
  }, [allTrees, filters?.species, filters?.stressOnly, filters?.healthMin, filters?.healthMax]);

  // Compute stats from filtered trees
  const stats = useMemo(() => computeStats(filteredTrees), [filteredTrees]);

  return {
    trees: filteredTrees,
    stats,
    loading,
    error,
    isDemo: isDemoMode,
    refresh,
  };
}
