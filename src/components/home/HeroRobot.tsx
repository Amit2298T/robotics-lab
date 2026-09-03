"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function HeroRobot() {
  const robotRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!robotRef.current) return;

    robotRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.35) * 0.18;

    robotRef.current.position.y =
      Math.sin(state.clock.elapsedTime * 0.8) * 0.025;
  });

  return (
    <group
      ref={robotRef}
      position={[0, -0.15, 0]}
      rotation={[0.12, -0.45, 0]}
    >
      {/* Main chassis */}
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[2.4, 0.55, 1.65]} />
        <meshStandardMaterial
          color="#262626"
          metalness={0.65}
          roughness={0.3}
        />
      </mesh>

      {/* Upper shell */}
      <mesh castShadow position={[0, 0.84, -0.05]}>
        <boxGeometry args={[1.65, 0.38, 1.18]} />
        <meshStandardMaterial
          color="#3a3a3a"
          metalness={0.7}
          roughness={0.24}
        />
      </mesh>

      {/* Front sensor housing */}
      <mesh castShadow position={[0, 0.78, -0.69]}>
        <boxGeometry args={[0.82, 0.24, 0.18]} />
        <meshStandardMaterial
          color="#151515"
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>

      {/* Center sensor */}
      <mesh position={[0, 0.79, -0.8]}>
        <boxGeometry args={[0.42, 0.1, 0.05]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#2563eb"
          emissiveIntensity={3}
        />
      </mesh>

      {/* Left sensor */}
      <mesh position={[-0.53, 0.75, -0.8]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#2563eb"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Right sensor */}
      <mesh position={[0.53, 0.75, -0.8]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#2563eb"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Left wheel */}
      <mesh
        castShadow
        position={[-1.22, 0.16, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.48, 0.48, 0.28, 32]} />
        <meshStandardMaterial
          color="#101010"
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Left wheel hub */}
      <mesh
        position={[-1.38, 0.16, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.18, 0.18, 0.05, 32]} />
        <meshStandardMaterial
          color="#737373"
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      {/* Right wheel */}
      <mesh
        castShadow
        position={[1.22, 0.16, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.48, 0.48, 0.28, 32]} />
        <meshStandardMaterial
          color="#101010"
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>

      {/* Right wheel hub */}
      <mesh
        position={[1.38, 0.16, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.18, 0.18, 0.05, 32]} />
        <meshStandardMaterial
          color="#737373"
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      {/* Rear caster */}
      <mesh castShadow position={[0, -0.08, 0.6]}>
        <sphereGeometry args={[0.18, 28, 28]} />
        <meshStandardMaterial
          color="#525252"
          metalness={0.5}
          roughness={0.45}
        />
      </mesh>

      {/* Top panel */}
      <mesh position={[0, 1.045, -0.05]}>
        <boxGeometry args={[0.78, 0.035, 0.56]} />
        <meshStandardMaterial
          color="#171717"
          metalness={0.75}
          roughness={0.2}
        />
      </mesh>

      {/* Status light */}
      <mesh position={[0, 1.08, -0.05]}>
        <boxGeometry args={[0.3, 0.025, 0.11]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#2563eb"
          emissiveIntensity={3.5}
        />
      </mesh>
    </group>
  );
}