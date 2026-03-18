// ─── Offline Sync Engine ───
// IndexedDB-backed operation queue with auto-sync, conflict resolution, and retry.
// No external dependencies — uses a lightweight built-in IndexedDB wrapper.

const DB_NAME = 'beetlesense-sync-queue';
const DB_VERSION = 1;
const STORE_NAME = 'operations';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ─── Types ───

export type OperationType = 'create' | 'update' | 'delete';

export interface SyncOperation {
  id: string;
  table: string;
  operation: OperationType;
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
  lastError?: string;
}

export type SyncHandler = (op: SyncOperation) => Promise<boolean>;

// ─── IndexedDB Helpers (idb-keyval pattern) ───

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('table', 'table', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
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

function txStore(
  mode: IDBTransactionMode,
): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
  return openDB().then((db) => {
    const tx = db.transaction(STORE_NAME, mode);
    return { store: tx.objectStore(STORE_NAME), tx };
  });
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

// ─── Core Operations ───

/**
 * Queue an operation for later sync.
 * If offline, stored in IndexedDB. If online, attempts immediate sync.
 */
export async function queueOperation(
  table: string,
  operation: OperationType,
  data: Record<string, unknown>,
): Promise<string> {
  const op: SyncOperation = {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    table,
    operation,
    data: { ...data, _syncTimestamp: Date.now() },
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
  };

  const { store, tx } = await txStore('readwrite');
  store.put(op);
  await txComplete(tx);

  // If online and a handler is registered, attempt immediate sync
  if (navigator.onLine && _syncHandler) {
    syncAll().catch(() => {
      // Silently fail — will retry later
    });
  }

  return op.id;
}

/**
 * Get all pending/failed operations.
 */
export async function getPendingOperations(): Promise<SyncOperation[]> {
  const { store } = await txStore('readonly');
  const all = await reqToPromise(store.getAll());
  return (all as SyncOperation[]).filter(
    (op) => op.status === 'pending' || op.status === 'failed',
  );
}

/**
 * Get the count of pending operations.
 */
export async function getPendingCount(): Promise<number> {
  const ops = await getPendingOperations();
  return ops.length;
}

/**
 * Clear all operations from the queue.
 */
export async function clearQueue(): Promise<void> {
  const { store, tx } = await txStore('readwrite');
  store.clear();
  await txComplete(tx);
}

/**
 * Remove a single operation by ID.
 */
export async function removeOperation(id: string): Promise<void> {
  const { store, tx } = await txStore('readwrite');
  store.delete(id);
  await txComplete(tx);
}

// ─── Sync Engine ───

let _syncHandler: SyncHandler | null = null;
let _isSyncing = false;
let _listeners: Array<() => void> = [];

/**
 * Register a sync handler that processes operations against the server.
 * Returns a cleanup function.
 */
export function registerSyncHandler(handler: SyncHandler): () => void {
  _syncHandler = handler;
  return () => {
    _syncHandler = null;
  };
}

/**
 * Subscribe to sync state changes. Returns unsubscribe function.
 */
export function onSyncChange(listener: () => void): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  _listeners.forEach((l) => l());
}

/**
 * Check if the engine is currently syncing.
 */
export function isSyncing(): boolean {
  return _isSyncing;
}

/**
 * Delay helper for exponential backoff.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve conflicts using last-write-wins by timestamp.
 * Deduplicates operations on the same table+record, keeping the latest.
 */
function resolveConflicts(operations: SyncOperation[]): SyncOperation[] {
  const byKey = new Map<string, SyncOperation>();

  for (const op of operations) {
    const recordId = (op.data.id as string) || op.id;
    const key = `${op.table}:${recordId}`;
    const existing = byKey.get(key);

    if (!existing || op.timestamp > existing.timestamp) {
      byKey.set(key, op);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Sync all pending operations to the server.
 * Uses conflict resolution and exponential backoff.
 */
export async function syncAll(): Promise<{ synced: number; failed: number }> {
  if (_isSyncing || !navigator.onLine || !_syncHandler) {
    return { synced: 0, failed: 0 };
  }

  _isSyncing = true;
  notifyListeners();

  let synced = 0;
  let failed = 0;

  try {
    const pending = await getPendingOperations();
    if (pending.length === 0) return { synced: 0, failed: 0 };

    // Resolve conflicts: last-write-wins
    const resolved = resolveConflicts(pending);

    // Remove operations that lost conflict resolution
    const resolvedIds = new Set(resolved.map((op) => op.id));
    const discarded = pending.filter((op) => !resolvedIds.has(op.id));
    for (const op of discarded) {
      await removeOperation(op.id);
    }

    // Process resolved operations
    for (const op of resolved) {
      // Mark as syncing
      const { store: updateStore, tx: updateTx } = await txStore('readwrite');
      updateStore.put({ ...op, status: 'syncing' });
      await txComplete(updateTx);
      notifyListeners();

      let success = false;
      const retryLimit = MAX_RETRIES - op.retries;

      for (let attempt = 0; attempt < retryLimit; attempt++) {
        try {
          success = await _syncHandler(op);
          if (success) break;
        } catch {
          // Will retry
        }

        if (attempt < retryLimit - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await delay(BASE_DELAY_MS * Math.pow(2, attempt));
        }
      }

      if (success) {
        await removeOperation(op.id);
        synced++;
      } else {
        const newRetries = op.retries + 1;
        const newStatus = newRetries >= MAX_RETRIES ? 'failed' : 'pending';
        const { store: failStore, tx: failTx } = await txStore('readwrite');
        failStore.put({
          ...op,
          status: newStatus,
          retries: newRetries,
          lastError: 'Sync failed after retries',
        });
        await txComplete(failTx);
        failed++;
      }

      notifyListeners();
    }
  } finally {
    _isSyncing = false;
    notifyListeners();
  }

  return { synced, failed };
}

// ─── Auto-Sync on Reconnection ───

let _autoSyncRegistered = false;

/**
 * Enable automatic sync when the browser comes back online.
 * Safe to call multiple times — only registers listeners once.
 */
export function enableAutoSync(): () => void {
  if (_autoSyncRegistered || typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => {
    syncAll().catch(() => {
      // Silent — will retry on next online event
    });
  };

  window.addEventListener('online', handleOnline);
  _autoSyncRegistered = true;

  return () => {
    window.removeEventListener('online', handleOnline);
    _autoSyncRegistered = false;
  };
}

// ─── Backward-compatibility exports ───

/** Simple hook-like function returning current network status. */
export function useNetworkStatus() {
  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}

/** Re-export OfflineBanner as a no-op placeholder (use OfflineIndicator component instead). */
export function OfflineBanner() {
  return null;
}
