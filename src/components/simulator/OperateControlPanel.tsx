"use client";

import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { behaviorRunner } from "@/behaviors/activeBehaviorRunner";
import type {
  BehaviorSnapshot,
  RobotTelemetry,
} from "@/behaviors/behavior.types";
import { challengeEngine } from "@/challenges/activeChallengeEngine";
import type { ChallengeDefinition } from "@/challenges/challenge.types";
import { robotAdapter } from "@/simulation/robot/activeRobotAdapter";
import { ManualDriveController } from "@/simulation/controls/ManualDriveController";
import type { ManualDriveDirection } from "@/simulation/controls/ManualDriveController";
import {
  moveBackward,
  moveForward,
  stopRobot,
  turnLeft,
  turnRight,
} from "@/simulation/robot/robotCommands";
import { useSimulationStore } from "@/simulation/state/simulation.store";

const TELEMETRY_INTERVAL_MS = 400;

type OperateControlPanelProps = {
  targetDefinitions: readonly ChallengeDefinition[];
  selectedTargetId: string;
  onSelectTarget(targetId: string): void;
};

export default function OperateControlPanel({
  targetDefinitions,
  selectedTargetId,
  onSelectTarget,
}: OperateControlPanelProps) {
  const [snapshot, setSnapshot] = useState<BehaviorSnapshot>(
    behaviorRunner.snapshot,
  );
  const [telemetry, setTelemetry] = useState<RobotTelemetry | null>(null);
  const debugPhysics = useSimulationStore((state) => state.debugPhysics);
  const toggleDebugPhysics = useSimulationStore(
    (state) => state.toggleDebugPhysics,
  );
  const resetSimulation = useSimulationStore(
    (state) => state.resetSimulation,
  );
  const manualDrive = useMemo(
    () =>
      new ManualDriveController({
        forward: moveForward,
        backward: moveBackward,
        left: turnLeft,
        right: turnRight,
        stop: stopRobot,
      }),
    [],
  );

  useEffect(() => {
    const unsubscribe = behaviorRunner.subscribe(setSnapshot);
    let active = true;

    const pollTelemetry = async () => {
      const [distance, bumped, odometry] = await Promise.all([
        robotAdapter.readDistanceSensor(),
        robotAdapter.readBumperSensor(),
        robotAdapter.readOdometry(),
      ]);

      if (active) {
        setTelemetry({ distance, bumped, odometry });
      }
    };

    void pollTelemetry();
    const interval = setInterval(() => {
      void pollTelemetry();
    }, TELEMETRY_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      manualDrive.handleKeyDown(event, true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      manualDrive.handleKeyUp(event, true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      manualDrive.stop();
    };
  }, [manualDrive]);

  const startPointerDrive = (
    event: ReactPointerEvent<HTMLButtonElement>,
    direction: ManualDriveDirection,
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    manualDrive.start(direction);
  };

  const stopPointerDrive = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    manualDrive.stop();
  };

  const reset = () => {
    manualDrive.stop();
    challengeEngine.reset();
    resetSimulation();
  };

  const startBehavior = () => {
    manualDrive.stop();
    if (challengeEngine.snapshot.status === "running") {
      challengeEngine.reset();
    }
    behaviorRunner.start();
  };

  const robotStatus =
    snapshot.status === "running"
      ? "Running"
      : snapshot.status === "paused"
        ? "Paused"
        : snapshot.status === "error"
          ? "Error"
          : "Ready";
  const usesSelectedTarget = snapshot.definition.kind === "reach-target";
  const returnsHome = snapshot.definition.kind === "return-home";

  return (
    <aside className="min-h-0 overflow-y-auto border-b border-white/10 bg-[#111722] p-4 md:border-r md:border-b-0">
      <div className="mx-auto max-w-sm md:mx-0">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-neutral-500 uppercase">
          Control Panel
        </p>

        <label className="mt-4 block text-xs font-medium text-neutral-300">
          Behavior
          <select
            value={snapshot.definition.id}
            onChange={(event) =>
              behaviorRunner.selectBehavior(event.target.value)
            }
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-400"
          >
            {behaviorRunner.definitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.title}
              </option>
            ))}
          </select>
        </label>

        <p className="mt-2 min-h-10 text-[11px] leading-5 text-neutral-400">
          {snapshot.definition.description}
        </p>

        <label
          className={`mt-3 block text-xs font-medium ${usesSelectedTarget ? "text-neutral-300" : "text-neutral-500"}`}
        >
          Target
          <select
            value={returnsHome ? "home" : selectedTargetId}
            disabled={!usesSelectedTarget}
            onChange={(event) => onSelectTarget(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {returnsHome ? (
              <option value="home">Home / Spawn</option>
            ) : (
              targetDefinitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.title}
                </option>
              ))
            )}
          </select>
        </label>

        {!usesSelectedTarget ? (
          <p className="mt-1.5 text-[10px] leading-4 text-neutral-500">
            {returnsHome
              ? "Return Home always uses the robot spawn point."
              : "This behavior does not use a destination target."}
          </p>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={startBehavior}
            disabled={snapshot.status === "running" || snapshot.status === "paused"}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start
          </button>
          {snapshot.status === "paused" ? (
            <button
              type="button"
              onClick={() => behaviorRunner.resume()}
              className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400"
            >
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={() => behaviorRunner.pause()}
              disabled={snapshot.status !== "running"}
              className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={() => behaviorRunner.stop()}
            disabled={snapshot.status === "idle"}
            className="rounded-lg bg-red-500/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-neutral-200"
          >
            Reset
          </button>
        </div>

        <section className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-end justify-between gap-3">
            <p className="text-xs font-medium text-neutral-200">
              Manual Drive
            </p>
            <p className="text-[10px] text-neutral-500">
              WASD / Arrow Keys
            </p>
          </div>

          <div className="mx-auto mt-3 grid w-32 grid-cols-3 gap-1.5">
            <DriveButton
              label="Drive forward"
              className="col-start-2"
              onPointerDown={(event) =>
                startPointerDrive(event, "forward")
              }
              onPointerUp={stopPointerDrive}
              onPointerCancel={stopPointerDrive}
            >
              ↑
            </DriveButton>
            <DriveButton
              label="Turn left"
              onPointerDown={(event) => startPointerDrive(event, "left")}
              onPointerUp={stopPointerDrive}
              onPointerCancel={stopPointerDrive}
            >
              ←
            </DriveButton>
            <DriveButton
              label="Stop manual drive"
              stop
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                manualDrive.stop();
              }}
              onPointerUp={stopPointerDrive}
              onPointerCancel={stopPointerDrive}
            >
              ■
            </DriveButton>
            <DriveButton
              label="Turn right"
              onPointerDown={(event) => startPointerDrive(event, "right")}
              onPointerUp={stopPointerDrive}
              onPointerCancel={stopPointerDrive}
            >
              →
            </DriveButton>
            <DriveButton
              label="Drive backward"
              className="col-start-2"
              onPointerDown={(event) =>
                startPointerDrive(event, "backward")
              }
              onPointerUp={stopPointerDrive}
              onPointerCancel={stopPointerDrive}
            >
              ↓
            </DriveButton>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] tracking-[0.16em] text-neutral-500 uppercase">
              Robot
            </span>
            <span className="flex items-center gap-1.5 text-xs text-neutral-200">
              <span
                className={`h-2 w-2 rounded-full ${snapshot.status === "error" ? "bg-red-400" : "bg-emerald-400"}`}
              />
              Online · {robotStatus}
            </span>
          </div>
          {snapshot.error ? (
            <p className="mt-2 text-[11px] text-red-300">{snapshot.error}</p>
          ) : null}
          {snapshot.detail ? (
            <p className="mt-2 text-[11px] text-blue-300">
              {snapshot.detail}
            </p>
          ) : null}
        </section>

        <section className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
          <p className="text-[10px] tracking-[0.16em] text-neutral-500 uppercase">
            Sensors
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-neutral-500">Distance</dt>
            <dd className="text-right font-mono text-neutral-200">
              {telemetry ? `${telemetry.distance.toFixed(2)} m` : "—"}
            </dd>
            <dt className="text-neutral-500">Bumper</dt>
            <dd className="text-right font-mono text-neutral-200">
              {telemetry ? (telemetry.bumped ? "Pressed" : "Clear") : "—"}
            </dd>
            <dt className="text-neutral-500">X / Z</dt>
            <dd className="text-right font-mono text-neutral-200">
              {telemetry
                ? `${telemetry.odometry.x.toFixed(2)} / ${telemetry.odometry.z.toFixed(2)} m`
                : "—"}
            </dd>
            <dt className="text-neutral-500">Heading</dt>
            <dd className="text-right font-mono text-neutral-200">
              {telemetry
                ? `${telemetry.odometry.heading.toFixed(2)} rad`
                : "—"}
            </dd>
          </dl>
        </section>

        <button
          type="button"
          onClick={toggleDebugPhysics}
          className={`mt-3 w-full rounded-lg px-3 py-2 text-xs font-medium transition ${debugPhysics ? "bg-blue-500 text-white" : "bg-white/10 text-neutral-300 hover:bg-white/20"}`}
        >
          Physics Debug
        </button>
      </div>
    </aside>
  );
}

type DriveButtonProps = {
  label: string;
  children: string;
  className?: string;
  stop?: boolean;
  onPointerDown(event: ReactPointerEvent<HTMLButtonElement>): void;
  onPointerUp(event: ReactPointerEvent<HTMLButtonElement>): void;
  onPointerCancel(event: ReactPointerEvent<HTMLButtonElement>): void;
};

function DriveButton({
  label,
  children,
  className = "",
  stop = false,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}: DriveButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={`touch-none select-none rounded-lg border px-2 py-2 text-base font-semibold transition active:scale-95 ${stop ? "border-red-400/20 bg-red-500/15 text-red-300 hover:bg-red-500/25" : "border-white/10 bg-white/10 text-white hover:bg-white/20"} ${className}`}
    >
      {children}
    </button>
  );
}
