import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  REGULATORY_CHANGES,
  type RegulatoryChange,
  type ImpactSeverity,
  type RegulatoryCategory,
} from '@/data/regulatoryChanges';

// ─── Types ───

export type RadarFilter = 'all' | 'my_parcels' | 'national' | 'eu';
export type SortMode = 'date' | 'severity';

export interface UseRegulatoryRadarReturn {
  changes: RegulatoryChange[];
  filteredChanges: RegulatoryChange[];
  filter: RadarFilter;
  setFilter: (f: RadarFilter) => void;
  sortMode: SortMode;
  setSortMode: (s: SortMode) => void;
  selectedCategories: RegulatoryCategory[];
  toggleCategory: (c: RegulatoryCategory) => void;
  clearCategories: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  toggleActionCompleted: (changeId: string, actionId: string) => void;
  unreadCount: number;
  unreadHighImpactCount: number;
  subscribeToUpdates: boolean;
  setSubscribeToUpdates: (v: boolean) => void;
  isLoading: boolean;
}

// ─── Severity weight for sorting ───

const SEVERITY_WEIGHT: Record<ImpactSeverity, number> = {
  high: 4,
  medium: 3,
  low: 2,
  informational: 1,
};

// ─── localStorage keys ───

const READ_KEY = 'beetlesense_radar_read';
const SUBSCRIBE_KEY = 'beetlesense_radar_subscribe';
const ACTIONS_KEY = 'beetlesense_radar_actions';

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage unavailable
  }
}

function loadCompletedActions(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(ACTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCompletedActions(actions: Record<string, string[]>) {
  try {
    localStorage.setItem(ACTIONS_KEY, JSON.stringify(actions));
  } catch {
    // Storage unavailable
  }
}

// ─── Hook ───

export function useRegulatoryRadar(): UseRegulatoryRadarReturn {
  const [changes, setChanges] = useState<RegulatoryChange[]>([]);
  const [filter, setFilter] = useState<RadarFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [selectedCategories, setSelectedCategories] = useState<RegulatoryCategory[]>([]);
  const [_readIds, setReadIds] = useState<Set<string>>(new Set());
  const [_completedActions, setCompletedActions] = useState<Record<string, string[]>>({});
  const [subscribeToUpdates, setSubscribeToUpdatesState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load data
  useEffect(() => {
    const savedReadIds = loadReadIds();
    const savedActions = loadCompletedActions();
    setReadIds(savedReadIds);
    setCompletedActions(savedActions);

    try {
      const savedSubscribe = localStorage.getItem(SUBSCRIBE_KEY);
      if (savedSubscribe) setSubscribeToUpdatesState(JSON.parse(savedSubscribe));
    } catch {
      // ignore
    }

    // Load from demo data or Supabase
    const loaded = REGULATORY_CHANGES.map((c) => ({
      ...c,
      isRead: savedReadIds.has(c.id) || c.isRead,
      requiredActions: c.requiredActions.map((a) => ({
        ...a,
        completed: a.completed || (savedActions[c.id]?.includes(a.id) ?? false),
      })),
    }));
    setChanges(loaded);
    setIsLoading(false);
  }, []);

  // Filtered and sorted changes
  const filteredChanges = useMemo(() => {
    let result = [...changes];

    // Filter by scope/relevance
    switch (filter) {
      case 'my_parcels':
        result = result.filter((c) => c.affectedParcels.length > 0);
        break;
      case 'national':
        result = result.filter((c) => c.scope === 'national' || c.scope === 'regional');
        break;
      case 'eu':
        result = result.filter((c) => c.scope === 'eu');
        break;
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      result = result.filter((c) =>
        c.categories.some((cat) => selectedCategories.includes(cat)),
      );
    }

    // Sort
    if (sortMode === 'date') {
      result.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
    } else {
      result.sort((a, b) => {
        const diff = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
        if (diff !== 0) return diff;
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      });
    }

    return result;
  }, [changes, filter, sortMode, selectedCategories]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
    setChanges((prev) => prev.map((c) => (c.id === id ? { ...c, isRead: true } : c)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setChanges((prev) => {
      const allIds = new Set(prev.map((c) => c.id));
      setReadIds(allIds);
      saveReadIds(allIds);
      return prev.map((c) => ({ ...c, isRead: true }));
    });
  }, []);

  const toggleActionCompleted = useCallback((changeId: string, actionId: string) => {
    setCompletedActions((prev) => {
      const existing = prev[changeId] ?? [];
      const next = existing.includes(actionId)
        ? existing.filter((id) => id !== actionId)
        : [...existing, actionId];
      const updated = { ...prev, [changeId]: next };
      saveCompletedActions(updated);
      return updated;
    });

    setChanges((prev) =>
      prev.map((c) => {
        if (c.id !== changeId) return c;
        return {
          ...c,
          requiredActions: c.requiredActions.map((a) =>
            a.id === actionId ? { ...a, completed: !a.completed } : a,
          ),
        };
      }),
    );
  }, []);

  const toggleCategory = useCallback((category: RegulatoryCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }, []);

  const clearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const setSubscribeToUpdates = useCallback((v: boolean) => {
    setSubscribeToUpdatesState(v);
    try {
      localStorage.setItem(SUBSCRIBE_KEY, JSON.stringify(v));
    } catch {
      // ignore
    }
  }, []);

  const unreadCount = useMemo(() => changes.filter((c) => !c.isRead).length, [changes]);
  const unreadHighImpactCount = useMemo(
    () => changes.filter((c) => !c.isRead && c.severity === 'high').length,
    [changes],
  );

  return {
    changes,
    filteredChanges,
    filter,
    setFilter,
    sortMode,
    setSortMode,
    selectedCategories,
    toggleCategory,
    clearCategories,
    markAsRead,
    markAllAsRead,
    toggleActionCompleted,
    unreadCount,
    unreadHighImpactCount,
    subscribeToUpdates,
    setSubscribeToUpdates,
    isLoading,
  };
}
