import { create } from 'zustand';

export type FusionMode = 'standard' | 'forest-pulse' | 'risk-flow' | 'temporal' | 'composite';

interface FusionState {
  mode: FusionMode;
  opacity: number;
  showHelp: boolean;

  setMode: (mode: FusionMode) => void;
  setOpacity: (opacity: number) => void;
  toggleHelp: () => void;
}

export const useFusionStore = create<FusionState>()((set) => ({
  mode: 'standard',
  opacity: 0.6,
  showHelp: false,

  setMode: (mode) => set({ mode }),
  setOpacity: (opacity) => set({ opacity }),
  toggleHelp: () => set((s) => ({ showHelp: !s.showHelp })),
}));
