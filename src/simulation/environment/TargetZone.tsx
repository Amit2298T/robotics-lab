"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";

import type { ChallengeTargetZone } from "@/challenges/challenge.types";
import { isRobotChassis } from "@/simulation/robot/robotPhysicsMetadata";

type TargetZoneProps = {
  targetZone: ChallengeTargetZone;
  successful: boolean;
  onChassisEntered(): void;
};

export default function TargetZone({
  targetZone,
  successful,
  onChassisEntered,
}: TargetZoneProps) {
  const [width, height, depth] = targetZone.size;

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={targetZone.position}
    >
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={successful ? "#4ade80" : "#16a34a"}
          emissive={successful ? "#22c55e" : "#15803d"}
          emissiveIntensity={successful ? 3 : 1.2}
          transparent
          opacity={0.82}
        />
      </mesh>

      <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.min(width, depth) * 0.38, 0.055, 12, 48]} />
        <meshStandardMaterial
          color="#86efac"
          emissive="#22c55e"
          emissiveIntensity={successful ? 4 : 2}
        />
      </mesh>

      <CuboidCollider
        sensor
        args={[width / 2, height / 2, depth / 2]}
        position={[0, height / 2, 0]}
        onIntersectionEnter={({ other }) => {
          if (isRobotChassis(other.rigidBody?.userData)) {
            onChassisEntered();
          }
        }}
      />
    </RigidBody>
  );
}
