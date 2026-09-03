"use client";

import { Physics } from "@react-three/rapier";

import Ground from "./Ground";
import DifferentialDriveRobot from "@/simulation/robot/DifferentialDriveRobot";
import TestArena from "@/simulation/environment/TestArena";
import { useSimulationStore } from "@/simulation/state/simulation.store";

export default function SimulationWorld() {
  const debugPhysics = useSimulationStore(
    (state) => state.debugPhysics,
  );

  return (
    <>
      <Physics
        gravity={[0, -9.81, 0]}
        debug={debugPhysics}
      >
        <Ground />
        <TestArena />
        <DifferentialDriveRobot />
      </Physics>

      <gridHelper
        args={[20, 20]}
        position={[0, 0.001, 0]}
      />
    </>
  );
}