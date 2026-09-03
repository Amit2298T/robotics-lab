export type SimulationStatus = "idle" | "running" | "paused";

export type SimulationState = {
  status: SimulationStatus;
  debugPhysics: boolean;
  resetVersion: number;

  setStatus: (status: SimulationStatus) => void;
  toggleDebugPhysics: () => void;
  resetSimulation: () => void;
};