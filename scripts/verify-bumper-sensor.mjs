import {
  BUMPER_IGNORED_USER_DATA_KEY,
  BumperContactTracker,
} from "../src/simulation/robot/bumperSensor.ts";

const tracker = new BumperContactTracker();
tracker.setInternalBodyHandles([10, 11, 12]);

function assertBumped(expected, label) {
  if (tracker.bumped !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${tracker.bumped}`);
  }
}

tracker.beginContact({
  colliderHandle: 1,
  rigidBodyHandle: 100,
  rigidBodyUserData: { [BUMPER_IGNORED_USER_DATA_KEY]: true },
});
assertBumped(false, "ground contact");

tracker.beginContact({
  colliderHandle: 2,
  rigidBodyHandle: 200,
  rigidBodyUserData: undefined,
});
assertBumped(true, "external obstacle contact");
tracker.endContact(2);
assertBumped(false, "external obstacle exit");

tracker.beginContact({
  colliderHandle: 3,
  rigidBodyHandle: 11,
  rigidBodyUserData: undefined,
});
assertBumped(false, "internal wheel contact");

tracker.beginContact({
  colliderHandle: 4,
  rigidBodyHandle: 201,
  rigidBodyUserData: undefined,
});
tracker.beginContact({
  colliderHandle: 5,
  rigidBodyHandle: 202,
  rigidBodyUserData: undefined,
});
assertBumped(true, "two external contacts");
tracker.endContact(4);
assertBumped(true, "one of two external contacts ended");
tracker.endContact(5);
assertBumped(false, "all external contacts ended");

tracker.beginContact({
  colliderHandle: 6,
  rigidBodyHandle: 203,
  rigidBodyUserData: undefined,
});
tracker.clear();
assertBumped(false, "reset clears contacts");

console.log("Bumper sensor verification passed.");
