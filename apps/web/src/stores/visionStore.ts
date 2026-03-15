import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface IdentificationCandidate {
  rank: number;
  species_id: string;
  common_name_en: string;
  common_name_sv: string;
  scientific_name: string;
  confidence: number;
  type: 'tree' | 'plant' | 'animal' | 'disease';
  description: string;
  habitat: string;
  season: string;
  conservation_status: string;
  is_pest: boolean;
  is_regulated: boolean;
}

export interface DiseaseDetection {
  disease_id: string;
  name_en: string;
  name_sv: string;
  scientific_name: string;
  confidence: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'critical';
  symptoms_detected: string[];
  treatment: string[];
  is_reportable: boolean;
  report_authority: string;
}

export interface IdentificationResult {
  identification_id: string;
  task: string;
  top_candidates: IdentificationCandidate[];
  disease_detections: DiseaseDetection[];
  has_pest_warning: boolean;
  has_disease: boolean;
  processing_time_ms: number;
}

export interface HistoryEntry {
  id: string;
  result: IdentificationResult;
  thumbnailUrl: string;
  gps: { latitude: number; longitude: number } | null;
  timestamp: number;
}

export type IdentificationFilter = 'all' | 'tree' | 'plant' | 'animal' | 'disease';

export interface OfflineQueueItem {
  id: string;
  imageBase64: string;
  gps: { latitude: number; longitude: number } | null;
  timestamp: number;
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
}

// ─── Store ──────────────────────────────────────────────────────────────────────

interface VisionState {
  // Current identification
  currentResult: IdentificationResult | null;
  currentThumbnail: string | null;
  isIdentifying: boolean;
  error: string | null;

  // History
  history: HistoryEntry[];
  historyFilter: IdentificationFilter;

  // Offline queue
  offlineQueue: OfflineQueueItem[];
  isSyncing: boolean;

  // Actions — current
  setCurrentResult: (result: IdentificationResult, thumbnail: string) => void;
  clearCurrentResult: () => void;
  setIdentifying: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions — history
  addToHistory: (entry: HistoryEntry) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  setHistoryFilter: (filter: IdentificationFilter) => void;

  // Actions — offline queue
  addToOfflineQueue: (item: OfflineQueueItem) => void;
  removeFromOfflineQueue: (id: string) => void;
  updateOfflineQueueItem: (id: string, updates: Partial<OfflineQueueItem>) => void;
  clearOfflineQueue: () => void;
  setSyncing: (syncing: boolean) => void;

  // Computed
  filteredHistory: () => HistoryEntry[];
  pendingOfflineCount: () => number;
}

export const useVisionStore = create<VisionState>()(
  persist(
    (set, get) => ({
      // ── State ─────────────────────────────────────────────────────────────
      currentResult: null,
      currentThumbnail: null,
      isIdentifying: false,
      error: null,

      history: [],
      historyFilter: 'all',

      offlineQueue: [],
      isSyncing: false,

      // ── Current identification ────────────────────────────────────────────
      setCurrentResult: (result, thumbnail) =>
        set({ currentResult: result, currentThumbnail: thumbnail, isIdentifying: false, error: null }),

      clearCurrentResult: () =>
        set({ currentResult: null, currentThumbnail: null, error: null }),

      setIdentifying: (loading) =>
        set({ isIdentifying: loading, error: loading ? null : get().error }),

      setError: (error) =>
        set({ error, isIdentifying: false }),

      // ── History ───────────────────────────────────────────────────────────
      addToHistory: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, 200), // Keep last 200
        })),

      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      setHistoryFilter: (filter) => set({ historyFilter: filter }),

      // ── Offline queue ─────────────────────────────────────────────────────
      addToOfflineQueue: (item) =>
        set((state) => ({
          offlineQueue: [...state.offlineQueue, item],
        })),

      removeFromOfflineQueue: (id) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((q) => q.id !== id),
        })),

      updateOfflineQueueItem: (id, updates) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.map((q) =>
            q.id === id ? { ...q, ...updates } : q,
          ),
        })),

      clearOfflineQueue: () => set({ offlineQueue: [] }),

      setSyncing: (syncing) => set({ isSyncing: syncing }),

      // ── Computed ──────────────────────────────────────────────────────────
      filteredHistory: () => {
        const { history, historyFilter } = get();
        if (historyFilter === 'all') return history;
        return history.filter((entry) => {
          const topType = entry.result.top_candidates[0]?.type;
          if (historyFilter === 'disease') {
            return entry.result.has_disease;
          }
          return topType === historyFilter;
        });
      },

      pendingOfflineCount: () =>
        get().offlineQueue.filter((q) => q.status === 'pending').length,
    }),
    {
      name: 'beetlesense-vision',
      partialize: (state) => ({
        history: state.history,
        offlineQueue: state.offlineQueue,
        historyFilter: state.historyFilter,
      }),
    },
  ),
);
