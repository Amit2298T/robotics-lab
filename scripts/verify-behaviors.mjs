import { behaviorCatalog } from "../src/behaviors/behavior.config.ts";
import { BehaviorRunner } from "../src/behaviors/BehaviorRunner.ts";
import { DEFAULT_SIMULATOR_MODE } from "../src/components/simulator/simulator.types.ts";
import { ChallengeProgressStore } from "../src/challenges/progress/ChallengeProgressStore.ts";

class FakeCommandRunner {
  operations = [];
  pending = null;

  forward = () => this.begin("FORWARD");
  backward = () => this.begin("BACKWARD");
  turnLeft = () => this.begin("TURN_LEFT");
  turnRight = () => this.begin("TURN_RIGHT");
  stop = () => this.cancel();

  cancel = () => {
    this.operations.push("STOP");
    if (this.pending) {
      const error = new Error("cancelled");
      error.name = "CommandCancelledError";
      this.pending.reject(error);
      this.pending = null;
    }
  };

  completeCurrent() {
    const pending = this.pending;
    this.pending = null;
    pending?.resolve();
  }

  begin(operation) {
    this.operations.push(operation);
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
    });
  }
}

class FakeRobotAdapter {
  distance = 5;
  distanceReads = 0;
  odometryReads = 0;
  odometry = { x: 1, z: 0, heading: 0 };

  setWheelVelocities() {}
  stop() {}
  getPose() {
    return null;
  }
  readDistanceSensor = async () => {
    this.distanceReads += 1;
    return this.distance;
  };
  readBumperSensor = async () => false;
  subscribeBumperHits = () => () => {};
  readOdometry = async () => {
    this.odometryReads += 1;
    return this.odometry;
  };
}

const zeroTimings = {
  patrolForwardMs: 0,
  patrolTurnMs: 0,
  avoidanceForwardMs: 0,
  avoidanceTurnMs: 0,
  reachForwardStepMs: 0,
  reachTurnStepMs: 0,
  reachAvoidanceForwardMs: 0,
  reachAvoidanceTurnMs: 0,
  returnTurnMs: 0,
  returnForwardMs: 0,
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createRunner() {
  const commands = new FakeCommandRunner();
  const adapter = new FakeRobotAdapter();
  let ownershipTakeovers = 0;
  const runner = new BehaviorRunner(behaviorCatalog, commands, adapter, {
    timings: zeroTimings,
    getTargetPosition: () => ({ x: 1, z: -1 }),
    onBeforeStart: () => {
      ownershipTakeovers += 1;
    },
  });
  return { runner, commands, adapter, getTakeovers: () => ownershipTakeovers };
}

assert(DEFAULT_SIMULATOR_MODE === "operate", "Operate Mode is not the default");
assert(behaviorCatalog.length === 4, "four behaviors are required");

{
  const { runner, commands, getTakeovers } = createRunner();
  assert(runner.start(), "Patrol did not start");
  assert(!runner.start(), "overlapping behavior was accepted");
  await flush();
  assert(commands.operations.at(-1) === "FORWARD", "Patrol did not move");
  commands.completeCurrent();
  await flush();
  assert(commands.operations.at(-1) === "TURN_LEFT", "Patrol did not turn");
  commands.completeCurrent();
  await flush();
  assert(commands.operations.at(-1) === "FORWARD", "Patrol did not repeat");
  assert(getTakeovers() === 1, "behavior ownership was acquired incorrectly");

  assert(runner.pause(), "Patrol did not pause");
  await flush();
  const countWhilePaused = commands.operations.length;
  await flush();
  assert(runner.snapshot.status === "paused", "pause status was not retained");
  assert(
    commands.operations.length === countWhilePaused &&
      commands.operations.at(-1) === "STOP",
    "paused behavior continued issuing commands",
  );

  assert(runner.resume(), "Patrol did not resume");
  await flush();
  assert(
    runner.snapshot.status === "running" &&
      commands.operations.at(-1) === "FORWARD",
    "resumed Patrol did not continue",
  );

  assert(runner.stop(), "Patrol did not stop");
  const countAfterStop = commands.operations.length;
  await flush();
  await flush();
  assert(runner.snapshot.status === "idle", "Stop did not release ownership");
  assert(
    commands.operations.length === countAfterStop &&
      commands.operations.at(-1) === "STOP",
    "a stale behavior command resumed after Stop",
  );
  commands.operations.push("MANUAL_FORWARD");
  await flush();
  assert(
    commands.operations.at(-1) === "MANUAL_FORWARD",
    "stopped behavior interfered with manual takeover",
  );
}

{
  const { runner, commands, adapter } = createRunner();
  runner.selectBehavior("avoid-obstacles");
  adapter.distance = 0.5;
  runner.start();
  await flush();
  assert(adapter.distanceReads > 0, "Avoid Obstacles did not read distance");
  assert(
    commands.operations.at(-1) === "TURN_RIGHT",
    "Avoid Obstacles did not turn near an obstacle",
  );
  runner.stop();
}

{
  const { runner, commands } = createRunner();
  runner.selectBehavior("reach-target");
  runner.start();
  await flush();
  assert(commands.operations.at(-1) === "FORWARD", "Reach Target did not start");
  runner.stop();
  await flush();
  assert(runner.snapshot.status === "idle", "Reach Target did not stop");
}

{
  const { runner, commands, adapter } = createRunner();
  runner.selectBehavior("return-home");
  runner.start();
  await flush();
  assert(adapter.odometryReads > 0, "Return Home did not read odometry");
  assert(
    commands.operations.at(-1) === "TURN_LEFT",
    "Return Home did not correct its heading",
  );
  runner.stop();
}

{
  const progressPersistence = { load: () => null, save: () => {} };
  const progressStore = new ChallengeProgressStore(progressPersistence);
  progressStore.hydrate();
  const before = progressStore.getAllProgress();
  const { runner } = createRunner();
  runner.selectBehavior("reach-target");
  runner.start();
  await flush();
  runner.stop();
  assert(
    JSON.stringify(progressStore.getAllProgress()) === JSON.stringify(before),
    "Operate behavior changed challenge progress",
  );
}

console.log("Behavior verification passed.");
