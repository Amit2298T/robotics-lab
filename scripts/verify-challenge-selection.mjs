import { ChallengeEngine } from "../src/challenges/ChallengeEngine.ts";
import {
  challengeCatalog,
  reachGoalChallenge,
} from "../src/challenges/challenge.config.ts";

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const scheduler = new FakeScheduler();
const engine = new ChallengeEngine(challengeCatalog, { scheduler });

assert(challengeCatalog.length >= 4, "catalog must contain four challenges");
assert(
  engine.snapshot.definition.id === "reach-goal-01",
  "Reach the Goal must be the default challenge",
);
assert(
  JSON.stringify(reachGoalChallenge.targetZone) ===
    JSON.stringify({
      position: [3.7, 0, -3.5],
      size: [1.4, 0.5, 1.4],
    }),
  "legacy Reach the Goal target changed",
);
assert(
  reachGoalChallenge.timeLimitMs === 30_000 &&
    reachGoalChallenge.failOnCollision,
  "legacy Reach the Goal rules changed",
);

const ids = new Set();
const targets = new Set();
for (const definition of challengeCatalog) {
  ids.add(definition.id);
  targets.add(JSON.stringify(definition.targetZone));
  assert(definition.timeLimitMs > 0, `${definition.id} has an invalid timer`);
  assert(
    definition.targetZone.size.every(
      (dimension) => Number.isFinite(dimension) && dimension > 0,
    ),
    `${definition.id} has an invalid target size`,
  );
}
assert(ids.size === challengeCatalog.length, "challenge IDs are not unique");
assert(
  targets.size === challengeCatalog.length,
  "each challenge must have a unique target configuration",
);

engine.start();
assert(engine.snapshot.status === "running", "default challenge did not start");
assert(scheduler.timers.size === 1, "default challenge timer was not set");
const staleTimeout = [...scheduler.timers.values()][0].callback;

assert(
  engine.selectChallenge("avoid-obstacle-01"),
  "challenge selection was rejected",
);
assert(
  engine.snapshot.definition.id === "avoid-obstacle-01" &&
    engine.snapshot.status === "idle",
  "selection did not load challenge 2 as idle",
);
assert(scheduler.timers.size === 0, "old challenge timer was not cleared");
staleTimeout();
scheduler.advance(60_000);
assert(
  engine.snapshot.status === "idle",
  "a stale timeout affected the selected challenge",
);

engine.start();
engine.handleTargetReached();
assert(
  engine.snapshot.status === "success" &&
    engine.snapshot.definition.id === "avoid-obstacle-01",
  "success was not applied to the selected challenge",
);
engine.reset();
assert(
  engine.snapshot.status === "idle" &&
    engine.snapshot.definition.id === "avoid-obstacle-01",
  "reset changed the selected challenge",
);

// Manual controls and Run Demo intentionally do not call start().
assert(
  engine.snapshot.status === "idle",
  "non-program controls started the selected challenge",
);

assert(
  engine.selectChallenge("distance-sensor-01") &&
    engine.snapshot.definition.targetZone.position[2] === 4.6,
  "selected target configuration did not update",
);
assert(
  !engine.selectChallenge("missing-challenge") &&
    engine.snapshot.definition.id === "distance-sensor-01",
  "unknown selection changed engine state",
);

console.log("Challenge selection verification passed.");
