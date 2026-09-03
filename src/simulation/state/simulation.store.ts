import { create } from "zustand";

import type {
  SimulationState,
  SimulationStatus,
} from "@/simulation/types/simulation.types";

export const useSimulationStore = create<SimulationState>((set) => ({
  status: "running",
  debugPhysics: false,
  resetVersion: 0,

  setStatus: (status: SimulationStatus) => {
    set({ status });
  },

  toggleDebugPhysics: () => {
    set((state) => ({
      debugPhysics: !state.debugPhysics,
    }));
  },

  resetSimulation: () => {
    set((state) => ({
      resetVersion: state.resetVersion + 1,
      status: "running",
    }));
  },
}));