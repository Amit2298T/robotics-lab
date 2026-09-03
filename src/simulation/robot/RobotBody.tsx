"use client";

import { CuboidCollider } from "@react-three/rapier";
import { robotConfig } from "./robot.config";

export default function RobotBody() {
  const [width, height, length] = robotConfig.chassis.size;

  return (
    <>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, length]} />

        <meshStandardMaterial
          color="#94a3b8"
          metalness={0.5}
          roughness={0.35}
        />
      </mesh>

      <mesh position={[0, 0.16, -0.05]} castShadow>
        <boxGeometry args={[0.58, 0.16, 0.72]} />

        <meshStandardMaterial
          color="#334155"
          metalness={0.55}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0, 0.22, -0.38]}>
        <boxGeometry args={[0.28, 0.06, 0.05]} />

        <meshStandardMaterial
          color="#60a5fa"
          emissive="#2563eb"
          emissiveIntensity={3}
        />
      </mesh>

      <CuboidCollider
        args={[width / 2, height / 2, length / 2]}
        friction={0.8}
        restitution={0}
      />
    </>
  );
}