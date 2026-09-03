"use client";

import Obstacle from "./Obstacle";

export default function TestArena() {
  return (
    <>
      <Obstacle
        position={[2.2, 0.35, -1.4]}
        size={[1.2, 0.7, 1.2]}
      />

      <Obstacle
        position={[-2.3, 0.25, 1.8]}
        size={[1.6, 0.5, 0.7]}
      />

      <Obstacle
        position={[0.8, 0.2, 2.8]}
        size={[0.5, 0.4, 1.7]}
      />

      <Obstacle
        position={[-1.4, 0.3, -2.7]}
        size={[0.8, 0.6, 0.8]}
      />
    </>
  );
}