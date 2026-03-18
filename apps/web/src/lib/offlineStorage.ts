// ─── Offline Storage ───
// IndexedDB-based data cache for offline access to parcels, surveys, alerts, etc.
// No external dependencies.

const DB_NAME = 'beetlesense-offline-cache';
const DB_VERSION = 2;

const STORES = [
  'parcels',
  'surveys',
  'alerts',
  'settings',
  'field-observations',
  'sensor-products',
  'fusion-summaries',
  'tree-inventory-summary',
] as const;

export type StoreName = (typeof STORES)[number];

// ─── Database Management ───

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // Version 1: create all stores
      if (oldVersion < 1) {
        for (const storeName of STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'key' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        }
      }

      // Version 2: add sensor-cache stores
      if (oldVersion < 2) {
        for (const storeName of ['sensor-products', 'fusion-summaries', 'tree-inventory-summary'] as const) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'key' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        }
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

// ─── Cache Entry Type ───

interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  updatedAt: number;
  expiresAt?: number;
}

// ─── Public API ───

/**
 * Cache data in a specific store.
 * Overwrites existing entry with the same key.
 */
export async function cacheData<T>(
  store: StoreName,
  key: string,
  data: T,
  ttlMs?: number,
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);

  const entry: CacheEntry<T> = {
    key,
    data,
    updatedAt: Date.now(),
    expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
  };

  objectStore.put(entry);
  await txComplete(tx);
}

/**
 * Retrieve cached data by key.
 * Returns null if not found or expired.
 */
export async function getCachedData<T>(
  store: StoreName,
  key: string,
): Promise<T | null> {
  const db = await openDB();
  const tx = db.transaction(store, 'readonly');
  const objectStore = tx.objectStore(store);

  const entry = (await reqToPromise(objectStore.get(key))) as CacheEntry<T> | undefined;

  if (!entry) return null;

  // Check expiration
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    // Expired — clean up asynchronously
    removeCachedData(store, key).catch(() => {});
    return null;
  }

  return entry.data;
}

/**
 * Get all cached entries from a store.
 * Filters out expired entries.
 */
export async function getAllCachedData<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(store, 'readonly');
  const objectStore = tx.objectStore(store);

  const entries = (await reqToPromise(objectStore.getAll())) as CacheEntry<T>[];
  const now = Date.now();

  return entries
    .filter((entry) => !entry.expiresAt || now <= entry.expiresAt)
    .map((entry) => entry.data);
}

/**
 * Remove a single cached entry.
 */
export async function removeCachedData(
  store: StoreName,
  key: string,
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);

  objectStore.delete(key);
  await txComplete(tx);
}

/**
 * Clear all data from a specific store.
 */
export async function clearCache(store: StoreName): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);

  objectStore.clear();
  await txComplete(tx);
}

/**
 * Clear all stores (full reset).
 */
export async function clearAllCaches(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction([...STORES], 'readwrite');

  for (const storeName of STORES) {
    tx.objectStore(storeName).clear();
  }

  await txComplete(tx);
}

/**
 * Get the count of entries in a store.
 */
export async function getCacheCount(store: StoreName): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(store, 'readonly');
  const objectStore = tx.objectStore(store);

  return reqToPromise(objectStore.count());
}

/**
 * Cache multiple entries at once (batch write).
 */
export async function cacheBatch<T>(
  store: StoreName,
  entries: Array<{ key: string; data: T; ttlMs?: number }>,
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  const now = Date.now();

  for (const { key, data, ttlMs } of entries) {
    const entry: CacheEntry<T> = {
      key,
      data,
      updatedAt: now,
      expiresAt: ttlMs ? now + ttlMs : undefined,
    };
    objectStore.put(entry);
  }

  await txComplete(tx);
}

/**
 * Delete the entire database (destructive — use for logout/reset).
 */
export async function deleteDatabase(): Promise<void> {
  // Close existing connection
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
