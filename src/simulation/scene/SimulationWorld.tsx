"use client";

import { Physics } from "@react-three/rapier";

import Ground from "./Ground";
import DifferentialDriveRobot from "@/simulation/robot/DifferentialDriveRobot";
import TestArena from "@/simulation/environment/TestArena";
import TargetZone from "@/simulation/environment/TargetZone";
import { useSimulationStore } from "@/simulation/state/simulation.store";
import { challengeEngine } from "@/challenges/activeChallengeEngine";
import type { ChallengeSnapshot } from "@/challenges/challenge.types";
import { useEffect, useState } from "react";

export default function SimulationWorld() {
  const [challengeSnapshot, setChallengeSnapshot] =
    useState<ChallengeSnapshot>(challengeEngine.snapshot);
  const debugPhysics = useSimulationStore(
    (state) => state.debugPhysics,
  );

  useEffect(
    () =>
      challengeEngine.subscribe(setChallengeSnapshot),
    [],
  );

  return (
    <>
      <Physics
        gravity={[0, -9.81, 0]}
        debug={debugPhysics}
      >
        <Ground />
        <TestArena />
        <TargetZone
          key={challengeSnapshot.definition.id}
          targetZone={challengeSnapshot.definition.targetZone}
          successful={challengeSnapshot.status === "success"}
          onChassisEntered={() => challengeEngine.handleTargetReached()}
        />
        <DifferentialDriveRobot />
      </Physics>

      <gridHelper
        args={[20, 20]}
        position={[0, 0.001, 0]}
      />
    </>
  );
}
