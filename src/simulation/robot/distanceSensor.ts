import {
  QueryFilterFlags,
  Ray,
  type RigidBody,
  type Rotation,
  type Vector,
  type World,
} from "@dimforge/rapier3d-compat";

export type DistanceSensorConfig = {
  maxDistance: number;
  originOffset: readonly [number, number, number];
  localDirection: readonly [number, number, number];
};

type DistanceSensorBodies = {
  chassis: RigidBody;
  leftWheel: RigidBody;
  rightWheel: RigidBody;
};

function rotateVector(vector: Vector, rotation: Rotation): Vector {
  const tx = 2 * (rotation.y * vector.z - rotation.z * vector.y);
  const ty = 2 * (rotation.z * vector.x - rotation.x * vector.z);
  const tz = 2 * (rotation.x * vector.y - rotation.y * vector.x);

  return {
    x:
      vector.x +
      rotation.w * tx +
      (rotation.y * tz - rotation.z * ty),
    y:
      vector.y +
      rotation.w * ty +
      (rotation.z * tx - rotation.x * tz),
    z:
      vector.z +
      rotation.w * tz +
      (rotation.x * ty - rotation.y * tx),
  };
}

export function castDistanceRay(
  world: World,
  bodies: DistanceSensorBodies,
  config: DistanceSensorConfig,
): number {
  const chassisPosition = bodies.chassis.translation();
  const chassisRotation = bodies.chassis.rotation();
  const localOrigin = {
    x: config.originOffset[0],
    y: config.originOffset[1],
    z: config.originOffset[2],
  };
  const localDirection = {
    x: config.localDirection[0],
    y: config.localDirection[1],
    z: config.localDirection[2],
  };
  const rotatedOrigin = rotateVector(localOrigin, chassisRotation);
  const direction = rotateVector(localDirection, chassisRotation);
  const directionLength = Math.hypot(
    direction.x,
    direction.y,
    direction.z,
  );

  if (
    !Number.isFinite(config.maxDistance) ||
    config.maxDistance < 0 ||
    !Number.isFinite(directionLength) ||
    directionLength === 0
  ) {
    return Math.max(0, Number.isFinite(config.maxDistance) ? config.maxDistance : 0);
  }

  const excludedHandles = new Set([
    bodies.chassis.handle,
    bodies.leftWheel.handle,
    bodies.rightWheel.handle,
  ]);
  const ray = new Ray(
    {
      x: chassisPosition.x + rotatedOrigin.x,
      y: chassisPosition.y + rotatedOrigin.y,
      z: chassisPosition.z + rotatedOrigin.z,
    },
    {
      x: direction.x / directionLength,
      y: direction.y / directionLength,
      z: direction.z / directionLength,
    },
  );
  const hit = world.castRay(
    ray,
    config.maxDistance,
    true,
    QueryFilterFlags.EXCLUDE_SENSORS,
    undefined,
    undefined,
    undefined,
    (collider) => {
      const parent = collider.parent();
      return parent === null || !excludedHandles.has(parent.handle);
    },
  );
  const distance = hit?.timeOfImpact ?? config.maxDistance;

  return Number.isFinite(distance)
    ? Math.min(config.maxDistance, Math.max(0, distance))
    : config.maxDistance;
}
