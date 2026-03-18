import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───

export interface FieldPhoto {
  id: string;
  /** base64 data URI thumbnail for display */
  thumbnailDataUrl: string;
  /** IndexedDB key where the full-resolution blob is stored */
  idbKey: string;
  width: number;
  height: number;
  timestamp: number;
  gps: FieldGps | null;
  compassHeading: number | null;
  prompt: string;
  uploaded: boolean;
}

export interface FieldGps {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
}

export interface FieldNote {
  id: string;
  text: string;
  tags: FieldNoteTag[];
  gps: FieldGps | null;
  timestamp: number;
  synced: boolean;
}

export type FieldNoteTag =
  | 'beetle_damage'
  | 'storm_damage'
  | 'wildlife_sighting'
  | 'boundary_issue'
  | 'other';

export interface CachedAIResponse {
  questionKey: string;
  question: string;
  answer: string;
  cachedAt: number;
}

export interface QueuedAIQuestion {
  id: string;
  question: string;
  timestamp: number;
}

export interface CachedSensorProductEntry {
  id: string;
  parcel_id: string;
  survey_id: string;
  sensor_type: string;
  product_name: string;
  storage_path: string;
  metadata: Record<string, unknown>;
  created_at: string;
  signed_url: string | null;
  cached_at: number;
}

export interface CachedFusionSummaryEntry {
  id: string;
  parcel_id: string;
  product_name: string;
  sensors_used: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  cached_at: number;
}

export interface CachedTreeInventorySummaryEntry {
  parcel_id: string;
  tree_count: number;
  mean_height_m: number | null;
  total_volume_m3: number | null;
  species_detected: number | null;
  stressed_count: number | null;
  cached_at: number;
}

export interface CachedSensorData {
  sensorProducts: CachedSensorProductEntry[];
  fusionSummaries: CachedFusionSummaryEntry[];
  treeInventorySummary: CachedTreeInventorySummaryEntry | null;
}

// ─── IndexedDB helpers ───

const DB_NAME = 'beetlesense-field';
const DB_VERSION = 1;
const PHOTO_STORE = 'photos';

function openFieldDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePhotoBlob(key: string, blob: Blob): Promise<void> {
  const db = await openFieldDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPhotoBlob(key: string): Promise<Blob | undefined> {
  const db = await openFieldDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readonly');
    const req = tx.objectStore(PHOTO_STORE).get(key);
    req.onsuccess = () => resolve(req.result as Blob | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhotoBlob(key: string): Promise<void> {
  const db = await openFieldDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Store ───

interface FieldModeState {
  isFieldMode: boolean;
  activeTab: 'map' | 'capture' | 'notes' | 'ai';
  capturedPhotos: FieldPhoto[];
  fieldNotes: FieldNote[];
  cachedAIResponses: CachedAIResponse[];
  queuedAIQuestions: QueuedAIQuestion[];
  cachedSensorData: CachedSensorData | null;
  cacheReady: boolean;
  cacheProgress: number; // 0-100

  // Actions
  enableFieldMode: () => void;
  disableFieldMode: () => void;
  setActiveTab: (tab: 'map' | 'capture' | 'notes' | 'ai') => void;
  addPhoto: (photo: FieldPhoto) => void;
  removePhoto: (id: string) => void;
  markPhotoUploaded: (id: string) => void;
  addNote: (note: FieldNote) => void;
  removeNote: (id: string) => void;
  markNoteSynced: (id: string) => void;
  setCachedAIResponses: (responses: CachedAIResponse[]) => void;
  addQueuedQuestion: (question: QueuedAIQuestion) => void;
  removeQueuedQuestion: (id: string) => void;
  setCachedSensorData: (data: CachedSensorData | null) => void;
  setCacheReady: (ready: boolean) => void;
  setCacheProgress: (progress: number) => void;
}

export const useFieldModeStore = create<FieldModeState>()(
  persist(
    (set) => ({
      isFieldMode: false,
      activeTab: 'map',
      capturedPhotos: [],
      fieldNotes: [],
      cachedAIResponses: [],
      queuedAIQuestions: [],
      cachedSensorData: null,
      cacheReady: false,
      cacheProgress: 0,

      enableFieldMode: () => set({ isFieldMode: true, activeTab: 'map' }),
      disableFieldMode: () => set({ isFieldMode: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      addPhoto: (photo) =>
        set((state) => ({ capturedPhotos: [...state.capturedPhotos, photo] })),
      removePhoto: (id) =>
        set((state) => ({
          capturedPhotos: state.capturedPhotos.filter((p) => p.id !== id),
        })),
      markPhotoUploaded: (id) =>
        set((state) => ({
          capturedPhotos: state.capturedPhotos.map((p) =>
            p.id === id ? { ...p, uploaded: true } : p,
          ),
        })),

      addNote: (note) =>
        set((state) => ({ fieldNotes: [...state.fieldNotes, note] })),
      removeNote: (id) =>
        set((state) => ({
          fieldNotes: state.fieldNotes.filter((n) => n.id !== id),
        })),
      markNoteSynced: (id) =>
        set((state) => ({
          fieldNotes: state.fieldNotes.map((n) =>
            n.id === id ? { ...n, synced: true } : n,
          ),
        })),

      setCachedAIResponses: (responses) =>
        set({ cachedAIResponses: responses }),
      addQueuedQuestion: (question) =>
        set((state) => ({
          queuedAIQuestions: [...state.queuedAIQuestions, question],
        })),
      removeQueuedQuestion: (id) =>
        set((state) => ({
          queuedAIQuestions: state.queuedAIQuestions.filter((q) => q.id !== id),
        })),

      setCachedSensorData: (data) => set({ cachedSensorData: data }),
      setCacheReady: (ready) => set({ cacheReady: ready }),
      setCacheProgress: (progress) => set({ cacheProgress: progress }),
    }),
    {
      name: 'beetlesense-field-mode',
      partialize: (state) => ({
        isFieldMode: state.isFieldMode,
        activeTab: state.activeTab,
        capturedPhotos: state.capturedPhotos,
        fieldNotes: state.fieldNotes,
        cachedAIResponses: state.cachedAIResponses,
        queuedAIQuestions: state.queuedAIQuestions,
        cachedSensorData: state.cachedSensorData,
        cacheReady: state.cacheReady,
      }),
    },
  ),
);
