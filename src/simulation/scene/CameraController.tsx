"use client";

import { OrbitControls } from "@react-three/drei";

export default function CameraController() {
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={20}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}