import { useState, useEffect, useCallback, useRef } from 'react';

export interface PendingUpload {
  id: string;
  blob: ArrayBuffer;
  fileName: string;
  mimeType: string;
  surveyId: string | null;
  parcelId: string | null;
  gps: { latitude: number; longitude: number } | null;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'uploading' | 'failed';
}

const DB_NAME = 'beetlesense-uploads';
const DB_VERSION = 1;
const STORE_NAME = 'pending-uploads';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllUploads(): Promise<PendingUpload[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putUpload(upload: PendingUpload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(upload);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteUpload(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

interface UseOfflineUploadReturn {
  queuedCount: number;
  pendingUploads: PendingUpload[];
  isSyncing: boolean;
  addToQueue: (params: {
    blob: Blob;
    fileName: string;
    surveyId?: string;
    parcelId?: string;
    gps?: { latitude: number; longitude: number } | null;
  }) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  syncPending: () => Promise<void>;
  retryFailed: () => Promise<void>;
}

export function useOfflineUpload(
  uploadFn?: (upload: PendingUpload) => Promise<boolean>,
): UseOfflineUploadReturn {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Load queue on mount
  useEffect(() => {
    getAllUploads().then(setPendingUploads).catch(console.error);
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (pendingUploads.length > 0) {
        syncPending();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  });

  const addToQueue = useCallback(
    async (params: {
      blob: Blob;
      fileName: string;
      surveyId?: string;
      parcelId?: string;
      gps?: { latitude: number; longitude: number } | null;
    }) => {
      const buffer = await params.blob.arrayBuffer();
      const upload: PendingUpload = {
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        blob: buffer,
        fileName: params.fileName,
        mimeType: params.blob.type || 'image/jpeg',
        surveyId: params.surveyId ?? null,
        parcelId: params.parcelId ?? null,
        gps: params.gps ?? null,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      };

      await putUpload(upload);
      setPendingUploads((prev) => [...prev, upload]);

      // Try immediate upload if online
      if (navigator.onLine && uploadFn) {
        syncPending();
      }
    },
    [uploadFn],
  );

  const removeFromQueue = useCallback(async (id: string) => {
    await deleteUpload(id);
    setPendingUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const syncPending = useCallback(async () => {
    if (syncingRef.current || !uploadFn || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const uploads = await getAllUploads();
      const pending = uploads.filter((u) => u.status !== 'uploading');

      for (const upload of pending) {
        // Mark as uploading
        upload.status = 'uploading';
        await putUpload(upload);
        setPendingUploads((prev) =>
          prev.map((u) => (u.id === upload.id ? { ...u, status: 'uploading' as const } : u)),
        );

        try {
          const success = await uploadFn(upload);
          if (success) {
            await deleteUpload(upload.id);
            setPendingUploads((prev) => prev.filter((u) => u.id !== upload.id));
          } else {
            upload.status = 'failed';
            upload.retryCount += 1;
            await putUpload(upload);
            setPendingUploads((prev) =>
              prev.map((u) =>
                u.id === upload.id
                  ? { ...u, status: 'failed' as const, retryCount: u.retryCount + 1 }
                  : u,
              ),
            );
          }
        } catch {
          upload.status = 'failed';
          upload.retryCount += 1;
          await putUpload(upload);
          setPendingUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? { ...u, status: 'failed' as const, retryCount: u.retryCount + 1 }
                : u,
            ),
          );
        }
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [uploadFn]);

  const retryFailed = useCallback(async () => {
    const uploads = await getAllUploads();
    for (const u of uploads) {
      if (u.status === 'failed') {
        u.status = 'pending';
        await putUpload(u);
      }
    }
    setPendingUploads((prev) =>
      prev.map((u) => (u.status === 'failed' ? { ...u, status: 'pending' as const } : u)),
    );
    await syncPending();
  }, [syncPending]);

  return {
    queuedCount: pendingUploads.length,
    pendingUploads,
    isSyncing,
    addToQueue,
    removeFromQueue,
    syncPending,
    retryFailed,
  };
}
