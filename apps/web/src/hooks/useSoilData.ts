import { useState, useEffect, useCallback } from 'react';
import { getSoilType, getSoilMap, getGroundWaterLevel, type SoilProfile, type SoilMapData, type GroundWater, type SpeciesSuitability } from '../services/sguService';

export interface SoilDataState {
  soilProfile: SoilProfile | null;
  soilMap: SoilMapData | null;
  groundWater: GroundWater | null;
  speciesRecommendations: SpeciesSuitability[];
  harvestAccessibility: { month: string; accessible: boolean; reason: string }[];
  growthPotential: number;
  loading: boolean;
  error: string | null;
}

const MONTHS_SV = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

export function useSoilData(lat: number = 57.15, lon: number = 14.95): SoilDataState {
  const [soilProfile, setSoilProfile] = useState<SoilProfile | null>(null);
  const [soilMap, setSoilMap] = useState<SoilMapData | null>(null);
  const [groundWater, setGroundWater] = useState<GroundWater | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profile, map, gw] = await Promise.all([
        getSoilType(lat, lon),
        getSoilMap([lon - 0.1, lat - 0.1, lon + 0.1, lat + 0.1]),
        getGroundWaterLevel(lat, lon),
      ]);
      setSoilProfile(profile);
      setSoilMap(map);
      setGroundWater(gw);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch soil data');
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Compute harvest accessibility by month based on soil type
  const harvestAccessibility = MONTHS_SV.map((month, i) => {
    if (!soilProfile) return { month, accessible: true, reason: '' };
    const bearing = soilProfile.bearing_capacity;
    // Spring thaw (Mar-Apr) and autumn rain (Oct-Nov) reduce accessibility
    const isSpring = i >= 2 && i <= 3;
    const isAutumn = i >= 9 && i <= 10;
    const isWinter = i <= 1 || i === 11;

    if (isWinter && bearing >= 3) return { month, accessible: true, reason: 'Frusen mark — bra bärighet' };
    if (isWinter && bearing < 3) return { month, accessible: true, reason: 'Frusen mark kompenserar' };
    if (isSpring && bearing < 5) return { month, accessible: false, reason: 'Tjällossning — risk för markskador' };
    if (isSpring) return { month, accessible: bearing >= 7, reason: bearing >= 7 ? 'Acceptabel med försiktighet' : 'Hög risk för spårbildning' };
    if (isAutumn && bearing < 5) return { month, accessible: false, reason: 'Höstregn — dålig bärighet' };
    if (bearing >= 7) return { month, accessible: true, reason: 'God bärighet' };
    if (bearing >= 4) return { month, accessible: true, reason: 'Kräver risning av basvägar' };
    return { month, accessible: false, reason: 'Otillräcklig bärighet' };
  });

  const speciesRecommendations = soilProfile?.suitable_species
    .filter(s => s.rating >= 3)
    .sort((a, b) => b.rating - a.rating) || [];

  return {
    soilProfile,
    soilMap,
    groundWater,
    speciesRecommendations,
    harvestAccessibility,
    growthPotential: soilProfile?.growth_potential || 0,
    loading,
    error,
  };
}
