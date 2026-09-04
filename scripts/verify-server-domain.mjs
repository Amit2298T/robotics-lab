import { applyChallengeSuccess } from "../src/server/domain/challengeProgress.domain.ts";
import { ResourceNotFoundError } from "../src/server/errors.ts";
import { ChallengeProgressService } from "../src/server/services/challengeProgress.service.ts";
import { ProgramService } from "../src/server/services/program.service.ts";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class MemoryProgramRepository {
  records = [];
  nextId = 1;

  async listByUser(userId) {
    return this.records.filter((record) => record.userId === userId);
  }

  async findByIdForUser(userId, programId) {
    return (
      this.records.find(
        (record) => record.id === programId && record.userId === userId,
      ) ?? null
    );
  }

  async create(userId, data) {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const record = {
      ...data,
      id: `program-${this.nextId++}`,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(record);
    return record;
  }

  async updateForUser(userId, programId, data) {
    const record = await this.findByIdForUser(userId, programId);
    if (!record) return null;
    Object.assign(record, data, { updatedAt: new Date("2026-09-04T13:00:00.000Z") });
    return record;
  }

  async deleteForUser(userId, programId) {
    const index = this.records.findIndex(
      (record) => record.id === programId && record.userId === userId,
    );
    if (index < 0) return false;
    this.records.splice(index, 1);
    return true;
  }
}

class MemoryChallengeProgressRepository {
  progress = new Map();
  attempts = new Map();
  nextProgressId = 1;
  nextAttemptId = 1;

  key(userId, challengeId) {
    return `${userId}:${challengeId}`;
  }

  attemptKey(userId, challengeId, runId) {
    return `${this.key(userId, challengeId)}:${runId}`;
  }

  async get(userId, challengeId) {
    return this.progress.get(this.key(userId, challengeId)) ?? null;
  }

  async list(userId) {
    return [...this.progress.values()].filter((record) => record.userId === userId);
  }

  ensureProgress(userId, challengeId) {
    const key = this.key(userId, challengeId);
    let record = this.progress.get(key);
    if (!record) {
      const now = new Date("2026-09-04T12:00:00.000Z");
      record = {
        id: `progress-${this.nextProgressId++}`,
        userId,
        challengeId,
        attempts: 0,
        completions: 0,
        bestTimeMs: null,
        bestScore: null,
        stars: 0,
        lastCompletedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.progress.set(key, record);
    }
    return record;
  }

  async recordAttempt(input) {
    const key = this.attemptKey(input.userId, input.challengeId, input.runId);
    const existing = this.attempts.get(key);
    const progress = this.ensureProgress(input.userId, input.challengeId);
    if (existing) return { progress, attempt: existing, duplicate: true };
    const attempt = {
      ...input,
      id: `attempt-${this.nextAttemptId++}`,
      status: "STARTED",
      elapsedTimeMs: null,
      score: null,
      stars: null,
      endedAt: null,
      createdAt: input.startedAt,
    };
    this.attempts.set(key, attempt);
    progress.attempts += 1;
    return { progress, attempt, duplicate: false };
  }

  async recordSuccess(input) {
    const key = this.attemptKey(input.userId, input.challengeId, input.runId);
    const existing = this.attempts.get(key);
    const progress = this.ensureProgress(input.userId, input.challengeId);
    if (existing?.status === "SUCCESS") {
      return { progress, attempt: existing, duplicate: true };
    }
    const countAttempt = !existing;
    const attempt = {
      ...(existing ?? {
        id: `attempt-${this.nextAttemptId++}`,
        userId: input.userId,
        challengeId: input.challengeId,
        runId: input.runId,
        startedAt: input.startedAt,
        createdAt: input.startedAt,
      }),
      status: "SUCCESS",
      elapsedTimeMs: input.result.elapsedTimeMs,
      score: input.result.score,
      stars: input.result.stars,
      endedAt: input.result.endedAt,
    };
    this.attempts.set(key, attempt);
    Object.assign(
      progress,
      applyChallengeSuccess(progress, input.result, countAttempt),
      { updatedAt: input.result.endedAt },
    );
    return { progress, attempt, duplicate: false };
  }
}

const programRepository = new MemoryProgramRepository();
const programs = new ProgramService(programRepository);
const created = await programs.createProgram("user-a", {
  name: "  Wall follower  ",
  sourceCode: "await robot.forward(500);",
});
assert(created.name === "Wall follower", "program name was not normalized");
assert(created.language === "javascript", "default program language is incorrect");
assert((await programs.listProgramsByUser("user-a")).length === 1, "owned program not listed");
assert((await programs.listProgramsByUser("user-b")).length === 0, "foreign program leaked into list");

let foreignReadRejected = false;
try {
  await programs.getProgramById("user-b", created.id);
} catch (error) {
  foreignReadRejected = error instanceof ResourceNotFoundError;
}
assert(foreignReadRejected, "foreign program read was not rejected");

const updated = await programs.updateProgram("user-a", created.id, {
  name: "Updated controller",
});
assert(updated.name === "Updated controller", "owned program was not updated");

let foreignUpdateRejected = false;
try {
  await programs.updateProgram("user-b", created.id, { name: "Foreign edit" });
} catch (error) {
  foreignUpdateRejected = error instanceof ResourceNotFoundError;
}
assert(foreignUpdateRejected, "foreign program update was not rejected");
await programs.deleteProgram("user-a", created.id);
assert((await programs.listProgramsByUser("user-a")).length === 0, "owned program was not deleted");

const progressRepository = new MemoryChallengeProgressRepository();
const progressService = new ChallengeProgressService(progressRepository);
const challengeId = "reach-goal-01";
const userId = "user-a";
const fresh = await progressService.getChallengeProgress(userId, challengeId);
assert(fresh.attempts === 0 && fresh.completions === 0, "fresh progress is not empty");

await progressService.recordChallengeAttempt(userId, { challengeId, runId: 1 });
let progress = await progressService.getChallengeProgress(userId, challengeId);
assert(progress.attempts === 1, "attempt was not counted");

await progressService.recordChallengeSuccess(userId, {
  challengeId,
  runId: 1,
  elapsedTimeMs: 25_000,
});
progress = await progressService.getChallengeProgress(userId, challengeId);
assert(
  progress.completions === 1 &&
    progress.bestTimeMs === 25_000 &&
    progress.bestScore === 750 &&
    progress.stars === 1,
  "first success aggregate is incorrect",
);

await progressService.recordChallengeAttempt(userId, { challengeId, runId: 2 });
await progressService.recordChallengeSuccess(userId, {
  challengeId,
  runId: 2,
  elapsedTimeMs: 29_000,
});
progress = await progressService.getChallengeProgress(userId, challengeId);
assert(
  progress.bestTimeMs === 25_000 && progress.bestScore === 750 && progress.stars === 1,
  "slower success worsened best progress",
);

await progressService.recordChallengeAttempt(userId, { challengeId, runId: 3 });
await progressService.recordChallengeSuccess(userId, {
  challengeId,
  runId: 3,
  elapsedTimeMs: 8_000,
});
const duplicate = await progressService.recordChallengeSuccess(userId, {
  challengeId,
  runId: 3,
  elapsedTimeMs: 8_000,
});
progress = await progressService.getChallengeProgress(userId, challengeId);
assert(
  progress.attempts === 3 &&
    progress.completions === 3 &&
    progress.bestTimeMs === 8_000 &&
    progress.bestScore === 920 &&
    progress.stars === 3,
  "faster success did not improve best progress",
);
assert(duplicate.duplicate, "duplicate runId was not rejected idempotently");

console.log("Server domain verification passed.");
