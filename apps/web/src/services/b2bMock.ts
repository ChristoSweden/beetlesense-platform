import { supabase } from '@/lib/supabase';

export interface B2BLog {
  id: string;
  partner: string;
  action: string;
  status: 'success' | 'failure';
  payload: any;
  timestamp: string;
}

export const b2bMock = {
  async connectPartner(partnerId: string): Promise<boolean> {
    // Simulate API handshake
    await new Promise(r => setTimeout(r, 1500));
    const success = Math.random() > 0.1;
    
    await this.logAction(partnerId, 'handshake', success ? 'success' : 'failure', { partnerId });
    return success;
  },

  async testConnection(partnerId: string): Promise<{ success: boolean; latency: number }> {
    const start = Date.now();
    await new Promise(r => setTimeout(r, 1000));
    const latency = Date.now() - start;
    const success = Math.random() > 0.05;
    
    await this.logAction(partnerId, 'ping', success ? 'success' : 'failure', { latency });
    return { success, latency };
  },

  async logAction(partner: string, action: string, status: B2BLog['status'], payload: any) {
    const log: B2BLog = {
      id: crypto.randomUUID(),
      partner,
      action,
      status,
      payload,
      timestamp: new Date().toISOString(),
    };
    
    // In a real app, we'd use .insert() into a 'b2b_logs' table.
    // For now, we'll use localStorage to keep it persistent for the demo.
    try {
      const logs = JSON.parse(localStorage.getItem('beetlesense-b2b-logs') || '[]');
      logs.unshift(log);
      localStorage.setItem('beetlesense-b2b-logs', JSON.stringify(logs.slice(0, 100)));
    } catch (err) {
      console.error('Failed to log B2B action', err);
    }
  },

  getLogs(): B2BLog[] {
    return JSON.parse(localStorage.getItem('beetlesense-b2b-logs') || '[]');
  }
};
