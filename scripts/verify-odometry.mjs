import {
  computeOdometry,
  createOdometryReference,
  headingFromQuaternion,
} from "../src/simulation/robot/odometry.ts";

const identity = { x: 0, y: 0, z: 0, w: 1 };

function yaw(angle) {
  return {
    x: 0,
    y: Math.sin(angle / 2),
    z: 0,
    w: Math.cos(angle / 2),
  };
}

function assertNear(actual, expected, label) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > 0.0001) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertPose(actual, expected, label) {
  assertNear(actual.x, expected.x, `${label} x`);
  assertNear(actual.z, expected.z, `${label} z`);
  assertNear(actual.heading, expected.heading, `${label} heading`);
}

const spawnPosition = { x: 2, y: 0.42, z: 3 };
const reference = createOdometryReference(spawnPosition, identity);

assertPose(
  computeOdometry(spawnPosition, identity, reference),
  { x: 0, z: 0, heading: 0 },
  "spawn",
);

assertPose(
  computeOdometry({ x: 2, y: 0.42, z: 2 }, identity, reference),
  { x: 0, z: -1, heading: 0 },
  "forward movement",
);

assertNear(headingFromQuaternion(yaw(Math.PI / 2)), Math.PI / 2, "left turn");
assertNear(
  headingFromQuaternion(yaw(-Math.PI / 2)),
  -Math.PI / 2,
  "right turn",
);

assertPose(
  computeOdometry(
    { x: 1, y: 0.42, z: 3 },
    yaw(Math.PI / 2),
    reference,
  ),
  { x: -1, z: 0, heading: Math.PI / 2 },
  "turn then move forward",
);

const resetPosition = { x: -4, y: 0.42, z: 1.5 };
const resetRotation = yaw(-0.7);
const resetReference = createOdometryReference(resetPosition, resetRotation);
assertPose(
  computeOdometry(resetPosition, resetRotation, resetReference),
  { x: 0, z: 0, heading: 0 },
  "reset",
);

for (let index = 0; index < 5; index += 1) {
  const reading = computeOdometry(
    { x: 2 - index * 0.2, y: 0.42, z: 3 - index * 0.3 },
    yaw(index * 0.1),
    reference,
  );

  if (![reading.x, reading.z, reading.heading].every(Number.isFinite)) {
    throw new Error("repeated reading returned a non-finite value");
  }
}

console.log("Odometry verification passed.");
