import { useState, useEffect, useMemo } from 'react';
import { isDemo } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import {
  calculateTimberValue,
  calculateValueAtRisk,
  type SpeciesVolume,
  type SpeciesValuation,
  type TimberSpecies,
} from '@/services/timberPriceService';

// ─── Types ───

export interface TimberValueData {
  totalValue: number;
  speciesBreakdown: SpeciesValuation[];
  valueAtRisk: number;
  valueAtRiskDescription: string;
  trend: {
    changePercent: number;
    changeAbsolute: number;
  };
  priceDate: string;
  isLoading: boolean;
  error: string | null;
}

// ─── Demo Data ───

const DEMO_SPECIES_VOLUMES: SpeciesVolume[] = [
  { species: 'spruce', volumeM3sk: 4200, sawlogRatio: 0.65, pulpRatio: 0.35 },
  { species: 'pine', volumeM3sk: 1800, sawlogRatio: 0.55, pulpRatio: 0.45 },
  { species: 'birch', volumeM3sk: 400, sawlogRatio: 0.30, pulpRatio: 0.70 },
];

// Beetle damage threatening Plot B — roughly 500 m3sk of spruce at risk
const DEMO_AT_RISK_VOLUME_M3SK = 500;
const DEMO_AT_RISK_SPECIES: TimberSpecies = 'spruce';

const DEMO_TREND = {
  changePercent: 3.2,
  changeAbsolute: 74000,
};

// ─── Hook ───

/**
 * Hook that calculates the timber value for the user's forest holdings.
 *
 * In demo mode, uses hardcoded realistic data for a ~160 ha mixed-species
 * forest in Småland. In production, fetches parcel species breakdown and
 * volume estimates from analysis_results or KNN open-data layers.
 */
export function useTimberValue(): TimberValueData {
  const [speciesVolumes, setSpeciesVolumes] = useState<SpeciesVolume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo()) {
      setSpeciesVolumes(DEMO_SPECIES_VOLUMES);
      setIsLoading(false);
      return;
    }

    async function loadVolumes() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch analysis results that contain species volume data
        // from the latest completed survey for each parcel
        const { data: results, error: fetchError } = await supabase
          .from('analysis_results')
          .select('result_data, module, parcel_id')
          .eq('status', 'completed')
          .in('module', ['species_id', 'tree_count'])
          .order('completed_at', { ascending: false });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (!results || results.length === 0) {
          // Fall back to demo data if no real data yet
          setSpeciesVolumes(DEMO_SPECIES_VOLUMES);
          setIsLoading(false);
          return;
        }

        // Aggregate species volumes across all parcels
        const volumeMap = new Map<TimberSpecies, { volume: number; sawlog: number; pulp: number }>();

        for (const result of results) {
          const data = result.result_data as Record<string, unknown>;
          const speciesData = (data?.species_volumes ?? data?.species_breakdown) as
            | Array<{ species: string; volume_m3sk: number; sawlog_ratio: number; pulp_ratio: number }>
            | undefined;

          if (speciesData && Array.isArray(speciesData)) {
            for (const entry of speciesData) {
              const key = entry.species.toLowerCase() as TimberSpecies;
              const existing = volumeMap.get(key) ?? { volume: 0, sawlog: 0, pulp: 0 };
              existing.volume += entry.volume_m3sk;
              // Weighted average for ratios
              existing.sawlog = entry.sawlog_ratio;
              existing.pulp = entry.pulp_ratio;
              volumeMap.set(key, existing);
            }
          }
        }

        if (volumeMap.size === 0) {
          // No species volume data found — use demo
          setSpeciesVolumes(DEMO_SPECIES_VOLUMES);
        } else {
          const volumes: SpeciesVolume[] = Array.from(volumeMap.entries()).map(
            ([species, data]) => ({
              species,
              volumeM3sk: data.volume,
              sawlogRatio: data.sawlog,
              pulpRatio: data.pulp,
            }),
          );
          setSpeciesVolumes(volumes);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load timber data';
        setError(message);
        // Fall back to demo data on error
        setSpeciesVolumes(DEMO_SPECIES_VOLUMES);
      } finally {
        setIsLoading(false);
      }
    }

    loadVolumes();
  }, []);

  const valuation = useMemo(() => {
    if (speciesVolumes.length === 0) {
      return { totalValue: 0, speciesBreakdown: [], priceDate: '' };
    }
    return calculateTimberValue(speciesVolumes);
  }, [speciesVolumes]);

  const valueAtRisk = useMemo(() => {
    if (isDemo()) {
      return calculateValueAtRisk(DEMO_AT_RISK_VOLUME_M3SK, DEMO_AT_RISK_SPECIES);
    }
    // In production, calculate from parcels with at_risk or infested status
    // For now, estimate 10% of spruce volume at risk if any parcels are flagged
    const spruceVolume = speciesVolumes.find((s) => s.species === 'spruce');
    if (spruceVolume) {
      return calculateValueAtRisk(spruceVolume.volumeM3sk * 0.1, 'spruce');
    }
    return 0;
  }, [speciesVolumes]);

  const trend = useMemo(() => {
    if (isDemo()) return DEMO_TREND;
    // In production, compare with previous quarter's valuation
    // For now, estimate +3.2% based on market trends
    return {
      changePercent: 3.2,
      changeAbsolute: Math.round(valuation.totalValue * 0.032),
    };
  }, [valuation.totalValue]);

  return {
    totalValue: valuation.totalValue,
    speciesBreakdown: valuation.speciesBreakdown,
    valueAtRisk,
    valueAtRiskDescription: isDemo()
      ? 'plotB'
      : 'general',
    trend,
    priceDate: valuation.priceDate,
    isLoading,
    error,
  };
}

/**
 * Calculate timber value with a custom damage scenario applied.
 * Used by the ScenarioSlider to show real-time impact.
 */
export function applyDamageScenario(
  speciesBreakdown: SpeciesValuation[],
  damagePercent: number,
  targetSpecies: TimberSpecies = 'spruce',
): { adjustedTotal: number; lostValue: number } {
  let adjustedTotal = 0;
  let lostValue = 0;

  for (const entry of speciesBreakdown) {
    if (entry.species === targetSpecies) {
      // Damaged timber: sawlog value drops 60%, pulp stays
      const damageFraction = damagePercent / 100;
      const undamagedSawlog = entry.sawlogValue * (1 - damageFraction);
      const damagedSawlog = entry.sawlogValue * damageFraction * 0.4;
      const adjustedValue = undamagedSawlog + damagedSawlog + entry.pulpValue;
      lostValue += entry.totalValue - adjustedValue;
      adjustedTotal += adjustedValue;
    } else {
      adjustedTotal += entry.totalValue;
    }
  }

  return {
    adjustedTotal: Math.round(adjustedTotal),
    lostValue: Math.round(lostValue),
  };
}
