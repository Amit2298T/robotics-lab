"use client";

import Obstacle from "./Obstacle";
import { arenaObstacles } from "./arena.config";

export default function TestArena() {
  return (
    <>
      {arenaObstacles.map((obstacle) => (
        <Obstacle
          key={obstacle.id}
          position={[...obstacle.position]}
          size={[...obstacle.size]}
        />
      ))}
    </>
  );
}
