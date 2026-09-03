"use client";

import SimulatorCanvas from "./SimulatorCanvas";
import SimulatorToolbar from "./SimulatorToolbar";
import SimulationStatus from "./SimulationStatus";

export default function Simulator() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0f172a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(59,130,246,0.10),transparent_50%)]" />

      <SimulatorCanvas />

      <SimulatorToolbar />

      <SimulationStatus />
    </main>
  );
}