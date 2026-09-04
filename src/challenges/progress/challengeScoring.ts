import type { ChallengeDefinition } from "../challenge.types";
import type {
  ChallengeCompletionResult,
  ChallengeStars,
} from "./challengeProgress.types";

export function calculateChallengeScore(elapsedTimeMs: number): number {
  const safeElapsedTimeMs = Math.max(0, Math.floor(elapsedTimeMs));
  return Math.max(100, 1_000 - Math.floor(safeElapsedTimeMs / 100));
}

export function calculateChallengeStars(
  definition: ChallengeDefinition,
  elapsedTimeMs: number,
): ChallengeStars {
  if (elapsedTimeMs <= definition.starThresholdsMs.three) {
    return 3;
  }

  if (elapsedTimeMs <= definition.starThresholdsMs.two) {
    return 2;
  }

  return elapsedTimeMs <= definition.starThresholdsMs.one ? 1 : 0;
}

export function calculateCompletionResult(
  definition: ChallengeDefinition,
  elapsedTimeMs: number,
): ChallengeCompletionResult {
  const safeElapsedTimeMs = Math.max(
    0,
    Math.min(definition.timeLimitMs, Math.floor(elapsedTimeMs)),
  );

  return {
    elapsedTimeMs: safeElapsedTimeMs,
    score: calculateChallengeScore(safeElapsedTimeMs),
    stars: calculateChallengeStars(definition, safeElapsedTimeMs),
  };
}
