import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MapLayer = 'parcels' | 'ndvi' | 'risk' | 'drone-paths' | 'alerts' | 'satellite';

interface MapState {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
  selectedParcelId: string | null;
  visibleLayers: MapLayer[];

  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setBearing: (bearing: number) => void;
  setPitch: (pitch: number) => void;
  setView: (center: [number, number], zoom: number) => void;
  selectParcel: (id: string | null) => void;
  toggleLayer: (layer: MapLayer) => void;
  setVisibleLayers: (layers: MapLayer[]) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      // Default: centered on Småland, Sweden
      center: [15.0, 57.2],
      zoom: 8,
      bearing: 0,
      pitch: 0,
      selectedParcelId: null,
      visibleLayers: ['parcels'] as MapLayer[],

      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setBearing: (bearing) => set({ bearing }),
      setPitch: (pitch) => set({ pitch }),
      setView: (center, zoom) => set({ center, zoom }),
      selectParcel: (id) => set({ selectedParcelId: id }),
      toggleLayer: (layer) =>
        set((state) => ({
          visibleLayers: state.visibleLayers.includes(layer)
            ? state.visibleLayers.filter((l) => l !== layer)
            : [...state.visibleLayers, layer],
        })),
      setVisibleLayers: (layers) => set({ visibleLayers: layers }),
    }),
    {
      name: 'beetlesense-map',
      partialize: (state) => ({
        center: state.center,
        zoom: state.zoom,
        bearing: state.bearing,
        pitch: state.pitch,
        visibleLayers: state.visibleLayers,
      }),
    },
  ),
);
