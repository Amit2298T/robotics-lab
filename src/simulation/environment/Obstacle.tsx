"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";

type ObstacleProps = {
  position: [number, number, number];
  size: [number, number, number];
};

export default function Obstacle({
  position,
  size,
}: ObstacleProps) {
  const [width, height, depth] = size;

  return (
    <RigidBody
      type="fixed"
      colliders={false}
      position={position}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />

        <meshStandardMaterial
          color="#475569"
          metalness={0.12}
          roughness={0.7}
        />
      </mesh>

      <CuboidCollider
        args={[width / 2, height / 2, depth / 2]}
        friction={0.9}
        restitution={0}
      />
    </RigidBody>
  );
}