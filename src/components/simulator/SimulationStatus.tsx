"use client";

import { useSimulationStore } from "@/simulation/state/simulation.store";

export default function SimulationStatus() {
  const status = useSimulationStore(
    (state) => state.status,
  );

  return (
    <div className="absolute bottom-5 left-5 z-20 rounded-xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />

        <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">
          Simulation
        </span>
      </div>

      <p className="mt-1 text-sm capitalize text-white">
        {status}
      </p>
    </div>
  );
}