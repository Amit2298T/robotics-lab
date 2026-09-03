import type { Rotation, Vector } from "@dimforge/rapier3d-compat";

import type { RobotOdometry } from "@/simulation/types/robot.types";

const FULL_TURN = Math.PI * 2;

export type OdometryReference = {
  x: number;
  z: number;
  heading: number;
};

export function normalizeHeading(heading: number): number {
  if (!Number.isFinite(heading)) {
    return 0;
  }

  const normalized =
    ((heading + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;

  return Object.is(normalized, -0) ? 0 : normalized;
}

export function headingFromQuaternion(rotation: Rotation): number {
  if (
    !Number.isFinite(rotation.x) ||
    !Number.isFinite(rotation.y) ||
    !Number.isFinite(rotation.z) ||
    !Number.isFinite(rotation.w)
  ) {
    return 0;
  }

  // Project the rotated local -Z forward axis onto the world XZ plane.
  return normalizeHeading(
    Math.atan2(
      2 * (rotation.w * rotation.y + rotation.x * rotation.z),
      1 - 2 * (rotation.x * rotation.x + rotation.y * rotation.y),
    ),
  );
}

export function createOdometryReference(
  position: Vector,
  rotation: Rotation,
): OdometryReference {
  return {
    x: Number.isFinite(position.x) ? position.x : 0,
    z: Number.isFinite(position.z) ? position.z : 0,
    heading: headingFromQuaternion(rotation),
  };
}

export function computeOdometry(
  position: Vector,
  rotation: Rotation,
  reference: OdometryReference,
): RobotOdometry {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) {
    return { x: 0, z: 0, heading: 0 };
  }

  const worldX = position.x - reference.x;
  const worldZ = position.z - reference.z;
  const cosine = Math.cos(reference.heading);
  const sine = Math.sin(reference.heading);
  const x = cosine * worldX - sine * worldZ;
  const z = sine * worldX + cosine * worldZ;
  const heading = normalizeHeading(
    headingFromQuaternion(rotation) - reference.heading,
  );

  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return { x: 0, z: 0, heading: 0 };
  }

  return { x, z, heading };
}
