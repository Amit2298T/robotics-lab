import { behaviorCatalog } from "../src/behaviors/behavior.config.ts";
import { BehaviorRunner } from "../src/behaviors/BehaviorRunner.ts";
import {
  isPathClear,
  NAVIGATION_GRID_SIZE,
  NAVIGATION_OBSTACLE_INFLATION,
  planGridPath,
} from "../src/behaviors/gridPathPlanner.ts";
import { normalizeAngle } from "../src/behaviors/behaviorNavigation.ts";
import { challengeCatalog } from "../src/challenges/challenge.config.ts";
import { arenaObstacles } from "../src/simulation/environment/arena.config.ts";

const LINEAR_METERS_PER_MS = 0.001;
const ANGULAR_RADIANS_PER_MS = 0.0044;

class KinematicRobotAdapter {
  odometry = { x: 0, z: 0, heading: 0 };
  distanceReadings = [];
  blockedMoves = 0;
  positions = [{ x: 0, z: 0 }];

  setWheelVelocities() {}
  stop() {}
  getPose() { return null; }
  readDistanceSensor = async () => this.distanceReadings.shift() ?? 5;
  readBumperSensor = async () => false;
  subscribeBumperHits = () => () => {};
  readOdometry = async () => ({ ...this.odometry });
}

class KinematicCommandRunner {
  operations = [];
  constructor(adapter) { this.adapter = adapter; }
  forward = async (durationMs) => {
    this.operations.push("FORWARD");
    const distance = durationMs * LINEAR_METERS_PER_MS;
    const x = this.adapter.odometry.x - Math.sin(this.adapter.odometry.heading) * distance;
    const z = this.adapter.odometry.z - Math.cos(this.adapter.odometry.heading) * distance;
    if (isOutsideObstacles({ x, z }, NAVIGATION_OBSTACLE_INFLATION - 0.1)) {
      this.adapter.odometry.x = x;
      this.adapter.odometry.z = z;
      this.adapter.positions.push({ x, z });
    } else {
      this.adapter.blockedMoves += 1;
    }
  };
  backward = async () => { this.operations.push("BACKWARD"); };
  turnLeft = async (durationMs) => {
    this.operations.push("TURN_LEFT");
    this.adapter.odometry.heading = normalizeAngle(
      this.adapter.odometry.heading + durationMs * ANGULAR_RADIANS_PER_MS,
    );
  };
  turnRight = async (durationMs) => {
    this.operations.push("TURN_RIGHT");
    this.adapter.odometry.heading = normalizeAngle(
      this.adapter.odometry.heading - durationMs * ANGULAR_RADIANS_PER_MS,
    );
  };
  stop = () => { this.operations.push("STOP"); };
  cancel = this.stop;
}

class ControlledCommandRunner extends KinematicCommandRunner {
  pending = null;
  forward = () => {
    this.operations.push("FORWARD");
    return new Promise((resolve, reject) => { this.pending = { resolve, reject }; });
  };
  cancel = () => {
    this.operations.push("STOP");
    if (this.pending) {
      const error = new Error("cancelled");
      error.name = "CommandCancelledError";
      this.pending.reject(error);
      this.pending = null;
    }
  };
  stop = this.cancel;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isOutsideInflatedObstacles(point) {
  return isOutsideObstacles(point, NAVIGATION_OBSTACLE_INFLATION);
}

function isOutsideObstacles(point, inflation) {
  return arenaObstacles.every((obstacle) => {
    const [x, , z] = obstacle.position;
    const [width, , depth] = obstacle.size;
    return (
      Math.abs(point.x - x) > width / 2 + inflation ||
      Math.abs(point.z - z) > depth / 2 + inflation
    );
  });
}

function independentlyVerifyPath(path) {
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const length = Math.hypot(end.x - start.x, end.z - start.z);
    const samples = Math.max(1, Math.ceil(length / 0.05));
    for (let sample = 0; sample <= samples; sample += 1) {
      const ratio = sample / samples;
      assert(
        isOutsideInflatedObstacles({
          x: start.x + (end.x - start.x) * ratio,
          z: start.z + (end.z - start.z) * ratio,
        }),
        "planned segment enters an independently checked inflated obstacle",
      );
    }
  }
}

function goalFromDefinition(definition) {
  const [x, , z] = definition.targetZone.position;
  const [width, , depth] = definition.targetZone.size;
  return { x, z, halfWidth: width / 2, halfDepth: depth / 2 };
}

function createNavigation(goal, options = {}) {
  const adapter = options.adapter ?? new KinematicRobotAdapter();
  const commands = options.commands ?? new KinematicCommandRunner(adapter);
  const runner = new BehaviorRunner(behaviorCatalog, commands, adapter, {
    getTargetPosition: () => goal,
    maxNavigationIterations: 500,
    maxNavigationDurationMs: 60_000,
    ...options.runnerOptions,
  });
  runner.selectBehavior("reach-target");
  return { adapter, commands, runner };
}

async function waitForSettled(runner) {
  const startedAt = Date.now();
  while (runner.snapshot.status === "running") {
    if (Date.now() - startedAt > 1_000) throw new Error("verification timed out");
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

assert(NAVIGATION_GRID_SIZE === 0.4, "navigation grid size changed");
assert(
  Math.abs(NAVIGATION_OBSTACLE_INFLATION - 0.675) < 1e-9,
  "robot footprint inflation is incorrect",
);
assert(arenaObstacles.length === 4, "shared arena obstacle catalog changed");

for (const definition of challengeCatalog) {
  const goal = goalFromDefinition(definition);
  const path = planGridPath({ x: 0, z: 0 }, goal);
  assert(path !== null, `no path exists to ${definition.title}`);
  assert(isPathClear(path.waypoints), `path to ${definition.title} clips an obstacle`);
  independentlyVerifyPath(path.waypoints);
  assert(
    path.waypoints.at(-1).x === goal.x && path.waypoints.at(-1).z === goal.z,
    `path to ${definition.title} does not end at the target`,
  );

  const navigation = createNavigation(goal);
  navigation.runner.start();
  await waitForSettled(navigation.runner);
  assert(
    navigation.runner.snapshot.status === "idle",
    `${definition.title}: ${navigation.runner.snapshot.error}`,
  );
  const dx = goal.x - navigation.adapter.odometry.x;
  const dz = goal.z - navigation.adapter.odometry.z;
  assert(
    Math.abs(dx) <= goal.halfWidth && Math.abs(dz) <= goal.halfDepth,
    `robot did not enter ${definition.title}`,
  );
  assert(navigation.commands.operations.at(-1) === "STOP", `${definition.title} did not stop`);
  assert(navigation.adapter.blockedMoves === 0, `${definition.title} follower clipped an obstacle`);
}

{
  let planCalls = 0;
  const countingPlanner = (...args) => {
    planCalls += 1;
    return planGridPath(...args);
  };
  const navigation = createNavigation(
    { x: 0, z: -3, halfWidth: 0.5, halfDepth: 0.5 },
    { runnerOptions: { pathPlanner: countingPlanner } },
  );
  navigation.adapter.distanceReadings = [0.2];
  navigation.runner.start();
  await waitForSettled(navigation.runner);
  assert(planCalls === 2, "unexpected blockage did not trigger one replan");
  assert(navigation.runner.snapshot.status === "idle", "replanned navigation failed");
}

{
  const navigation = createNavigation(
    { x: 0, z: -3, halfWidth: 0.5, halfDepth: 0.5 },
  );
  navigation.adapter.distanceReadings = Array(8).fill(0.2);
  navigation.runner.start();
  await waitForSettled(navigation.runner);
  assert(
    navigation.runner.snapshot.status === "error" &&
      navigation.runner.snapshot.error === "Navigation blocked.",
    "exhausted replans did not fail cleanly",
  );
}

for (const owner of ["Stop", "manual takeover", "mode switch"]) {
  const adapter = new KinematicRobotAdapter();
  const commands = new ControlledCommandRunner(adapter);
  const navigation = createNavigation(
    { x: 0, z: -3, halfWidth: 0.5, halfDepth: 0.5 },
    { adapter, commands },
  );
  navigation.runner.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(commands.operations.at(-1) === "FORWARD", `${owner} setup failed`);
  assert(navigation.runner.stop(), `${owner} did not cancel navigation`);
  const operationCount = commands.operations.length;
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(
    navigation.runner.snapshot.status === "idle" &&
      commands.operations.length === operationCount,
    `${owner} allowed stale navigation`,
  );
}

console.log("Reach Target A* navigation verification passed.");
