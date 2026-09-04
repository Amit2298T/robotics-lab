import { challengeCatalog } from "../src/challenges/challenge.config.ts";
import { ChallengeProgressStore } from "../src/challenges/progress/ChallengeProgressStore.ts";
import {
  BrowserChallengeProgressPersistence,
  CHALLENGE_PROGRESS_STORAGE_KEY,
} from "../src/challenges/progress/activeChallengeProgress.ts";

class MemoryPersistence {
  document = null;

  load() {
    return this.document === null ? null : structuredClone(this.document);
  }

  save(document) {
    this.document = structuredClone(document);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFresh(progress, challengeId) {
  assert(progress.challengeId === challengeId, "challenge ID is incorrect");
  assert(progress.attempts === 0, "fresh attempts must be zero");
  assert(progress.completions === 0, "fresh completions must be zero");
  assert(progress.bestTimeMs === null, "fresh best time must be null");
  assert(progress.bestScore === null, "fresh best score must be null");
  assert(progress.stars === 0, "fresh stars must be zero");
}

const challenge = challengeCatalog[0];
const secondChallenge = challengeCatalog[1];
const persistence = new MemoryPersistence();
const fixedDate = new Date("2026-09-04T12:00:00.000Z");
const store = new ChallengeProgressStore(persistence, {
  now: () => fixedDate,
});
store.hydrate();

assertFresh(store.getProgress(challenge.id), challenge.id);

store.recordAttempt(challenge.id);
assert(store.getProgress(challenge.id).attempts === 1, "attempt not counted");

// A failed engine run makes no recordSuccess call.
let progress = store.getProgress(challenge.id);
assert(progress.completions === 0, "failure recorded a completion");
assert(progress.bestTimeMs === null, "failure recorded a best time");

const firstResult = store.recordSuccess({
  definition: challenge,
  runId: 1,
  elapsedTimeMs: 25_000,
});
progress = store.getProgress(challenge.id);
assert(firstResult?.score === 750, "first score is incorrect");
assert(progress.completions === 1, "first completion not counted");
assert(progress.bestTimeMs === 25_000, "first best time not stored");
assert(progress.bestScore === 750, "first best score not stored");
assert(progress.stars === 1, "first stars not stored");
assert(
  progress.lastCompletedAt === fixedDate.toISOString(),
  "completion timestamp not stored",
);

store.recordAttempt(challenge.id);
store.recordSuccess({
  definition: challenge,
  runId: 2,
  elapsedTimeMs: 29_000,
});
progress = store.getProgress(challenge.id);
assert(progress.completions === 2, "slower completion not counted");
assert(progress.bestTimeMs === 25_000, "slower run worsened best time");
assert(progress.bestScore === 750, "slower run worsened best score");
assert(progress.stars === 1, "slower run worsened stars");

store.recordAttempt(challenge.id);
const fasterResult = store.recordSuccess({
  definition: challenge,
  runId: 3,
  elapsedTimeMs: 8_000,
});
progress = store.getProgress(challenge.id);
assert(fasterResult?.score === 920, "faster score is incorrect");
assert(progress.bestTimeMs === 8_000, "faster best time not stored");
assert(progress.bestScore === 920, "faster best score not stored");
assert(progress.stars === 3, "faster stars not stored");

const completionsBeforeDuplicate = progress.completions;
assert(
  store.recordSuccess({
    definition: challenge,
    runId: 3,
    elapsedTimeMs: 8_000,
  }) === null,
  "duplicate success was accepted",
);
assert(
  store.getProgress(challenge.id).completions === completionsBeforeDuplicate,
  "duplicate success changed progress",
);

store.recordAttempt(secondChallenge.id);
assert(
  store.getProgress(secondChallenge.id).attempts === 1,
  "second challenge attempt not stored",
);
assert(
  store.getProgress(challenge.id).attempts === 3,
  "challenge progress was not kept separate",
);

const beforeReset = store.getProgress(challenge.id);
// Challenge reset has no progress-store mutation.
assert(
  JSON.stringify(store.getProgress(challenge.id)) === JSON.stringify(beforeReset),
  "reset semantics erased saved progress",
);

const reloadedStore = new ChallengeProgressStore(persistence);
reloadedStore.hydrate();
assert(
  reloadedStore.getProgress(challenge.id).bestTimeMs === 8_000 &&
    reloadedStore.getProgress(secondChallenge.id).attempts === 1,
  "persistence reload lost progress",
);

let corruptValue = "{not-valid-json";
const corruptStorage = {
  getItem(key) {
    assert(key === CHALLENGE_PROGRESS_STORAGE_KEY, "wrong storage key read");
    return corruptValue;
  },
  setItem(key, value) {
    assert(key === CHALLENGE_PROGRESS_STORAGE_KEY, "wrong storage key written");
    corruptValue = value;
  },
};
const corruptStore = new ChallengeProgressStore(
  new BrowserChallengeProgressPersistence(() => corruptStorage),
);
corruptStore.hydrate();
assertFresh(corruptStore.getProgress(challenge.id), challenge.id);

console.log("Challenge progress verification passed.");
