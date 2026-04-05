import { create } from 'zustand';

export type ApiKey = 'smhi' | 'skogsstyrelsen' | 'supabase' | 'copernicus' | 'artdatabanken' | 'gfw' | 'nasa' | 'effis';

export interface ApiStatus {
  status: 'online' | 'degraded' | 'offline';
  latency?: number;
  lastChecked: string;
}

interface ApiHealthState {
  services: Record<ApiKey, ApiStatus>;
  checkAll: () => Promise<void>;
  setServiceStatus: (key: ApiKey, status: ApiStatus['status']) => void;
}

export const useApiHealthStore = create<ApiHealthState>((set) => ({
  services: {
    smhi: { status: 'online', lastChecked: new Date().toISOString() },
    skogsstyrelsen: { status: 'online', lastChecked: new Date().toISOString() },
    supabase: { status: 'online', lastChecked: new Date().toISOString() },
    copernicus: { status: 'online', lastChecked: new Date().toISOString() },
    artdatabanken: { status: 'online', lastChecked: new Date().toISOString() },
    gfw: { status: 'online', lastChecked: new Date().toISOString() },
    nasa: { status: 'online', lastChecked: new Date().toISOString() },
    effis: { status: 'online', lastChecked: new Date().toISOString() },
  },

  setServiceStatus: (key, status) => {
    set((state) => ({
      services: {
        ...state.services,
        [key]: { ...state.services[key], status, lastChecked: new Date().toISOString() },
      },
    }));
  },

  checkAll: async () => {
    const checkService = async (key: ApiKey, url: string): Promise<[ApiKey, ApiStatus]> => {
      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, { method: 'HEAD', signal: controller.signal, mode: 'no-cors' });
        clearTimeout(timeoutId);
        
        const latency = Math.round(performance.now() - start);
        return [key, { status: response.type === 'opaque' || response.ok ? 'online' : 'degraded', latency, lastChecked: new Date().toISOString() }];
      } catch (err) {
        return [key, { status: 'offline', lastChecked: new Date().toISOString() }];
      }
    };

    const results = await Promise.all([
      checkService('smhi', 'https://opendata-download-metfcst.smhi.se/api/version/1.0/health.json'),
      checkService('skogsstyrelsen', 'https://geodpags.skogsstyrelsen.se/geoserver/wfs'),
      checkService('supabase', 'https://api.beetlesense.ai/rest/v1/'), // Use your Supabase URL
      checkService('copernicus', 'https://catalogue.dataspace.copernicus.eu/stac'),
      checkService('artdatabanken', 'https://api.artdatabanken.se/observations/v1/Observations'),
      checkService('gfw', 'https://data-api.globalforestwatch.org/'),
      checkService('nasa', 'https://cmr.earthdata.nasa.gov/stac/GEDI_L2B'),
      checkService('effis', 'https://effis.jrc.ec.europa.eu/'),
    ]);

    const newServices = Object.fromEntries(results) as Record<ApiKey, ApiStatus>;
    set({ services: newServices });
  },
}));

// Auto-check on load
if (typeof window !== 'undefined') {
  setTimeout(() => useApiHealthStore.getState().checkAll(), 1000);
  setInterval(() => useApiHealthStore.getState().checkAll(), 60000); // Every minute
}
