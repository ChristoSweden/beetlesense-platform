import { supabase } from '@/lib/supabase';

export interface SyncOperation {
  id: string;
  type: 'upsert_survey' | 'upsert_parcel' | 'upsert_observation';
  table: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'failed' | 'completed';
}

class SyncQueueService {
  private queue: SyncOperation[] = [];
  private isProcessing = false;
  private STORAGE_KEY = 'beetlesense-sync-queue';

  constructor() {
    this.loadQueue();
    // Re-sync when coming back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
    }
  }

  private loadQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          this.queue = JSON.parse(stored);
        }
      }
    } catch (err) {
      console.warn('Failed to load sync queue', err);
    }
  }

  private saveQueue() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue.filter(op => op.status !== 'completed')));
      }
    } catch (err) {
      console.warn('Failed to save sync queue', err);
    }
  }

  enqueue(type: SyncOperation['type'], table: string, payload: any) {
    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      type,
      table,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
    };
    
    this.queue.push(operation);
    this.saveQueue();
    
    // Attempt processing immediately in case we are online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    
    this.isProcessing = true;
    
    // Process only pending tasks
    const pending = this.queue.filter(op => op.status === 'pending');
    
    for (const op of pending) {
      try {
        const { error } = await supabase.from(op.table).upsert(op.payload);
        if (error) throw error;
        
        op.status = 'completed';
      } catch (err) {
        op.retryCount += 1;
        console.warn(`Sync failed for operation ${op.id}`, err);
        // We'll keep it pending for the next online event
      }
    }
    
    // Clean up completed ops
    this.queue = this.queue.filter(op => op.status !== 'completed');
    this.saveQueue();
    this.isProcessing = false;
  }
}

export const syncQueue = new SyncQueueService();
