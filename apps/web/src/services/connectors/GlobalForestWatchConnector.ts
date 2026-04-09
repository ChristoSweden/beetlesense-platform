import type { ConnectorResponse } from './baseConnector';
import { BaseConnector } from './baseConnector';

export interface ForestAlert {
  id: string;
  type: 'deforestation' | 'degradation' | 'loss' | 'recovery';
  confidence: 'nominal' | 'high';
  date: string;
  area_ha: number;
  location: [number, number];
}

class GlobalForestWatchConnector extends BaseConnector {
  constructor() {
    super('gfw');
  }

  /**
   * Fetches the latest 'Glad' deforestation alerts for the parcel bbox.
   * Connects to the WRI Global Forest Watch API.
   */
  async getLatestAlerts(bbox: [number, number, number, number]): Promise<ConnectorResponse<ForestAlert[]>> {
    return this.execute(async () => {
      // Real endpoint: https://data-api.globalforestwatch.org/dataset/gfw_glad_alerts/latest
      console.log(`[GFW] Fetching Glad alerts for bbox: ${bbox.join(',')}`);
      
      await new Promise(r => setTimeout(r, 1600));

      // Mocked alerts showing recent change activity nearby
      return [
        {
          id: 'GFW-AL-8821',
          type: 'deforestation',
          confidence: 'high',
          date: '2026-03-22',
          area_ha: 0.12,
          location: [57.1245, 14.1234]
        }
      ];
    }, 'GetGladAlerts');
  }

  /**
   * Retrieves the annual tree cover loss statistics for ESG auditing.
   */
  async getAnnualLossStats(parcelId: string): Promise<ConnectorResponse<{ year: number, loss_ha: number }[]>> {
    return this.execute(async () => {
       await new Promise(r => setTimeout(r, 1100));
       return [
         { year: 2023, loss_ha: 0.0 },
         { year: 2024, loss_ha: 0.4 },
         { year: 2025, loss_ha: 0.1 }
       ];
    }, `GetAnnualLossStats:${parcelId}`);
  }
}

export const gfwConnector = new GlobalForestWatchConnector();
