import RAPIER from "@dimforge/rapier3d-compat";
import { castDistanceRay } from "../src/simulation/robot/distanceSensor.ts";

await RAPIER.init();

const config = {
  maxDistance: 5,
  originOffset: [0, 0.12, -0.61],
  localDirection: [0, 0, -1],
};

function createRobot(rotation = { x: 0, y: 0, z: 0, w: 1 }) {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const chassis = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setRotation(rotation),
  );
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.45, 0.11, 0.575), chassis);

  const leftWheel = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(-0.5, -0.12, 0),
  );
  world.createCollider(RAPIER.ColliderDesc.ball(0.22), leftWheel);

  const rightWheel = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0.5, -0.12, 0),
  );
  world.createCollider(RAPIER.ColliderDesc.ball(0.22), rightWheel);

  return {
    world,
    bodies: { chassis, leftWheel, rightWheel },
  };
}

function addObstacle(world, x, z) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(x, 0.12, z),
  );
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.25, 0.25, 0.25), body);
}

function assertNear(actual, expected, label) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > 0.0001) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function readDistance(world, bodies) {
  world.step();
  return castDistanceRay(world, bodies, config);
}

{
  const { world, bodies } = createRobot();
  assertNear(readDistance(world, bodies), 5, "no-hit fallback");
}

{
  const far = createRobot();
  addObstacle(far.world, 0, -1.86);
  const farDistance = readDistance(far.world, far.bodies);
  assertNear(farDistance, 1, "one-meter obstacle");

  const near = createRobot();
  addObstacle(near.world, 0, -1.36);
  const nearDistance = readDistance(near.world, near.bodies);

  if (!(nearDistance < farDistance)) {
    throw new Error(
      `closer obstacle: expected ${nearDistance} to be less than ${farDistance}`,
    );
  }
}

{
  const halfTurn = Math.PI / 4;
  const { world, bodies } = createRobot({
    x: 0,
    y: Math.sin(halfTurn),
    z: 0,
    w: Math.cos(halfTurn),
  });
  addObstacle(world, -1.86, 0);
  const distance = readDistance(world, bodies);
  assertNear(distance, 1, "rotated direction");
}

{
  const { world, bodies } = createRobot();
  assertNear(readDistance(world, bodies), 5, "self-hit exclusion");
}

console.log("Distance sensor verification passed.");
