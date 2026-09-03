export type ChallengeStatus = "idle" | "running" | "success" | "failed";

export type ChallengeFailureReason = "collision" | "timeout";

export type ChallengeTargetZone = {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
};

export type ChallengeDefinition = {
  id: string;
  title: string;
  description: string;
  timeLimitMs: number;
  targetZone: ChallengeTargetZone;
  failOnCollision: boolean;
};

export type ChallengeSnapshot = {
  definition: ChallengeDefinition;
  status: ChallengeStatus;
  failureReason: ChallengeFailureReason | null;
  startedAt: number | null;
  deadline: number | null;
  endedAt: number | null;
};
