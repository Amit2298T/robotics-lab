import type { ChallengeDefinition } from "../challenge.types";
import { calculateCompletionResult } from "./challengeScoring.ts";
import type {
  ChallengeCompletionResult,
  ChallengeProgress,
  ChallengeProgressPersistence,
  ChallengeStars,
} from "./challengeProgress.types";

type ProgressListener = () => void;

type RecordSuccessInput = {
  definition: ChallengeDefinition;
  runId: number;
  elapsedTimeMs: number;
};

const PROGRESS_VERSION = 1 as const;

export class ChallengeProgressStore {
  private readonly persistence: ChallengeProgressPersistence;
  private readonly now: () => Date;
  private readonly listeners = new Set<ProgressListener>();
  private readonly recordedSuccesses = new Set<string>();
  private progressByChallenge: Record<string, ChallengeProgress> = {};
  private hydrated = false;

  constructor(
    persistence: ChallengeProgressPersistence,
    options: { now?: () => Date } = {},
  ) {
    this.persistence = persistence;
    this.now = options.now ?? (() => new Date());
  }

  hydrate(): void {
    if (this.hydrated) {
      return;
    }

    this.hydrated = true;
    let persisted: unknown = null;
    try {
      persisted = this.persistence.load();
    } catch {
      // Persistence failures must not prevent an in-memory session.
    }
    this.progressByChallenge = parseProgressDocument(persisted);
    this.emit();
  }

  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getProgress(challengeId: string): ChallengeProgress {
    return {
      ...(this.progressByChallenge[challengeId] ??
        createEmptyProgress(challengeId)),
    };
  }

  getAllProgress(): Record<string, ChallengeProgress> {
    return Object.fromEntries(
      Object.entries(this.progressByChallenge).map(([id, progress]) => [
        id,
        { ...progress },
      ]),
    );
  }

  recordAttempt(challengeId: string): ChallengeProgress {
    const current = this.getProgress(challengeId);
    const updated = {
      ...current,
      attempts: current.attempts + 1,
    };
    this.update(updated);
    return { ...updated };
  }

  recordSuccess(
    input: RecordSuccessInput,
  ): ChallengeCompletionResult | null {
    const completionKey = `${input.definition.id}:${input.runId}`;
    if (this.recordedSuccesses.has(completionKey)) {
      return null;
    }

    const result = calculateCompletionResult(
      input.definition,
      input.elapsedTimeMs,
    );
    const current = this.getProgress(input.definition.id);
    const updated: ChallengeProgress = {
      ...current,
      completions: current.completions + 1,
      bestTimeMs:
        current.bestTimeMs === null
          ? result.elapsedTimeMs
          : Math.min(current.bestTimeMs, result.elapsedTimeMs),
      bestScore:
        current.bestScore === null
          ? result.score
          : Math.max(current.bestScore, result.score),
      stars: Math.max(current.stars, result.stars) as ChallengeStars,
      lastCompletedAt: this.now().toISOString(),
    };

    this.recordedSuccesses.add(completionKey);
    this.update(updated);
    return result;
  }

  private update(progress: ChallengeProgress): void {
    this.progressByChallenge = {
      ...this.progressByChallenge,
      [progress.challengeId]: progress,
    };
    this.persist();
    this.emit();
  }

  private persist(): void {
    try {
      this.persistence.save({
        version: PROGRESS_VERSION,
        challenges: this.progressByChallenge,
      });
    } catch {
      // Persistence failures must not discard valid in-memory progress.
    }
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function createEmptyProgress(challengeId: string): ChallengeProgress {
  return {
    challengeId,
    attempts: 0,
    completions: 0,
    bestTimeMs: null,
    bestScore: null,
    stars: 0,
    lastCompletedAt: null,
  };
}

function parseProgressDocument(value: unknown): Record<string, ChallengeProgress> {
  if (!isRecord(value) || value.version !== PROGRESS_VERSION) {
    return {};
  }

  if (!isRecord(value.challenges)) {
    return {};
  }

  const validProgress: Record<string, ChallengeProgress> = {};
  for (const [challengeId, progress] of Object.entries(value.challenges)) {
    if (isChallengeProgress(progress, challengeId)) {
      validProgress[challengeId] = progress;
    }
  }

  return validProgress;
}

function isChallengeProgress(
  value: unknown,
  challengeId: string,
): value is ChallengeProgress {
  if (!isRecord(value) || value.challengeId !== challengeId) {
    return false;
  }

  return (
    isNonNegativeInteger(value.attempts) &&
    isNonNegativeInteger(value.completions) &&
    isNullableNonNegativeNumber(value.bestTimeMs) &&
    isNullableNonNegativeNumber(value.bestScore) &&
    isStars(value.stars) &&
    (value.lastCompletedAt === null ||
      typeof value.lastCompletedAt === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isNullableNonNegativeNumber(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value) && value >= 0)
  );
}

function isStars(value: unknown): value is ChallengeStars {
  return value === 0 || value === 1 || value === 2 || value === 3;
}
