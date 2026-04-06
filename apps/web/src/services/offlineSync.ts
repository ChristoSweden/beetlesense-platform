// ─── Offline Sync Service ───
// Manages synchronization of offline-queued actions back to the server.
// Listens for online/offline events, replays actions with retry and conflict resolution.

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import {
  getPendingActions,
  clearAction,
  setLastSyncTime,
  type OfflineAction,
} from '@/lib/offlineStore';

// ─── Types ───

export type SyncStatus = 'idle' | 'offline' | 'syncing' | 'synced' | 'error';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  lastError: string | null;
  lastSyncTime: Date | null;
}

type SyncListener = (state: SyncState) => void;

// ─── Sync Manager ───

class OfflineSyncManager {
  private state: SyncState = {
    status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    lastError: null,
    lastSyncTime: null,
  };

  private listeners: SyncListener[] = [];
  private isSyncing = false;
  private autoSyncCleanup: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.enableAutoSync();
      // Refresh pending count on init
      this.refreshPendingCount();
    }
  }

  // ─── Public API ───

  getState(): SyncState {
    return { ...this.state };
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    // Immediately call with current state
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async syncNow(): Promise<{ synced: number; failed: number }> {
    return this.processQueue();
  }

  async refreshPendingCount(): Promise<number> {
    try {
      const actions = await getPendingActions();
      this.updateState({ pendingCount: actions.length });
      return actions.length;
    } catch {
      return 0;
    }
  }

  destroy(): void {
    if (this.autoSyncCleanup) {
      this.autoSyncCleanup();
      this.autoSyncCleanup = null;
    }
    this.listeners = [];
  }

  // ─── Auto-Sync on Reconnection ───

  private enableAutoSync(): void {
    if (this.autoSyncCleanup) return;

    const handleOnline = () => {
      this.updateState({ status: 'idle' });
      // Small delay to let the connection stabilize
      setTimeout(() => {
        this.processQueue().catch(() => {});
      }, 1000);
    };

    const handleOffline = () => {
      this.updateState({ status: 'offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    this.autoSyncCleanup = () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  // ─── Queue Processing ───

  private async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const actions = await getPendingActions();
      if (actions.length === 0) {
        this.updateState({ status: 'idle', pendingCount: 0 });
        return { synced: 0, failed: 0 };
      }

      // Resolve conflicts: last-write-wins for actions on the same entity
      const resolved = this.resolveConflicts(actions);

      this.updateState({
        status: 'syncing',
        pendingCount: resolved.length,
        syncedCount: 0,
        failedCount: 0,
      });

      // Process each action
      for (const action of resolved) {
        const success = await this.syncAction(action);

        if (success) {
          await clearAction(action.id);
          synced++;
        } else {
          failed++;
        }

        this.updateState({
          pendingCount: resolved.length - synced - failed,
          syncedCount: synced,
          failedCount: failed,
        });
      }

      // Clear conflicted actions that were superseded
      const resolvedIds = new Set(resolved.map((a) => a.id));
      const superseded = actions.filter((a) => !resolvedIds.has(a.id));
      for (const action of superseded) {
        await clearAction(action.id);
      }

      // Update sync time
      const now = new Date();
      await setLastSyncTime(now);

      this.updateState({
        status: failed > 0 ? 'error' : 'synced',
        lastSyncTime: now,
        lastError: failed > 0 ? `${failed} action(s) failed to sync` : null,
      });

      // Auto-dismiss "synced" status after 3 seconds
      if (failed === 0) {
        setTimeout(() => {
          if (this.state.status === 'synced') {
            this.updateState({ status: 'idle' });
          }
        }, 3000);
      }
    } catch (err) {
      this.updateState({
        status: 'error',
        lastError: err instanceof Error ? err.message : 'Sync failed',
      });
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }

  // ─── Single Action Sync ───

  private async syncAction(action: OfflineAction): Promise<boolean> {
    // In demo mode, pretend sync succeeded
    if (isDemo() || !isSupabaseConfigured) {
      return true;
    }

    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const success = await this.executeAction(action);
        if (success) return true;
      } catch {
        // Will retry
      }

      // Exponential backoff: 1s, 2s, 4s
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    return false;
  }

  private async executeAction(action: OfflineAction): Promise<boolean> {
    switch (action.type) {
      case 'photo_capture': {
        // Upload photo to storage, then create observation record
        if (action.imageData) {
          const blob = this.base64ToBlob(action.imageData);
          const path = `field-photos/${action.id}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('survey-data')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
          if (uploadError) return false;

          // Store observation record
          const { error } = await supabase.from('field_observations').upsert({
            id: action.id,
            type: 'photo',
            storage_path: path,
            latitude: action.lat ?? null,
            longitude: action.lng ?? null,
            metadata: action.payload,
            created_at: new Date(action.createdAt).toISOString(),
          });
          return !error;
        }
        return true;
      }

      case 'observation':
      case 'parcel_note':
      case 'voice_note': {
        const { error } = await supabase.from('field_observations').upsert({
          id: action.id,
          type: action.type,
          latitude: action.lat ?? null,
          longitude: action.lng ?? null,
          metadata: action.payload,
          created_at: new Date(action.createdAt).toISOString(),
        });
        return !error;
      }

      case 'tree_measurement': {
        const { error } = await supabase.from('field_observations').upsert({
          id: action.id,
          type: 'tree_measurement',
          latitude: action.lat ?? null,
          longitude: action.lng ?? null,
          metadata: action.payload,
          created_at: new Date(action.createdAt).toISOString(),
        });
        return !error;
      }

      default:
        console.warn(`Unknown offline action type: ${action.type}`);
        return true; // Clear unknown actions to avoid stuck queue
    }
  }

  // ─── Conflict Resolution ───

  /**
   * Last-write-wins: for actions targeting the same entity (same type + same payload.id),
   * keep only the most recent action.
   */
  private resolveConflicts(actions: OfflineAction[]): OfflineAction[] {
    const byKey = new Map<string, OfflineAction>();

    for (const action of actions) {
      const entityId = (action.payload.id as string) || action.id;
      const key = `${action.type}:${entityId}`;
      const existing = byKey.get(key);

      if (!existing || action.createdAt > existing.createdAt) {
        byKey.set(key, action);
      }
    }

    return Array.from(byKey.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  // ─── Helpers ───

  private updateState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.getState());
      } catch {
        // Listener errors should not break sync
      }
    }
  }

  private base64ToBlob(base64: string): Blob {
    // Strip data URL prefix if present
    const data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteString = atob(data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: 'image/jpeg' });
  }
}

// ─── Singleton Export ───

export const offlineSyncManager = new OfflineSyncManager();
