// ─── Offline Store ───
// IndexedDB-backed store for offline field data: parcels, health scores,
// queued actions, and sync metadata. Zero external dependencies.

const DB_NAME = 'beetlesense-offline-store';
const DB_VERSION = 1;

const STORES = {
  parcels: 'parcels',
  health: 'health',
  actions: 'actions',
  meta: 'meta',
} as const;

// ─── Types ───

export interface ParcelData {
  id: string;
  name: string;
  area_ha: number;
  center: [number, number];
  health_score?: number;
  beetle_risk?: number;
  last_survey_date?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthData {
  parcel_id: string;
  overall_score: number;
  ndvi_mean: number | null;
  beetle_risk_level: 'low' | 'medium' | 'high' | 'critical';
  stressed_tree_count: number;
  last_analysis_date: string;
  details?: Record<string, unknown>;
}

export type OfflineActionType =
  | 'photo_capture'
  | 'observation'
  | 'parcel_note'
  | 'tree_measurement'
  | 'voice_note';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: Record<string, unknown>;
  createdAt: number;
  /** Base64-encoded image data for photo captures */
  imageData?: string;
  lat?: number | null;
  lng?: number | null;
}

// ─── Database Management ───

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.parcels)) {
        db.createObjectStore(STORES.parcels, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.health)) {
        db.createObjectStore(STORES.health, { keyPath: 'parcel_id' });
      }
      if (!db.objectStoreNames.contains(STORES.actions)) {
        const store = db.createObjectStore(STORES.actions, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ─── Parcel Data ───

export async function cacheParcelData(parcels: ParcelData[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.parcels, 'readwrite');
    const store = tx.objectStore(STORES.parcels);

    for (const parcel of parcels) {
      store.put(parcel);
    }

    await txComplete(tx);
  } catch (err) {
    // Handle quota errors gracefully
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('Offline store: storage quota exceeded while caching parcels');
      return;
    }
    throw err;
  }
}

export async function getCachedParcels(): Promise<ParcelData[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.parcels, 'readonly');
    const store = tx.objectStore(STORES.parcels);
    return (await reqToPromise(store.getAll())) as ParcelData[];
  } catch {
    return [];
  }
}

export async function getCachedParcel(id: string): Promise<ParcelData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.parcels, 'readonly');
    const store = tx.objectStore(STORES.parcels);
    const result = await reqToPromise(store.get(id));
    return (result as ParcelData) ?? null;
  } catch {
    return null;
  }
}

// ─── Health Data ───

export async function cacheHealthData(data: HealthData): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.health, 'readwrite');
    const store = tx.objectStore(STORES.health);
    store.put(data);
    await txComplete(tx);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('Offline store: storage quota exceeded while caching health data');
      return;
    }
    throw err;
  }
}

export async function getCachedHealth(parcelId?: string): Promise<HealthData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.health, 'readonly');
    const store = tx.objectStore(STORES.health);

    if (parcelId) {
      const result = await reqToPromise(store.get(parcelId));
      return (result as HealthData) ?? null;
    }

    // Return the first health record if no parcel specified
    const all = (await reqToPromise(store.getAll())) as HealthData[];
    return all[0] ?? null;
  } catch {
    return null;
  }
}

export async function getAllCachedHealth(): Promise<HealthData[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.health, 'readonly');
    const store = tx.objectStore(STORES.health);
    return (await reqToPromise(store.getAll())) as HealthData[];
  } catch {
    return [];
  }
}

// ─── Offline Action Queue ───

export async function queueAction(action: OfflineAction): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.actions, 'readwrite');
    const store = tx.objectStore(STORES.actions);
    store.put(action);
    await txComplete(tx);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.warn('Offline store: storage quota exceeded while queuing action');
      // For quota errors on action queue, throw so caller knows the action wasn't saved
      throw new Error('Storage full — cannot queue offline action. Free up space and try again.');
    }
    throw err;
  }
}

export async function getPendingActions(): Promise<OfflineAction[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.actions, 'readonly');
    const store = tx.objectStore(STORES.actions);
    const all = (await reqToPromise(store.getAll())) as OfflineAction[];
    // Return sorted by creation time, oldest first
    return all.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function clearAction(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.actions, 'readwrite');
    const store = tx.objectStore(STORES.actions);
    store.delete(id);
    await txComplete(tx);
  } catch {
    // Silently ignore — action might already be cleared
  }
}

export async function clearAllActions(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.actions, 'readwrite');
    const store = tx.objectStore(STORES.actions);
    store.clear();
    await txComplete(tx);
  } catch {
    // Best effort
  }
}

export async function getPendingActionCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.actions, 'readonly');
    const store = tx.objectStore(STORES.actions);
    return await reqToPromise(store.count());
  } catch {
    return 0;
  }
}

// ─── Sync Metadata ───

export async function getLastSyncTime(): Promise<Date | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.meta, 'readonly');
    const store = tx.objectStore(STORES.meta);
    const result = await reqToPromise(store.get('lastSyncTime'));
    if (result && typeof (result as Record<string, unknown>).value === 'number') {
      return new Date((result as Record<string, unknown>).value as number);
    }
    return null;
  } catch {
    return null;
  }
}

export async function setLastSyncTime(time: Date): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.meta, 'readwrite');
    const store = tx.objectStore(STORES.meta);
    store.put({ key: 'lastSyncTime', value: time.getTime() });
    await txComplete(tx);
  } catch {
    // Best effort
  }
}

// ─── Cleanup ───

export async function clearOfflineStore(): Promise<void> {
  try {
    const db = await openDB();
    const storeNames = [STORES.parcels, STORES.health, STORES.actions, STORES.meta];
    const tx = db.transaction(storeNames, 'readwrite');
    for (const name of storeNames) {
      tx.objectStore(name).clear();
    }
    await txComplete(tx);
  } catch {
    // Best effort
  }
}
