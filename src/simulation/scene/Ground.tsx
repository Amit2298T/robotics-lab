"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { BUMPER_IGNORED_USER_DATA_KEY } from "@/simulation/robot/bumperSensor";

export default function Ground() {
  return (
    <RigidBody
      type="fixed"
      colliders={false}
      userData={{ [BUMPER_IGNORED_USER_DATA_KEY]: true }}
    >
      <mesh
        position={[0, -0.1, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[20, 20]} />

        <meshStandardMaterial
          color="#1f2937"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      <CuboidCollider
        args={[10, 0.1, 10]}
        position={[0, -0.1, 0]}
        friction={1}
        restitution={0}
      />
    </RigidBody>
  );
}
