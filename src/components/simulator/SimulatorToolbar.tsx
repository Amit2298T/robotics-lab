"use client";

import {
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  CommandCancelledError,
  type RobotOperation,
} from "@/simulation/commands/CommandRunner";
import { challengeEngine } from "@/challenges/activeChallengeEngine";
import { commandRunner } from "@/simulation/commands/activeCommandRunner";
import { programRuntime } from "@/runtime/activeProgramRuntime";
import { behaviorRunner } from "@/behaviors/activeBehaviorRunner";
import { useSimulationStore } from "@/simulation/state/simulation.store";

import {
  moveBackward,
  moveForward,
  stopRobot,
  turnLeft,
  turnRight,
} from "@/simulation/robot/robotCommands";

const demoSequence: readonly RobotOperation[] = [
  { type: "FORWARD", durationMs: 1_000 },
  { type: "TURN_LEFT", durationMs: 600 },
  { type: "FORWARD", durationMs: 1_000 },
  { type: "STOP" },
];

export default function SimulatorToolbar() {
  const [sequenceStatus, setSequenceStatus] = useState<
    "idle" | "running"
  >("idle");

  const debugPhysics = useSimulationStore(
    (state) => state.debugPhysics,
  );

  const toggleDebugPhysics = useSimulationStore(
    (state) => state.toggleDebugPhysics,
  );

  const resetSimulation = useSimulationStore(
    (state) => state.resetSimulation,
  );

  useEffect(() => {
    return () => {
      behaviorRunner.stop();
      commandRunner.cancel();
    };
  }, []);

  const runDemo = async () => {
    if (sequenceStatus === "running") {
      return;
    }

    if (challengeEngine.snapshot.status === "running") {
      challengeEngine.reset();
    }

    behaviorRunner.stop();

    const programOwnedRunner = programRuntime.stop();

    if (!programOwnedRunner) {
      commandRunner.cancel();
    }

    setSequenceStatus("running");

    try {
      await commandRunner.run(demoSequence);
    } catch (error) {
      if (!(error instanceof CommandCancelledError)) {
        console.error("Demo sequence failed.", error);
      }
    } finally {
      setSequenceStatus("idle");
    }
  };

  const startManualControl = (
    event: ReactPointerEvent<HTMLButtonElement>,
    command: () => void,
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (challengeEngine.snapshot.status === "running") {
      challengeEngine.reset();
    }

    command();
  };

  const stopManualControl = () => {
    stopRobot();
  };

  const stopFromToolbar = () => {
    if (challengeEngine.snapshot.status === "running") {
      challengeEngine.reset();
    }

    stopRobot();
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onPointerDown={(event) => startManualControl(event, moveForward)}
        onPointerUp={stopManualControl}
        onPointerCancel={stopManualControl}
        className="touch-none select-none rounded-xl bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
      >
        Forward
      </button>

      <button
        type="button"
        onPointerDown={(event) => startManualControl(event, moveBackward)}
        onPointerUp={stopManualControl}
        onPointerCancel={stopManualControl}
        className="touch-none select-none rounded-xl bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
      >
        Backward
      </button>

      <button
        type="button"
        onPointerDown={(event) => startManualControl(event, turnLeft)}
        onPointerUp={stopManualControl}
        onPointerCancel={stopManualControl}
        className="touch-none select-none rounded-xl bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
      >
        Left
      </button>

      <button
        type="button"
        onPointerDown={(event) => startManualControl(event, turnRight)}
        onPointerUp={stopManualControl}
        onPointerCancel={stopManualControl}
        className="touch-none select-none rounded-xl bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
      >
        Right
      </button>

      <button
        type="button"
        onClick={stopFromToolbar}
        className="rounded-xl bg-red-500/80 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-500"
      >
        Stop
      </button>

      <button
        type="button"
        onClick={runDemo}
        disabled={sequenceStatus === "running"}
        className="rounded-xl bg-emerald-500/80 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sequenceStatus === "running" ? "Running…" : "Run Demo"}
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
          challengeEngine.reset();
          resetSimulation();
        }}
        className="rounded-xl bg-white px-4 py-2 text-xs font-medium text-black transition hover:bg-neutral-200"
      >
        Reset
      </button>
    </div>
  );
}
