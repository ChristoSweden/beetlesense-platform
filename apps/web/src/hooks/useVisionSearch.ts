import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  useVisionStore,
  type IdentificationResult,
  type HistoryEntry,
  type OfflineQueueItem,
} from '@/stores/visionStore';
import type { CapturedPhoto } from '@/components/capture/useCamera';

const VISION_FUNCTION_URL = 'vision-identify';

/**
 * Hook that manages the full vision search flow:
 *   capture -> upload -> infer -> display results
 *
 * Handles loading/error states and offline support via IndexedDB queue.
 */
export function useVisionSearch() {
  const {
    currentResult,
    currentThumbnail,
    isIdentifying,
    error,
    offlineQueue,
    isSyncing,
    setCurrentResult,
    clearCurrentResult,
    setIdentifying,
    setError,
    addToHistory,
    addToOfflineQueue,
    removeFromOfflineQueue,
    updateOfflineQueueItem,
    setSyncing,
    pendingOfflineCount,
  } = useVisionStore();

  const abortRef = useRef<AbortController | null>(null);

  /**
   * Convert a Blob to base64 data URL.
   */
  const blobToBase64 = useCallback(async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  /**
   * Send an identification request to the edge function.
   */
  const identifyRemote = useCallback(
    async (
      imageBase64: string,
      gps: { latitude: number; longitude: number } | null,
      _signal?: AbortSignal,
    ): Promise<IdentificationResult> => {
      const { data, error: invokeError } = await supabase.functions.invoke(VISION_FUNCTION_URL, {
        body: {
          image: imageBase64,
          gps: gps ?? undefined,
          task: 'multi',
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Identification request failed');
      }

      if (!data?.data) {
        throw new Error('Invalid response from identification service');
      }

      return data.data as IdentificationResult;
    },
    [],
  );

  /**
   * Identify a captured photo — main entry point.
   */
  const identify = useCallback(
    async (photo: CapturedPhoto): Promise<IdentificationResult | null> => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIdentifying(true);

      try {
        const imageBase64 = await blobToBase64(photo.blob);
        const gps = photo.gps
          ? { latitude: photo.gps.latitude, longitude: photo.gps.longitude }
          : null;

        // Check if offline
        if (!navigator.onLine) {
          const queueItem: OfflineQueueItem = {
            id: `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            imageBase64,
            gps,
            timestamp: photo.timestamp,
            status: 'pending',
            retryCount: 0,
          };
          addToOfflineQueue(queueItem);
          setError('You are offline. Identification has been queued and will process when back online.');
          return null;
        }

        const result = await identifyRemote(imageBase64, gps, abortRef.current.signal);

        // Save to store
        setCurrentResult(result, photo.thumbnailUrl);

        // Add to history
        const historyEntry: HistoryEntry = {
          id: result.identification_id,
          result,
          thumbnailUrl: photo.thumbnailUrl,
          gps,
          timestamp: photo.timestamp,
        };
        addToHistory(historyEntry);

        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return null;
        }

        const message = err instanceof Error ? err.message : 'Identification failed';

        // If network error, queue for offline
        if (
          message.includes('fetch') ||
          message.includes('network') ||
          message.includes('Failed to fetch')
        ) {
          const imageBase64 = await blobToBase64(photo.blob);
          const gps = photo.gps
            ? { latitude: photo.gps.latitude, longitude: photo.gps.longitude }
            : null;

          const queueItem: OfflineQueueItem = {
            id: `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            imageBase64,
            gps,
            timestamp: photo.timestamp,
            status: 'pending',
            retryCount: 0,
          };
          addToOfflineQueue(queueItem);
          setError('Network error. Identification queued for when you are back online.');
        } else {
          setError(message);
        }

        return null;
      }
    },
    [blobToBase64, identifyRemote, setIdentifying, setCurrentResult, setError, addToHistory, addToOfflineQueue],
  );

  /**
   * Process offline queue — call when back online.
   */
  const syncOfflineQueue = useCallback(async () => {
    const pending = offlineQueue.filter((q) => q.status === 'pending' || q.status === 'failed');
    if (pending.length === 0 || isSyncing) return;

    setSyncing(true);

    for (const item of pending) {
      updateOfflineQueueItem(item.id, { status: 'processing' });

      try {
        const result = await identifyRemote(item.imageBase64, item.gps);

        // Add to history
        const historyEntry: HistoryEntry = {
          id: result.identification_id,
          result,
          thumbnailUrl: item.imageBase64, // Use base64 as thumbnail fallback
          gps: item.gps,
          timestamp: item.timestamp,
        };
        addToHistory(historyEntry);
        removeFromOfflineQueue(item.id);
      } catch {
        const newRetry = item.retryCount + 1;
        if (newRetry >= 3) {
          updateOfflineQueueItem(item.id, { status: 'failed', retryCount: newRetry });
        } else {
          updateOfflineQueueItem(item.id, { status: 'pending', retryCount: newRetry });
        }
      }
    }

    setSyncing(false);
  }, [offlineQueue, isSyncing, identifyRemote, addToHistory, removeFromOfflineQueue, updateOfflineQueueItem, setSyncing]);

  /**
   * Cancel any in-flight identification.
   */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIdentifying(false);
  }, [setIdentifying]);

  return {
    // State
    currentResult,
    currentThumbnail,
    isIdentifying,
    error,
    pendingOfflineCount: pendingOfflineCount(),

    // Actions
    identify,
    clearCurrentResult,
    cancel,
    syncOfflineQueue,
  };
}
