export type ChallengeAttemptStatusDto =
  | "started"
  | "success"
  | "failed"
  | "cancelled";

export type ChallengeProgressDto = {
  id: string | null;
  userId: string;
  challengeId: string;
  attempts: number;
  completions: number;
  bestTimeMs: number | null;
  bestScore: number | null;
  stars: number;
  lastCompletedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ChallengeAttemptDto = {
  id: string;
  userId: string;
  challengeId: string;
  runId: number;
  status: ChallengeAttemptStatusDto;
  elapsedTimeMs: number | null;
  score: number | null;
  stars: number | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};

export type RecordChallengeAttemptInput = {
  challengeId: string;
  runId: number;
  startedAt?: Date;
};

export type RecordChallengeSuccessInput = {
  challengeId: string;
  runId: number;
  elapsedTimeMs: number;
  startedAt?: Date;
  endedAt?: Date;
};

export type ChallengeProgressMutationDto = {
  progress: ChallengeProgressDto;
  attempt: ChallengeAttemptDto;
  duplicate: boolean;
};
