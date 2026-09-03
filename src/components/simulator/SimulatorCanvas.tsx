"use client";

import { Canvas } from "@react-three/fiber";
import SimulationScene from "@/simulation/scene/SimulationScene";

export default function SimulatorCanvas() {
  return (
    <Canvas
      shadows
      camera={{
        position: [6, 5, 6],
        fov: 45,
      }}
    >
      <SimulationScene />
    </Canvas>
  );
}