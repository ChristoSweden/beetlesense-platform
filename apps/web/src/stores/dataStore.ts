import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS, DEMO_SURVEYS } from '@/lib/demoData';
import { syncQueue } from '@/services/syncQueue';
import { withTimeout } from '@/lib/withTimeout';

export interface Parcel {
  id: string;
  name: string;
  area_hectares: number;
  status: 'healthy' | 'at_risk' | 'infested' | 'unknown';
  last_survey: string | null;
  municipality: string;
  species_mix: { species: string; pct: number }[];
  elevation_m: number;
  soil_type: string;
  registered_at: string;
}


export interface Survey {
  id: string;
  parcel_id: string;
  name: string;
  status: string;
  modules: string[];
  priority?: string;
  created_at: string;
  updated_at: string;
  results_summary?: string | null;
}

interface DataState {
  parcels: Parcel[];
  surveys: Survey[];
  currentParcel: Parcel | null;
  lastFetched: number | null;
  isLoading: boolean;
  error: string | null;

  fetchParcels: () => Promise<void>;
  fetchParcelById: (id: string) => Promise<void>;
  fetchSurveys: (parcelId?: string) => Promise<void>;
  clearData: () => void;
  saveParcelOffline: (parcel: Partial<Parcel>) => void;
  saveSurveyOffline: (survey: Partial<Survey>) => void;
}


export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      parcels: [],
      surveys: [],
      currentParcel: null,
      lastFetched: null,
      isLoading: false,
      error: null,


      fetchParcels: async () => {
        set({ isLoading: true, error: null });
        try {
          if (isDemo() || !isSupabaseConfigured) {
            const mapped = DEMO_PARCELS.map(p => ({
              id: p.id,
              name: p.name,
              area_hectares: p.area_hectares,
              status: p.status as Parcel['status'],
              last_survey: p.last_survey,
              municipality: p.municipality,
              species_mix: p.species_mix || [],
              elevation_m: p.elevation_m || 0,
              soil_type: p.soil_type || 'Unknown',
              registered_at: p.registered_at || new Date().toISOString(),
            }));
            set({ parcels: mapped, isLoading: false, lastFetched: Date.now() });

          } else {
            const { data, error } = await withTimeout(
              supabase
                .from('parcels')
                .select('*')
                .order('name'),
              8000,
            );

            if (error) throw error;

            const mapped = (data || []).map(row => {
              const meta = (row.metadata as Record<string, unknown>) || {};
              return {
                id: row.id,
                name: row.name,
                area_hectares: row.area_ha,
                status: row.status || 'unknown',
                last_survey: row.updated_at,
                municipality: row.municipality || '',
                species_mix: meta.species_mix || [],
                elevation_m: meta.elevation_m || 0,
                soil_type: meta.soil_type || 'Unknown',
                registered_at: row.created_at || new Date().toISOString(),
              };
            });
            set({ parcels: mapped, isLoading: false, lastFetched: Date.now() });

          }
        } catch (err: unknown) {
          set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
        }
      },

      fetchParcelById: async (id: string) => {
        // Optimistically check cache first
        const cached = get().parcels.find(p => p.id === id);
        if (cached) set({ currentParcel: cached });

        set({ isLoading: true, error: null });
        try {
          if (isDemo() || !isSupabaseConfigured) {
            const demo = DEMO_PARCELS.find(p => p.id === id);
            if (demo) {
              const mapped = {
                id: demo.id,
                name: demo.name,
                area_hectares: demo.area_hectares,
                status: demo.status as Parcel['status'],
                last_survey: demo.last_survey,
                municipality: demo.municipality,
                species_mix: demo.species_mix || [],
                elevation_m: demo.elevation_m || 0,
                soil_type: demo.soil_type || 'Unknown',
                registered_at: demo.registered_at || new Date().toISOString(),
              };
              set({ currentParcel: mapped, isLoading: false });

            }
          } else {
            const { data, error } = await supabase
              .from('parcels')
              .select('*')
              .eq('id', id)
              .single();
            
            if (error) throw error;
            
            const meta = (data.metadata as Record<string, unknown>) || {};
            const mapped = {
              id: data.id,
              name: data.name,
              area_hectares: data.area_ha,
              status: data.status || 'unknown',
              last_survey: data.updated_at,
              municipality: data.municipality || '',
              species_mix: meta.species_mix || [],
              elevation_m: meta.elevation_m || 0,
              soil_type: meta.soil_type || 'Unknown',
              registered_at: data.created_at || new Date().toISOString(),
            };
            set({ currentParcel: mapped, isLoading: false });

          }
        } catch (err: any) {
          // If offline and not in cache, we'll have an error, but if it was in cache we still have it
          set({ error: err.message, isLoading: false });
        }
      },


      fetchSurveys: async (parcelId) => {
        set({ isLoading: true, error: null });
        try {
          if (isDemo() || !isSupabaseConfigured) {
            let filtered = DEMO_SURVEYS;
            if (parcelId) filtered = DEMO_SURVEYS.filter(s => s.parcel_id === parcelId);
            set({ surveys: filtered as Survey[], isLoading: false });
          } else {
            let query = supabase.from('surveys').select('*').order('created_at', { ascending: false });
            if (parcelId) query = query.eq('parcel_id', parcelId);
            
            const { data, error } = await query;
            if (error) throw error;
            
            set({ surveys: data || [], isLoading: false });
          }
        } catch (err: unknown) {
          set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
        }
      },

      clearData: () => set({ parcels: [], surveys: [], lastFetched: null }),
      saveParcelOffline: (parcel) => {
        // Optimistically update typical fields
        set((state) => ({
          parcels: state.parcels.map(p => p.id === parcel.id ? { ...p, ...parcel } : p)
        }));
        // Queue it for sync
        syncQueue.enqueue('upsert_parcel', 'parcels', parcel);
      },
      saveSurveyOffline: (survey) => {
        if (!survey.id) {
            survey.id = crypto.randomUUID();
        }
        set((state) => ({
            surveys: [...state.surveys.filter(s => s.id !== survey.id), survey as Survey]
        }));
        syncQueue.enqueue('upsert_survey', 'surveys', survey);
      },
    }),
    {
      name: 'beetlesense-data-storage',
      partialize: (state) => ({ 
        parcels: state.parcels, 
        surveys: state.surveys,
        lastFetched: state.lastFetched 
      }),
    }
  )
);
