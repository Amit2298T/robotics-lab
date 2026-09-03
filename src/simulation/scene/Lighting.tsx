"use client";

export default function Lighting() {
  return (
    <>
      <ambientLight intensity={1.4} />

      <hemisphereLight
        intensity={1.2}
        color="#ffffff"
        groundColor="#2a2a2a"
      />

      <directionalLight
        position={[6, 10, 6]}
        intensity={3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <directionalLight
        position={[-4, 6, -5]}
        intensity={1.6}
      />
    </>
  );
}