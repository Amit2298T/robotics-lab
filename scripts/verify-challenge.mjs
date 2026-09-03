import { ChallengeEngine } from "../src/challenges/ChallengeEngine.ts";
import {
  BUMPER_IGNORED_USER_DATA_KEY,
  BumperContactTracker,
} from "../src/simulation/robot/bumperSensor.ts";

const definition = {
  id: "reach-goal-test",
  title: "Reach the Goal",
  description: "Test challenge",
  timeLimitMs: 100,
  targetZone: {
    position: [3.7, 0, -3.5],
    size: [1.4, 0.5, 1.4],
  },
  failOnCollision: true,
};

class FakeScheduler {
  currentTime = 0;
  nextId = 1;
  timers = new Map();

  now = () => this.currentTime;

  setTimer = (callback, delayMs) => {
    const id = this.nextId;
    this.nextId += 1;
    this.timers.set(id, {
      callback,
      dueAt: this.currentTime + delayMs,
    });
    return id;
  };

  clearTimer = (id) => {
    this.timers.delete(id);
  };

  advance(milliseconds) {
    this.currentTime += milliseconds;

    for (const [id, timer] of [...this.timers]) {
      if (timer.dueAt <= this.currentTime) {
        this.timers.delete(id);
        timer.callback();
      }
    }
  }
}

function createEngine() {
  const scheduler = new FakeScheduler();
  const terminalSnapshots = [];
  const engine = new ChallengeEngine(definition, {
    scheduler,
    onTerminal: (snapshot) => terminalSnapshots.push(snapshot),
  });
  return { engine, scheduler, terminalSnapshots };
}

function assertStatus(engine, expectedStatus, expectedReason = null) {
  if (
    engine.snapshot.status !== expectedStatus ||
    engine.snapshot.failureReason !== expectedReason
  ) {
    throw new Error(
      `expected ${expectedStatus}/${expectedReason}, received ${engine.snapshot.status}/${engine.snapshot.failureReason}`,
    );
  }
}

{
  const { engine } = createEngine();
  engine.start();
  assertStatus(engine, "running");
  if (engine.snapshot.deadline !== definition.timeLimitMs) {
    throw new Error("challenge timer did not start");
  }
}

{
  const { engine, scheduler, terminalSnapshots } = createEngine();
  engine.start();
  engine.handleTargetReached();
  assertStatus(engine, "success");
  scheduler.advance(definition.timeLimitMs * 2);
  assertStatus(engine, "success");
  if (terminalSnapshots.length !== 1) {
    throw new Error("success did not clear its timeout");
  }
}

{
  const { engine, scheduler } = createEngine();
  engine.start();
  engine.handleCollision();
  assertStatus(engine, "failed", "collision");
  engine.handleTargetReached();
  scheduler.advance(definition.timeLimitMs * 2);
  assertStatus(engine, "failed", "collision");
}

{
  const { engine, scheduler } = createEngine();
  engine.start();
  scheduler.advance(definition.timeLimitMs);
  assertStatus(engine, "failed", "timeout");
}

{
  const { engine, scheduler } = createEngine();
  engine.start();
  engine.reset();
  scheduler.advance(definition.timeLimitMs * 2);
  assertStatus(engine, "idle");
}

{
  const { engine } = createEngine();
  const bumper = new BumperContactTracker();
  bumper.setInternalBodyHandles([10, 11, 12]);
  const isValidHit = bumper.beginContact({
    colliderHandle: 1,
    rigidBodyHandle: 100,
    rigidBodyUserData: { [BUMPER_IGNORED_USER_DATA_KEY]: true },
  });

  engine.start();
  if (isValidHit) {
    engine.handleCollision();
  }
  assertStatus(engine, "running");
}

{
  const { engine } = createEngine();
  assertStatus(engine, "idle");
  // Manual movement and Run Demo intentionally make no ChallengeEngine call.
  assertStatus(engine, "idle");
}

console.log("Challenge verification passed.");
