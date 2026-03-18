import { useState, useEffect, useCallback, useRef } from 'react';
import {
  queueOperation as queueOp,
  syncAll,
  getPendingCount,
  registerSyncHandler,
  enableAutoSync,
  onSyncChange,
  isSyncing as checkIsSyncing,
  type OperationType,
  type SyncHandler,
} from '../lib/offlineSync';

// ─── Types ───

interface UseOfflineSyncOptions {
  /** Handler called to sync each operation to the server. */
  syncHandler?: SyncHandler;
  /** Whether to enable auto-sync on reconnection. Default: true. */
  autoSync?: boolean;
}

interface UseOfflineSyncReturn {
  /** Whether the browser is currently online. */
  isOnline: boolean;
  /** Number of pending operations in the queue. */
  pendingCount: number;
  /** Whether the sync engine is actively syncing. */
  isSyncing: boolean;
  /** Queue a new operation for sync. */
  queueOperation: (
    table: string,
    operation: OperationType,
    data: Record<string, unknown>,
  ) => Promise<string>;
  /** Manually trigger a full sync. */
  syncNow: () => Promise<{ synced: number; failed: number }>;
  /** Whether the device just came back online (true for 2s after reconnection). */
  justReconnected: boolean;
}

// ─── Hook ───

export function useOfflineSync(
  options: UseOfflineSyncOptions = {},
): UseOfflineSyncReturn {
  const { syncHandler, autoSync = true } = options;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Register sync handler
  useEffect(() => {
    if (!syncHandler) return;
    return registerSyncHandler(syncHandler);
  }, [syncHandler]);

  // Enable auto-sync on reconnection
  useEffect(() => {
    if (!autoSync) return;
    return enableAutoSync();
  }, [autoSync]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);

      // Clear previous timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      // Reset justReconnected after 2s
      reconnectTimerRef.current = setTimeout(() => {
        setJustReconnected(false);
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  // Listen for sync state changes and update pending count
  useEffect(() => {
    const updateState = () => {
      setIsSyncing(checkIsSyncing());
      getPendingCount().then(setPendingCount).catch(() => {});
    };

    // Initial load
    updateState();

    // Subscribe to changes
    return onSyncChange(updateState);
  }, []);

  // Queue operation wrapper
  const queueOperation = useCallback(
    async (
      table: string,
      operation: OperationType,
      data: Record<string, unknown>,
    ): Promise<string> => {
      const id = await queueOp(table, operation, data);
      // Update pending count
      const count = await getPendingCount();
      setPendingCount(count);
      return id;
    },
    [],
  );

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    const result = await syncAll();
    const count = await getPendingCount();
    setPendingCount(count);
    return result;
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    queueOperation,
    syncNow,
    justReconnected,
  };
}
