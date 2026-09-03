"use client";

import { useSimulationStore } from "@/simulation/state/simulation.store";

import {
  moveBackward,
  moveForward,
  stopRobot,
  turnLeft,
  turnRight,
} from "@/simulation/robot/robotCommands";

export default function SimulatorToolbar() {
  const debugPhysics = useSimulationStore(
    (state) => state.debugPhysics,
  );

  const toggleDebugPhysics = useSimulationStore(
    (state) => state.toggleDebugPhysics,
  );

  const resetSimulation = useSimulationStore(
    (state) => state.resetSimulation,
  );

  return (
    <div className="absolute left-1/2 top-5 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/70 p-2 backdrop-blur-md">
      <button
        type="button"
        onMouseDown={moveForward}
        onMouseUp={stopRobot}
        onMouseLeave={stopRobot}
        className="rounded-xl bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
      >
        Forward
      </button>

      <button
        type="button"
        onMouseDown={moveBackward}
        onMouseUp={stopRobot}
        onMouseLeave={stopRobot}
        className="rounded-xl bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
      >
        Backward
      </button>

      <button
        type="button"
        onMouseDown={turnLeft}
        onMouseUp={stopRobot}
        onMouseLeave={stopRobot}
        className="rounded-xl bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
      >
        Left
      </button>

      <button
        type="button"
        onMouseDown={turnRight}
        onMouseUp={stopRobot}
        onMouseLeave={stopRobot}
        className="rounded-xl bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
      >
        Right
      </button>

      <button
        type="button"
        onClick={stopRobot}
        className="rounded-xl bg-red-500/80 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-500"
      >
        Stop
      </button>

      <div className="mx-1 h-7 w-px bg-white/10" />

      <button
        type="button"
        onClick={toggleDebugPhysics}
        className={`rounded-xl px-4 py-2 text-xs font-medium transition ${
          debugPhysics
            ? "bg-blue-500 text-white"
            : "bg-white/10 text-neutral-300 hover:bg-white/20"
        }`}
      >
        Physics Debug
      </button>

      <button
        type="button"
        onClick={() => {
          stopRobot();
          resetSimulation();
        }}
        className="rounded-xl bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-neutral-200"
      >
        Reset
      </button>
    </div>
  );
}