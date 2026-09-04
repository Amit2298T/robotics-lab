const FULL_TURN = Math.PI * 2;

export type NavigationTarget = {
  x: number;
  z: number;
  halfWidth?: number;
  halfDepth?: number;
};

export function normalizeAngle(angle: number): number {
  if (!Number.isFinite(angle)) {
    return 0;
  }

  const normalized =
    ((angle + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;
  return Object.is(normalized, -0) ? 0 : normalized;
}

/** Heading 0 points down local -Z; positive headings turn toward local -X. */
export function calculateTargetHeading(dx: number, dz: number): number {
  return normalizeAngle(Math.atan2(-dx, -dz));
}

export function distance2D(dx: number, dz: number): number {
  return Math.hypot(dx, dz);
}
