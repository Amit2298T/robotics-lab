"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import HeroRobot from "./HeroRobot";

export default function HeroScene() {
  return (
    <div className="h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: [4.8, 3.2, 5.5],
          fov: 35,
        }}
      >
        <ambientLight intensity={0.7} />

        <directionalLight
          castShadow
          position={[4, 6, 4]}
          intensity={2.5}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <pointLight
          position={[-3, 2, -2]}
          intensity={5}
          color="#2563eb"
        />

        <pointLight
          position={[3, 1, 3]}
          intensity={2.5}
          color="#ffffff"
        />

        <HeroRobot />

        <ContactShadows
          position={[0, -0.4, 0]}
          opacity={0.55}
          scale={7}
          blur={2.5}
          far={4}
        />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.8}
          maxPolarAngle={Math.PI / 2.05}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>
    </div>
  );
}