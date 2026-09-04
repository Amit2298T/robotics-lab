"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { behaviorRunner } from "@/behaviors/activeBehaviorRunner";
import { challengeEngine } from "@/challenges/activeChallengeEngine";
import type { ChallengeSnapshot } from "@/challenges/challenge.types";
import { challengeProgressStore } from "@/challenges/progress/activeChallengeProgress";
import type { ChallengeProgress } from "@/challenges/progress/challengeProgress.types";
import { programRuntime } from "@/runtime/activeProgramRuntime";
import type {
  ProgramConsoleEntry,
  ProgramStatus,
} from "@/runtime/program.types";
import { stopRobot } from "@/simulation/robot/robotCommands";
import { useSimulationStore } from "@/simulation/state/simulation.store";

import ChallengePanel from "./ChallengePanel";
import OperateControlPanel from "./OperateControlPanel";
import ProgramConsole from "./ProgramConsole";
import ProgramEditor from "./ProgramEditor";
import SimulatorCanvas from "./SimulatorCanvas";
import SimulatorToolbar from "./SimulatorToolbar";
import SimulationStatus from "./SimulationStatus";
import {
  DEFAULT_SIMULATOR_MODE,
  type SimulatorMode,
} from "./simulator.types";

const starterCode = `const start = await robot.odometry();
const distance = await robot.distance();
console.log("Distance:", distance, "m");
const hit = await robot.bumped();
console.log("Bumper:", hit);

if (hit) {
  await robot.backward(400);
} else if (distance < 1) {
  await robot.turnLeft(600);
} else {
  await robot.forward(1000);
}

const end = await robot.odometry();
console.log("Moved:", end.x - start.x, end.z - start.z);
console.log("Heading:", end.heading, "rad");
await robot.stop();`;

export default function Simulator() {
  const [mode, setMode] = useState<SimulatorMode>(DEFAULT_SIMULATOR_MODE);
  const [programSource, setProgramSource] = useState(starterCode);

  const [programStatus, setProgramStatus] = useState<ProgramStatus>(
    programRuntime.status,
  );

  const [consoleEntries, setConsoleEntries] = useState<
    ProgramConsoleEntry[]
  >([]);

  const [challengeSnapshot, setChallengeSnapshot] =
    useState<ChallengeSnapshot>(challengeEngine.snapshot);

  const [challengeProgress, setChallengeProgress] =
    useState<ChallengeProgress>(() =>
      challengeProgressStore.getProgress(
        challengeEngine.snapshot.definition.id,
      ),
    );

  const resetSimulation = useSimulationStore(
    (state) => state.resetSimulation,
  );

  useEffect(() => {
    const unsubscribe = programRuntime.subscribe((event) => {
      if (event.type === "STATUS_CHANGED") {
        setProgramStatus(event.status);
      } else {
        setConsoleEntries((entries) => [...entries, event.entry]);
      }
    });

    const syncSelectedProgress = () => {
      setChallengeProgress(
        challengeProgressStore.getProgress(
          challengeEngine.snapshot.definition.id,
        ),
      );
    };

    const unsubscribeProgress =
      challengeProgressStore.subscribe(syncSelectedProgress);

    const unsubscribeChallenge = challengeEngine.subscribe((snapshot) => {
      setChallengeSnapshot(snapshot);

      setChallengeProgress(
        challengeProgressStore.getProgress(snapshot.definition.id),
      );

      if (
        snapshot.status === "success" &&
        snapshot.runId !== null &&
        snapshot.startedAt !== null &&
        snapshot.endedAt !== null
      ) {
        challengeProgressStore.recordSuccess({
          definition: snapshot.definition,
          runId: snapshot.runId,
          elapsedTimeMs: snapshot.endedAt - snapshot.startedAt,
        });
      }
    });

    challengeProgressStore.hydrate();

    return () => {
      unsubscribe();
      unsubscribeChallenge();
      unsubscribeProgress();

      behaviorRunner.stop();
      programRuntime.dispose();
      challengeEngine.reset();
    };
  }, []);

  const isProgramActive =
    programStatus === "running" || programStatus === "stopping";

  const challengeNeedsReset =
    challengeSnapshot.status === "success" ||
    challengeSnapshot.status === "failed";

  const runProgram = () => {
    if (challengeNeedsReset) {
      return;
    }

    if (challengeEngine.snapshot.status !== "idle") {
      return;
    }

    behaviorRunner.stop();

    if (programRuntime.run(programSource)) {
      if (challengeEngine.start()) {
        challengeProgressStore.recordAttempt(
          challengeEngine.snapshot.definition.id,
        );
      } else {
        programRuntime.stop();
      }
    }
  };

  const selectChallenge = (challengeId: string) => {
    if (challengeId === challengeSnapshot.definition.id) {
      return;
    }

    stopRobot();

    if (challengeEngine.selectChallenge(challengeId)) {
      resetSimulation();
    }
  };

  const switchMode = (nextMode: SimulatorMode) => {
    if (nextMode === mode) {
      return;
    }

    behaviorRunner.stop();
    stopRobot();

    if (challengeEngine.snapshot.status === "running") {
      challengeEngine.reset();
    }

    setMode(nextMode);
  };

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0f17] text-white">
      <header className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111722] px-3 py-2">
        <div className="flex min-w-[220px] items-center gap-3">
          <Link
            href="/"
            aria-label="Go to RoboForge homepage"
            className="flex items-center transition-opacity hover:opacity-85"
          >
            <Image
              src="/roboforge-logo.png"
              alt="RoboForge"
              width={190}
              height={70}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>

          <div className="hidden 2xl:block">
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              JavaScript workspace
            </p>
          </div>
        </div>

        <div className="flex rounded-lg border border-white/10 bg-black/20 p-1">
          {(["operate", "build"] as const).map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={mode === candidate}
              onClick={() => switchMode(candidate)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${
                mode === candidate
                  ? "bg-blue-500 text-white shadow"
                  : "text-neutral-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {candidate}
            </button>
          ))}
        </div>

        {mode === "build" ? (
          <div className="order-3 w-full xl:order-none xl:w-auto">
            <SimulatorToolbar />
          </div>
        ) : null}

        {mode === "build" ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] uppercase tracking-wider text-neutral-500 sm:inline">
              {programStatus}
            </span>

            <button
              type="button"
              onClick={runProgram}
              disabled={isProgramActive || challengeNeedsReset}
              title={
                challengeNeedsReset
                  ? "Reset to retry the challenge"
                  : undefined
              }
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Run Program
            </button>

            <button
              type="button"
              onClick={() => programRuntime.stop()}
              disabled={!isProgramActive}
              className="rounded-lg bg-red-500/80 px-4 py-2 text-xs font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Stop Program
            </button>
          </div>
        ) : (
          <p className="text-xs text-neutral-400">Operate Mode</p>
        )}
      </header>

      {mode === "operate" ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[16rem_1fr] md:grid-rows-1">
          <OperateControlPanel
            targetDefinitions={challengeEngine.definitions}
            selectedTargetId={challengeSnapshot.definition.id}
            onSelectTarget={selectChallenge}
          />

          <section className="relative min-h-0 overflow-hidden bg-[#0f172a]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.10),transparent_50%)]" />

            <SimulatorCanvas />

            <SimulationStatus />
          </section>
        </div>
      ) : (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
            <section className="min-h-0 border-b border-white/10 md:border-r md:border-b-0">
              <ProgramEditor
                value={programSource}
                onChange={setProgramSource}
              />
            </section>

            <section className="relative min-h-0 overflow-hidden bg-[#0f172a]">
              <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.10),transparent_50%)]" />

              <SimulatorCanvas />

              <ChallengePanel
                snapshot={challengeSnapshot}
                definitions={challengeEngine.definitions}
                progress={challengeProgress}
                onSelectChallenge={selectChallenge}
              />

              <SimulationStatus />
            </section>
          </div>

          <ProgramConsole
            entries={consoleEntries}
            status={programStatus}
          />
        </>
      )}
    </main>
  );
}
