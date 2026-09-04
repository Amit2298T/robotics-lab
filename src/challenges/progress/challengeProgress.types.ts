export type ChallengeStars = 0 | 1 | 2 | 3;

export type ChallengeProgress = {
  challengeId: string;
  attempts: number;
  completions: number;
  bestTimeMs: number | null;
  bestScore: number | null;
  stars: ChallengeStars;
  lastCompletedAt: string | null;
};

export type ChallengeCompletionResult = {
  elapsedTimeMs: number;
  score: number;
  stars: ChallengeStars;
};

export type ChallengeProgressDocument = {
  version: 1;
  challenges: Record<string, ChallengeProgress>;
};

export type ChallengeProgressPersistence = {
  load(): unknown;
  save(document: ChallengeProgressDocument): void;
};
