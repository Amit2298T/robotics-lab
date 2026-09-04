export type ChallengeProgressAggregate = {
  attempts: number;
  completions: number;
  bestTimeMs: number | null;
  bestScore: number | null;
  stars: number;
  lastCompletedAt: Date | null;
};

export type ChallengeSuccessResult = {
  elapsedTimeMs: number;
  score: number;
  stars: number;
  endedAt: Date;
};

export function applyChallengeSuccess(
  current: ChallengeProgressAggregate,
  result: ChallengeSuccessResult,
  countAttempt: boolean,
): ChallengeProgressAggregate {
  return {
    attempts: current.attempts + (countAttempt ? 1 : 0),
    completions: current.completions + 1,
    bestTimeMs:
      current.bestTimeMs === null
        ? result.elapsedTimeMs
        : Math.min(current.bestTimeMs, result.elapsedTimeMs),
    bestScore:
      current.bestScore === null
        ? result.score
        : Math.max(current.bestScore, result.score),
    stars: Math.max(current.stars, result.stars),
    lastCompletedAt: result.endedAt,
  };
}
