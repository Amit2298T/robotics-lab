"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { challengeEngine } from "@/challenges/activeChallengeEngine";
import type { ChallengeSnapshot } from "@/challenges/challenge.types";
import { programRuntime } from "@/runtime/activeProgramRuntime";
import type {
  ProgramConsoleEntry,
  ProgramStatus,
} from "@/runtime/program.types";

import ChallengePanel from "./ChallengePanel";
import ProgramConsole from "./ProgramConsole";
import ProgramEditor from "./ProgramEditor";
import SimulatorCanvas from "./SimulatorCanvas";
import SimulatorToolbar from "./SimulatorToolbar";
import SimulationStatus from "./SimulationStatus";

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
  const [programSource, setProgramSource] = useState(starterCode);

  const [programStatus, setProgramStatus] = useState<ProgramStatus>(
    programRuntime.status,
  );

  const [consoleEntries, setConsoleEntries] = useState<
    ProgramConsoleEntry[]
  >([]);

  const [challengeSnapshot, setChallengeSnapshot] =
    useState<ChallengeSnapshot>(challengeEngine.snapshot);

  useEffect(() => {
    const unsubscribe = programRuntime.subscribe((event) => {
      if (event.type === "STATUS_CHANGED") {
        setProgramStatus(event.status);
      } else {
        setConsoleEntries((entries) => [...entries, event.entry]);
      }
    });
    const unsubscribeChallenge = challengeEngine.subscribe(
      setChallengeSnapshot,
    );

    return () => {
      unsubscribe();
      unsubscribeChallenge();
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

    if (
      programRuntime.run(programSource) &&
      challengeSnapshot.status === "idle"
    ) {
      challengeEngine.start();
    }
  };

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0f17] text-white">
      <header className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111722] px-3 py-2">
        {/* Branding */}
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

        {/* Simulator controls */}
        <div className="order-3 w-full xl:order-none xl:w-auto">
          <SimulatorToolbar />
        </div>

        {/* Program controls */}
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] uppercase tracking-wider text-neutral-500 sm:inline">
            {programStatus}
          </span>

          <button
            type="button"
            onClick={runProgram}
            disabled={isProgramActive || challengeNeedsReset}
            title={
              challengeNeedsReset ? "Reset to retry the challenge" : undefined
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
      </header>

      {/* Main workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1">
        {/* Monaco editor */}
        <section className="min-h-0 border-b border-white/10 md:border-r md:border-b-0">
          <ProgramEditor
            value={programSource}
            onChange={setProgramSource}
          />
        </section>

        {/* 3D simulator */}
        <section className="relative min-h-0 overflow-hidden bg-[#0f172a]">
          <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.10),transparent_50%)]" />

          <SimulatorCanvas />

          <ChallengePanel snapshot={challengeSnapshot} />
          <SimulationStatus />
        </section>
      </div>

      {/* Console */}
      <ProgramConsole
        entries={consoleEntries}
        status={programStatus}
      />
    </main>
  );
}
