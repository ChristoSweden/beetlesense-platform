import { useState, useEffect, useCallback, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { createElement } from 'react';

// ─── useNetworkStatus ───

interface NetworkStatus {
  isOnline: boolean;
  lastOnlineAt: Date | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null,
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastOnlineAt };
}

// ─── OfflineBanner ───

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return createElement(
    'div',
    {
      className:
        'fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 bg-amber/90 text-forest-950 text-xs font-semibold',
    },
    createElement(WifiOff, { size: 14 }),
    "You're offline \u2014 changes will sync when connected",
  );
}

// ─── useSyncQueue ───

interface QueueItem<T = unknown> {
  id: string;
  data: T;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}

interface UseSyncQueueReturn<T> {
  queue: QueueItem<T>[];
  pendingCount: number;
  isSyncing: boolean;
  add: (data: T) => void;
  remove: (id: string) => void;
  sync: (handler: (item: QueueItem<T>) => Promise<boolean>) => Promise<void>;
  clear: () => void;
}

export function useSyncQueue<T = unknown>(key: string): UseSyncQueueReturn<T> {
  const [queue, setQueue] = useState<QueueItem<T>[]>(() => {
    try {
      const stored = localStorage.getItem(`sync-queue-${key}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`sync-queue-${key}`, JSON.stringify(queue));
    } catch {
      // Storage full or unavailable
    }
  }, [queue, key]);

  const add = useCallback((data: T) => {
    const item: QueueItem<T> = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };
    setQueue((prev) => [...prev, item]);
  }, []);

  const remove = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => {
    setQueue([]);
  }, []);

  const sync = useCallback(
    async (handler: (item: QueueItem<T>) => Promise<boolean>) => {
      if (syncingRef.current || !navigator.onLine) return;
      syncingRef.current = true;
      setIsSyncing(true);

      try {
        const pending = queue.filter((item) => item.status !== 'syncing');

        for (const item of pending) {
          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'syncing' as const } : q)),
          );

          try {
            const success = await handler(item);
            if (success) {
              setQueue((prev) => prev.filter((q) => q.id !== item.id));
            } else {
              setQueue((prev) =>
                prev.map((q) =>
                  q.id === item.id
                    ? { ...q, status: 'failed' as const, retries: q.retries + 1 }
                    : q,
                ),
              );
            }
          } catch {
            setQueue((prev) =>
              prev.map((q) =>
                q.id === item.id
                  ? { ...q, status: 'failed' as const, retries: q.retries + 1 }
                  : q,
              ),
            );
          }
        }
      } finally {
        syncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [queue],
  );

  return {
    queue,
    pendingCount: queue.filter((q) => q.status === 'pending' || q.status === 'failed').length,
    isSyncing,
    add,
    remove,
    sync,
    clear,
  };
}
