import {
  arenaNavigationBounds,
  arenaObstacles,
  type ArenaObstacleDefinition,
} from "../simulation/environment/arena.config.ts";
import { robotConfig } from "../simulation/robot/robot.config.ts";

import type { NavigationTarget } from "./behaviorNavigation";

export const NAVIGATION_GRID_SIZE = 0.4;
export const NAVIGATION_SAFETY_MARGIN = 0.1;
export const NAVIGATION_OBSTACLE_INFLATION =
  Math.max(
    robotConfig.chassis.size[0] / 2,
    robotConfig.chassis.size[2] / 2,
    robotConfig.wheels.offsetX + robotConfig.wheels.width / 2,
  ) + NAVIGATION_SAFETY_MARGIN;

export type NavigationBlockage = NavigationTarget & {
  radius: number;
};

export type PlannedPath = {
  waypoints: NavigationTarget[];
  gridCells: readonly GridCell[];
};

export type GridPathPlanner = (
  start: NavigationTarget,
  target: NavigationTarget,
  additionalBlockages?: readonly NavigationBlockage[],
) => PlannedPath | null;

type GridCell = {
  column: number;
  row: number;
};

type SearchRecord = {
  cell: GridCell;
  cost: number;
  estimate: number;
  parentKey: string | null;
};

const CARDINAL_COST = 1;
const DIAGONAL_COST = Math.SQRT2;
const DIRECTIONS = [
  { column: -1, row: 0, cost: CARDINAL_COST },
  { column: 1, row: 0, cost: CARDINAL_COST },
  { column: 0, row: -1, cost: CARDINAL_COST },
  { column: 0, row: 1, cost: CARDINAL_COST },
  { column: -1, row: -1, cost: DIAGONAL_COST },
  { column: -1, row: 1, cost: DIAGONAL_COST },
  { column: 1, row: -1, cost: DIAGONAL_COST },
  { column: 1, row: 1, cost: DIAGONAL_COST },
] as const;

const columnCount =
  Math.round(
    (arenaNavigationBounds.maxX - arenaNavigationBounds.minX) /
      NAVIGATION_GRID_SIZE,
  ) + 1;
const rowCount =
  Math.round(
    (arenaNavigationBounds.maxZ - arenaNavigationBounds.minZ) /
      NAVIGATION_GRID_SIZE,
  ) + 1;

export const planGridPath: GridPathPlanner = (
  start,
  target,
  additionalBlockages = [],
) => {
  const startCell = worldToCell(start);
  const targetCell = worldToCell(target);
  if (
    !isCellAvailable(startCell, additionalBlockages) ||
    !isCellAvailable(targetCell, additionalBlockages)
  ) {
    return null;
  }

  const startKey = cellKey(startCell);
  const targetKey = cellKey(targetCell);
  const records = new Map<string, SearchRecord>();
  const openKeys = new Set<string>([startKey]);
  const closedKeys = new Set<string>();
  records.set(startKey, {
    cell: startCell,
    cost: 0,
    estimate: octileDistance(startCell, targetCell),
    parentKey: null,
  });

  while (openKeys.size > 0) {
    const current = lowestEstimate(openKeys, records);
    const currentKey = cellKey(current.cell);
    if (currentKey === targetKey) {
      const gridCells = simplifyGridPath(
        reconstructPath(currentKey, records),
      );
      return {
        gridCells,
        waypoints: createWorldWaypoints(
          gridCells,
          start,
          target,
          additionalBlockages,
        ),
      };
    }

    openKeys.delete(currentKey);
    closedKeys.add(currentKey);

    for (const direction of DIRECTIONS) {
      const neighbor = {
        column: current.cell.column + direction.column,
        row: current.cell.row + direction.row,
      };
      const neighborKey = cellKey(neighbor);
      if (
        closedKeys.has(neighborKey) ||
        !canTraverse(current.cell, neighbor, additionalBlockages)
      ) {
        continue;
      }

      const nextCost = current.cost + direction.cost;
      const existing = records.get(neighborKey);
      if (existing && nextCost >= existing.cost) {
        continue;
      }

      records.set(neighborKey, {
        cell: neighbor,
        cost: nextCost,
        estimate: nextCost + octileDistance(neighbor, targetCell),
        parentKey: currentKey,
      });
      openKeys.add(neighborKey);
    }
  }

  return null;
};

export function isPathClear(
  waypoints: readonly NavigationTarget[],
  additionalBlockages: readonly NavigationBlockage[] = [],
): boolean {
  for (let index = 1; index < waypoints.length; index += 1) {
    if (
      !isSegmentClear(
        waypoints[index - 1],
        waypoints[index],
        additionalBlockages,
      )
    ) {
      return false;
    }
  }
  return true;
}

function canTraverse(
  from: GridCell,
  to: GridCell,
  additionalBlockages: readonly NavigationBlockage[],
): boolean {
  if (!isCellAvailable(to, additionalBlockages)) {
    return false;
  }

  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  if (
    columnDelta !== 0 &&
    rowDelta !== 0 &&
    (!isCellAvailable(
      { column: from.column + columnDelta, row: from.row },
      additionalBlockages,
    ) ||
      !isCellAvailable(
        { column: from.column, row: from.row + rowDelta },
        additionalBlockages,
      ))
  ) {
    return false;
  }

  return isSegmentClear(
    cellToWorld(from),
    cellToWorld(to),
    additionalBlockages,
  );
}

function isCellAvailable(
  cell: GridCell,
  additionalBlockages: readonly NavigationBlockage[],
): boolean {
  return (
    cell.column >= 0 &&
    cell.column < columnCount &&
    cell.row >= 0 &&
    cell.row < rowCount &&
    isPointClear(cellToWorld(cell), additionalBlockages)
  );
}

function isPointClear(
  point: NavigationTarget,
  additionalBlockages: readonly NavigationBlockage[],
): boolean {
  return (
    arenaObstacles.every(
      (obstacle) => !pointInsideObstacle(point, obstacle),
    ) &&
    additionalBlockages.every(
      (blockage) =>
        Math.hypot(point.x - blockage.x, point.z - blockage.z) >
        blockage.radius,
    )
  );
}

function isSegmentClear(
  start: NavigationTarget,
  end: NavigationTarget,
  additionalBlockages: readonly NavigationBlockage[],
): boolean {
  return (
    arenaObstacles.every(
      (obstacle) => !segmentIntersectsObstacle(start, end, obstacle),
    ) &&
    additionalBlockages.every(
      (blockage) =>
        distanceToSegment(blockage, start, end) > blockage.radius,
    )
  );
}

function pointInsideObstacle(
  point: NavigationTarget,
  obstacle: ArenaObstacleDefinition,
): boolean {
  const [x, , z] = obstacle.position;
  const [width, , depth] = obstacle.size;
  return (
    Math.abs(point.x - x) <= width / 2 + NAVIGATION_OBSTACLE_INFLATION &&
    Math.abs(point.z - z) <= depth / 2 + NAVIGATION_OBSTACLE_INFLATION
  );
}

function segmentIntersectsObstacle(
  start: NavigationTarget,
  end: NavigationTarget,
  obstacle: ArenaObstacleDefinition,
): boolean {
  const [x, , z] = obstacle.position;
  const [width, , depth] = obstacle.size;
  const minX = x - width / 2 - NAVIGATION_OBSTACLE_INFLATION;
  const maxX = x + width / 2 + NAVIGATION_OBSTACLE_INFLATION;
  const minZ = z - depth / 2 - NAVIGATION_OBSTACLE_INFLATION;
  const maxZ = z + depth / 2 + NAVIGATION_OBSTACLE_INFLATION;
  let near = 0;
  let far = 1;

  for (const [origin, delta, minimum, maximum] of [
    [start.x, end.x - start.x, minX, maxX],
    [start.z, end.z - start.z, minZ, maxZ],
  ]) {
    if (Math.abs(delta) < Number.EPSILON) {
      if (origin < minimum || origin > maximum) {
        return false;
      }
      continue;
    }

    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) {
      return false;
    }
  }

  return far >= 0 && near <= 1;
}

function distanceToSegment(
  point: NavigationTarget,
  start: NavigationTarget,
  end: NavigationTarget,
): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.z - start.z);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.z - start.z) * dz) /
        lengthSquared,
    ),
  );
  return Math.hypot(
    point.x - (start.x + projection * dx),
    point.z - (start.z + projection * dz),
  );
}

function createWorldWaypoints(
  cells: readonly GridCell[],
  start: NavigationTarget,
  target: NavigationTarget,
  additionalBlockages: readonly NavigationBlockage[],
): NavigationTarget[] {
  const simplified = [
    start,
    ...cells.slice(1, -1).map(cellToWorld),
    target,
  ];
  if (isPathClear(simplified, additionalBlockages)) {
    return simplified;
  }

  return [start, ...cells.slice(1).map(cellToWorld), target];
}

function simplifyGridPath(cells: readonly GridCell[]): GridCell[] {
  if (cells.length <= 2) {
    return [...cells];
  }

  const result = [cells[0]];
  let previousDirection = directionBetween(cells[0], cells[1]);
  for (let index = 1; index < cells.length - 1; index += 1) {
    const nextDirection = directionBetween(cells[index], cells[index + 1]);
    if (nextDirection !== previousDirection) {
      result.push(cells[index]);
      previousDirection = nextDirection;
    }
  }
  result.push(cells.at(-1)!);
  return result;
}

function reconstructPath(
  targetKey: string,
  records: ReadonlyMap<string, SearchRecord>,
): GridCell[] {
  const path: GridCell[] = [];
  let key: string | null = targetKey;
  while (key !== null) {
    const record = records.get(key);
    if (!record) {
      break;
    }
    path.push(record.cell);
    key = record.parentKey;
  }
  return path.reverse();
}

function lowestEstimate(
  openKeys: ReadonlySet<string>,
  records: ReadonlyMap<string, SearchRecord>,
): SearchRecord {
  let best: SearchRecord | null = null;
  for (const key of openKeys) {
    const record = records.get(key)!;
    if (!best || record.estimate < best.estimate) {
      best = record;
    }
  }
  return best!;
}

function octileDistance(first: GridCell, second: GridCell): number {
  const dx = Math.abs(first.column - second.column);
  const dz = Math.abs(first.row - second.row);
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
}

function directionBetween(first: GridCell, second: GridCell): string {
  return `${Math.sign(second.column - first.column)},${Math.sign(second.row - first.row)}`;
}

function worldToCell(point: NavigationTarget): GridCell {
  return {
    column: Math.round(
      (point.x - arenaNavigationBounds.minX) / NAVIGATION_GRID_SIZE,
    ),
    row: Math.round(
      (point.z - arenaNavigationBounds.minZ) / NAVIGATION_GRID_SIZE,
    ),
  };
}

function cellToWorld(cell: GridCell): NavigationTarget {
  return {
    x: arenaNavigationBounds.minX + cell.column * NAVIGATION_GRID_SIZE,
    z: arenaNavigationBounds.minZ + cell.row * NAVIGATION_GRID_SIZE,
  };
}

function cellKey(cell: GridCell): string {
  return `${cell.column}:${cell.row}`;
}
