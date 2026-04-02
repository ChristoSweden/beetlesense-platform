import { useState, useEffect, useMemo } from 'react';
import {
  getDemoCompoundThreat,
  generateThreatTimeline,
  type CompoundThreatAssessment,
  type ThreatTimeline,
} from '@/services/compoundThreatService';

export interface CompoundThreatState {
  assessment: CompoundThreatAssessment | null;
  timeline: ThreatTimeline[];
  loading: boolean;
  error: string | null;
}

export function useCompoundThreat(): CompoundThreatState {
  const [assessment, setAssessment] = useState<CompoundThreatAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const result = getDemoCompoundThreat();
      setAssessment(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate compound threat');
    } finally {
      setLoading(false);
    }
  }, []);

  const timeline = useMemo(() => {
    if (!assessment) return [];
    const month = new Date().getMonth() + 1;
    const seasonalTemp = month >= 5 && month <= 8 ? 22 + Math.random() * 6 : 8 + Math.random() * 8;
    const seasonalHumidity = month >= 6 && month <= 8 ? 35 + Math.random() * 20 : 55 + Math.random() * 25;
    return generateThreatTimeline({
      temperature: seasonalTemp,
      humidity: seasonalHumidity,
      windSpeed: 3,
      beetleTrapCount: 1800,
      gddAccumulated: 220,
      droughtDays: 5,
      nearbyFireCount: 0,
      recentStormDamage_ha: 0,
      soilMoisture: 45,
    });
  }, [assessment]);

  return { assessment, timeline, loading, error };
}
