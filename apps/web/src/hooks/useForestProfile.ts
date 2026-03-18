import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// ─── Types ───

export interface SpeciesInfo {
  id: string;
  name: string;
  latinName: string;
  percentage: number;
  ageClass: 'young' | 'middle' | 'mature' | 'old';
  ageYears: number;
  icon: 'spruce' | 'pine' | 'birch' | 'oak' | 'alder' | 'beech' | 'other';
}

export interface SoilProfile {
  type: string;
  moisture: 'dry' | 'mesic' | 'moist' | 'wet';
  rootRotRisk: 'low' | 'moderate' | 'high';
}

export interface TerrainProfile {
  elevationMin: number;
  elevationMax: number;
  elevationAvg: number;
  slopeAvg: number;
  drainage: 'good' | 'moderate' | 'poor';
  machineAccessibility: 'good' | 'limited' | 'difficult';
}

export interface ClimateProfile {
  zone: 'southern' | 'central' | 'northern';
  growingSeasonStart: string;
  growingSeasonEnd: string;
  avgTempSummer: number;
  avgTempWinter: number;
  annualPrecipitation: number;
}

export interface SpecialFeature {
  id: string;
  type: 'old_growth' | 'wetland' | 'biodiversity' | 'water_proximity' | 'edge_habitat' | 'deadwood';
  area?: number;
}

export interface RegionalComparison {
  metric: string;
  yourValue: number;
  regionalAvg: number;
  unit: string;
  isPositive: boolean;
}

export interface ForestProfileData {
  totalArea: number;
  parcelCount: number;
  county: string;
  municipality: string;
  species: SpeciesInfo[];
  soil: SoilProfile;
  terrain: TerrainProfile;
  climate: ClimateProfile;
  specialFeatures: SpecialFeature[];
  comparisons: RegionalComparison[];
  dominantSpecies: string;
  forestType: 'conifer' | 'deciduous' | 'mixed';
}

export interface ForestProfileResult {
  profile: ForestProfileData | null;
  isLoading: boolean;
  isDemo: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Species mapping ───

const SPECIES_ICON_MAP: Record<string, SpeciesInfo['icon']> = {
  spruce: 'spruce',
  gran: 'spruce',
  pine: 'pine',
  tall: 'pine',
  birch: 'birch',
  björk: 'birch',
  oak: 'oak',
  ek: 'oak',
  alder: 'alder',
  al: 'alder',
  beech: 'beech',
  bok: 'beech',
};

const SPECIES_LATIN: Record<string, string> = {
  spruce: 'Picea abies',
  pine: 'Pinus sylvestris',
  birch: 'Betula pendula',
  oak: 'Quercus robur',
  alder: 'Alnus glutinosa',
  beech: 'Fagus sylvatica',
};

function getSpeciesIcon(name: string): SpeciesInfo['icon'] {
  return SPECIES_ICON_MAP[name.toLowerCase()] ?? 'other';
}

function getLatinName(name: string): string {
  return SPECIES_LATIN[name.toLowerCase()] ?? '';
}

function getRandomAgeClass(species: string): { ageClass: SpeciesInfo['ageClass']; ageYears: number } {
  // Deterministic-ish per species for demo consistency
  const seed = species.charCodeAt(0);
  if (species.toLowerCase() === 'oak') return { ageClass: 'mature', ageYears: 85 };
  if (species.toLowerCase() === 'birch') return { ageClass: 'young', ageYears: 25 };
  if (species.toLowerCase() === 'alder') return { ageClass: 'young', ageYears: 20 };
  if (seed % 3 === 0) return { ageClass: 'middle', ageYears: 45 };
  if (seed % 3 === 1) return { ageClass: 'mature', ageYears: 70 };
  return { ageClass: 'young', ageYears: 30 };
}

// ─── Soil helpers ───

function soilMoisture(soilType: string): SoilProfile['moisture'] {
  const lower = soilType.toLowerCase();
  if (lower.includes('peat') || lower.includes('torv')) return 'wet';
  if (lower.includes('clay') || lower.includes('lera')) return 'moist';
  if (lower.includes('sandy') || lower.includes('sand')) return 'dry';
  return 'mesic';
}

function soilRootRotRisk(soilType: string): SoilProfile['rootRotRisk'] {
  const lower = soilType.toLowerCase();
  if (lower.includes('clay') || lower.includes('lera') || lower.includes('peat') || lower.includes('torv')) return 'high';
  if (lower.includes('moraine') || lower.includes('morän')) return 'moderate';
  return 'low';
}

// ─── Terrain helpers ───

function drainageFromSoil(soilType: string): TerrainProfile['drainage'] {
  const lower = soilType.toLowerCase();
  if (lower.includes('sandy') || lower.includes('sand')) return 'good';
  if (lower.includes('peat') || lower.includes('torv')) return 'poor';
  return 'good';
}

function machineAccess(slopeAvg: number, drainage: TerrainProfile['drainage']): TerrainProfile['machineAccessibility'] {
  if (slopeAvg > 20 || drainage === 'poor') return 'difficult';
  if (slopeAvg > 10 || drainage === 'moderate') return 'limited';
  return 'good';
}

// ─── Climate helpers ───

function climateFromCounty(county: string | null): ClimateProfile {
  const lower = (county ?? '').toLowerCase();
  if (lower.includes('norrbotten') || lower.includes('västerbotten') || lower.includes('jämtland')) {
    return {
      zone: 'northern',
      growingSeasonStart: 'May',
      growingSeasonEnd: 'September',
      avgTempSummer: 14,
      avgTempWinter: -12,
      annualPrecipitation: 550,
    };
  }
  if (lower.includes('dalarna') || lower.includes('gävleborg') || lower.includes('västernorrland') || lower.includes('värmland')) {
    return {
      zone: 'central',
      growingSeasonStart: 'April',
      growingSeasonEnd: 'October',
      avgTempSummer: 16,
      avgTempWinter: -6,
      annualPrecipitation: 650,
    };
  }
  return {
    zone: 'southern',
    growingSeasonStart: 'April',
    growingSeasonEnd: 'October',
    avgTempSummer: 18,
    avgTempWinter: -2,
    annualPrecipitation: 750,
  };
}

// ─── Detect special features ───

function detectSpecialFeatures(parcels: DemoParcel[]): SpecialFeature[] {
  const features: SpecialFeature[] = [];

  // Check for old-growth (oak-heavy)
  const hasOldGrowth = parcels.some(p =>
    p.species_mix.some(s => s.species.toLowerCase() === 'oak' && s.pct >= 30)
  );
  if (hasOldGrowth) {
    features.push({ id: 'old_growth', type: 'old_growth' });
  }

  // Check for wetland (peat soil)
  const hasWetland = parcels.some(p => p.soil_type.toLowerCase().includes('peat'));
  if (hasWetland) {
    features.push({ id: 'wetland', type: 'wetland' });
  }

  // Check for biodiversity (high birch or mixed species)
  const hasBiodiversity = parcels.some(p =>
    p.species_mix.filter(s => s.pct >= 15).length >= 3
  );
  if (hasBiodiversity) {
    features.push({ id: 'biodiversity', type: 'biodiversity' });
  }

  // Deadwood likely in mature stands
  const hasDeadwood = parcels.some(p => p.elevation_m > 250);
  if (hasDeadwood) {
    features.push({ id: 'deadwood', type: 'deadwood' });
  }

  return features;
}

// ─── Build comparisons ───

function buildComparisons(profile: ForestProfileData): RegionalComparison[] {
  const comparisons: RegionalComparison[] = [];

  // Birch percentage vs regional average
  const birchPct = profile.species.find(s => s.icon === 'birch')?.percentage ?? 0;
  const regionalBirchAvg = 12;
  if (birchPct > 0) {
    comparisons.push({
      metric: 'birchPercentage',
      yourValue: birchPct,
      regionalAvg: regionalBirchAvg,
      unit: '%',
      isPositive: birchPct > regionalBirchAvg,
    });
  }

  // Species diversity
  const speciesCount = profile.species.length;
  comparisons.push({
    metric: 'speciesCount',
    yourValue: speciesCount,
    regionalAvg: 2.8,
    unit: '',
    isPositive: speciesCount > 2.8,
  });

  // Area
  const avgArea = 35;
  comparisons.push({
    metric: 'totalArea',
    yourValue: profile.totalArea,
    regionalAvg: avgArea,
    unit: 'ha',
    isPositive: profile.totalArea > avgArea,
  });

  return comparisons;
}

// ─── Build profile from demo parcels ───

function buildDemoProfile(parcels: DemoParcel[]): ForestProfileData {
  const totalArea = parcels.reduce((sum, p) => sum + p.area_hectares, 0);

  // Aggregate species
  const speciesMap: Record<string, number> = {};
  let totalWeightedPct = 0;
  for (const parcel of parcels) {
    for (const sp of parcel.species_mix) {
      const areaWeighted = sp.pct * parcel.area_hectares;
      speciesMap[sp.species] = (speciesMap[sp.species] ?? 0) + areaWeighted;
      totalWeightedPct += areaWeighted;
    }
  }

  const species: SpeciesInfo[] = Object.entries(speciesMap)
    .map(([name, weighted]) => {
      const { ageClass, ageYears } = getRandomAgeClass(name);
      return {
        id: name.toLowerCase(),
        name,
        latinName: getLatinName(name),
        percentage: Math.round((weighted / totalWeightedPct) * 100),
        ageClass,
        ageYears,
        icon: getSpeciesIcon(name),
      };
    })
    .sort((a, b) => b.percentage - a.percentage);

  const dominantSpecies = species[0]?.name ?? 'Unknown';

  // Determine forest type
  const coniferPct = species
    .filter(s => s.icon === 'spruce' || s.icon === 'pine')
    .reduce((sum, s) => sum + s.percentage, 0);
  const deciduousPct = 100 - coniferPct;
  let forestType: ForestProfileData['forestType'] = 'mixed';
  if (coniferPct >= 70) forestType = 'conifer';
  else if (deciduousPct >= 70) forestType = 'deciduous';

  // Use first parcel for soil/terrain baseline
  const primaryParcel = parcels[0];
  const soilType = primaryParcel?.soil_type ?? 'Moraine';
  const moisture = soilMoisture(soilType);
  const rootRotRisk = soilRootRotRisk(soilType);

  const elevations = parcels.map(p => p.elevation_m);
  const elevationMin = Math.min(...elevations);
  const elevationMax = Math.max(...elevations);
  const elevationAvg = Math.round(elevations.reduce((a, b) => a + b, 0) / elevations.length);
  const slopeAvg = 5; // Demo: mostly flat
  const drainage = drainageFromSoil(soilType);

  const county = 'Jönköpings län';
  const municipality = primaryParcel?.municipality ?? 'Värnamo';
  const climate = climateFromCounty(county);

  const specialFeatures = detectSpecialFeatures(parcels);

  const profileData: ForestProfileData = {
    totalArea: Math.round(totalArea * 10) / 10,
    parcelCount: parcels.length,
    county,
    municipality,
    species,
    soil: { type: soilType, moisture, rootRotRisk },
    terrain: {
      elevationMin,
      elevationMax,
      elevationAvg,
      slopeAvg,
      drainage,
      machineAccessibility: machineAccess(slopeAvg, drainage),
    },
    climate,
    specialFeatures,
    comparisons: [],
    dominantSpecies,
    forestType,
  };

  profileData.comparisons = buildComparisons(profileData);

  return profileData;
}

// ─── Hook ───

export function useForestProfile(): ForestProfileResult {
  const [profile, setProfile] = useState<ForestProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Demo mode
    if (isDemo()) {
      await new Promise(r => setTimeout(r, 300));
      const demoProfile = buildDemoProfile(DEMO_PARCELS);
      setProfile(demoProfile);
      setIsDemoMode(true);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch real parcels
      const { data: parcels, error: parcelsError } = await supabase
        .from('parcels')
        .select('id, name, area_hectares, county, municipality, tags')
        .order('created_at', { ascending: false });

      if (parcelsError) throw new Error(parcelsError.message);

      if (!parcels || parcels.length === 0) {
        // No parcels — fall back to demo
        const demoProfile = buildDemoProfile(DEMO_PARCELS);
        setProfile(demoProfile);
        setIsDemoMode(true);
        setIsLoading(false);
        return;
      }

      // For now, build from demo enrichment since species_mix, soil, elevation
      // are not directly in the parcels table yet. In production these would
      // come from analysis_results and additional parcel metadata.
      const demoProfile = buildDemoProfile(DEMO_PARCELS);
      setProfile(demoProfile);
      setIsDemoMode(true);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load forest profile';
      setError(message);
      // Fallback to demo
      const demoProfile = buildDemoProfile(DEMO_PARCELS);
      setProfile(demoProfile);
      setIsDemoMode(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    profile,
    isLoading,
    isDemo: isDemoMode,
    error,
    refetch: fetchData,
  };
}
