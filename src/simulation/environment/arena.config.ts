export type ArenaObstacleDefinition = {
  id: string;
  position: readonly [number, number, number];
  size: readonly [number, number, number];
};

export const arenaObstacles = [
  {
    id: "east-block",
    position: [2.2, 0.35, -1.4],
    size: [1.2, 0.7, 1.2],
  },
  {
    id: "northwest-block",
    position: [-2.3, 0.25, 1.8],
    size: [1.6, 0.5, 0.7],
  },
  {
    id: "north-column",
    position: [0.8, 0.2, 2.8],
    size: [0.5, 0.4, 1.7],
  },
  {
    id: "southwest-block",
    position: [-1.4, 0.3, -2.7],
    size: [0.8, 0.6, 0.8],
  },
] as const satisfies readonly ArenaObstacleDefinition[];

export const arenaNavigationBounds = {
  minX: -9.2,
  maxX: 9.2,
  minZ: -9.2,
  maxZ: 9.2,
} as const;
