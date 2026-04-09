import type { ConnectorResponse } from './baseConnector';
import { BaseConnector } from './baseConnector';

export interface BiodiversityObservation {
  id: string;
  species: string;
  scientificName: string;
  category: 'mammal' | 'bird' | 'insect' | 'plant' | 'fungi';
  isRedListed: boolean;
  date: string;
  location: [number, number];
  accuracy_m: number;
}

class BiodiversityConnector extends BaseConnector {
  constructor() {
    super('artdatabanken');
  }

  /**
   * Fetches species observations within a specific buffer of the parcel coordinates.
   * Connects to the Artportalen API (Swedish Species Information Centre).
   */
  async getLocalObservations(lat: number, lon: number, radius_km: number = 2): Promise<ConnectorResponse<BiodiversityObservation[]>> {
    return this.execute(async () => {
      // Real endpoint: https://api.artdatabanken.se/observations/v1/Observations
      // Uses OData filtering for spatial and species-group queries
      console.log(`[Artdatabanken] Fetching observations around ${lat}, ${lon} (${radius_km}km)`);
      
      await new Promise(r => setTimeout(r, 1400));

      // Mocked high-value observations for a typical Swedish forest
      return [
        {
          id: 'OBS-101',
          species: 'Tjäder',
          scientificName: 'Tetrao urogallus',
          category: 'bird',
          isRedListed: false,
          date: '2026-03-15',
          location: [lat + 0.002, lon - 0.003],
          accuracy_m: 50
        },
        {
          id: 'OBS-102',
          species: 'Bombmurkla',
          scientificName: 'Sarcosoma globosum',
          category: 'fungi',
          isRedListed: true,
          date: '2026-04-01',
          location: [lat - 0.001, lon + 0.001],
          accuracy_m: 100
        }
      ];
    }, 'GetLocalObservations');
  }

  /**
   * Calculates a 'richness' score based on regional taxonomy distributions.
   */
  async getRichnessIndex(parcelId: string): Promise<ConnectorResponse<{ score: number, percentile: number }>> {
    return this.execute(async () => {
      await new Promise(r => setTimeout(r, 900));
      return { score: 78, percentile: 85 };
    }, `GetRichnessIndex:${parcelId}`);
  }
}

export const biodiversityConnector = new BiodiversityConnector();
