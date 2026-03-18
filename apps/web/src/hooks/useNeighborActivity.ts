import { useState, useEffect, useMemo } from 'react';
import {
  getDemoActivities,
  getActivitiesWithinRadius,
  getActivitiesByType,
  getActivitiesByImpact,
  sortActivities,
  countHighImpact,
  type NeighborActivity,
  type ActivityType,
  type ImpactLevel,
  type SortField,
} from '@/services/neighborActivityService';

export interface UseNeighborActivityReturn {
  /** All activities within the current radius */
  activities: NeighborActivity[];
  /** Filtered and sorted activities */
  filtered: NeighborActivity[];
  /** Loading state */
  loading: boolean;
  /** Current search radius in km */
  radiusKm: number;
  setRadiusKm: (km: number) => void;
  /** Active type filters */
  typeFilters: ActivityType[];
  setTypeFilters: (types: ActivityType[]) => void;
  /** Active impact level filters */
  impactFilters: ImpactLevel[];
  setImpactFilters: (levels: ImpactLevel[]) => void;
  /** Sort field */
  sortBy: SortField;
  setSortBy: (field: SortField) => void;
  /** Count of high-impact activities in radius */
  highImpactCount: number;
  /** Total activity count in radius */
  totalCount: number;
  /** Selected activity for detail view */
  selectedActivity: NeighborActivity | null;
  setSelectedActivity: (a: NeighborActivity | null) => void;
}

export function useNeighborActivity(): UseNeighborActivityReturn {
  const [loading, setLoading] = useState(true);
  const [allActivities] = useState<NeighborActivity[]>(getDemoActivities);
  const [radiusKm, setRadiusKm] = useState(5);
  const [typeFilters, setTypeFilters] = useState<ActivityType[]>([]);
  const [impactFilters, setImpactFilters] = useState<ImpactLevel[]>([]);
  const [sortBy, setSortBy] = useState<SortField>('impact');
  const [selectedActivity, setSelectedActivity] = useState<NeighborActivity | null>(null);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const activities = useMemo(
    () => getActivitiesWithinRadius(radiusKm).filter((a) => allActivities.some((all) => all.id === a.id)),
    [radiusKm, allActivities],
  );

  const filtered = useMemo(() => {
    let result = activities;
    result = getActivitiesByType(result, typeFilters);
    result = getActivitiesByImpact(result, impactFilters);
    result = sortActivities(result, sortBy);
    return result;
  }, [activities, typeFilters, impactFilters, sortBy]);

  const highImpactCount = useMemo(() => countHighImpact(activities), [activities]);

  return {
    activities,
    filtered,
    loading,
    radiusKm,
    setRadiusKm,
    typeFilters,
    setTypeFilters,
    impactFilters,
    setImpactFilters,
    sortBy,
    setSortBy,
    highImpactCount,
    totalCount: activities.length,
    selectedActivity,
    setSelectedActivity,
  };
}
