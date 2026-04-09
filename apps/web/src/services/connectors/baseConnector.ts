import type { ApiKey } from '../apiHealthService';
import { useApiHealthStore } from '../apiHealthService';

export interface ConnectorResponse<T> {
  data: T | null;
  status: 'online' | 'degraded' | 'offline';
  error?: string;
  latency?: number;
}

export abstract class BaseConnector {
  constructor(protected serviceKey: ApiKey) {}

  protected async execute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<ConnectorResponse<T>> {
    const start = performance.now();
    try {
      const data = await operation();
      const latency = Math.round(performance.now() - start);
      
      useApiHealthStore.getState().setServiceStatus(this.serviceKey, 'online');
      
      return { data, status: 'online', latency };
    } catch (err: any) {
      console.error(`[${this.serviceKey}] ${context} failed:`, err);
      useApiHealthStore.getState().setServiceStatus(this.serviceKey, 'degraded');
      
      return { 
        data: null, 
        status: 'degraded', 
        error: err.message || 'Unknown error occurred' 
      };
    }
  }
}
