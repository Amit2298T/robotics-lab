export type ChallengeStatus = "idle" | "running" | "success" | "failed";

export type ChallengeFailureReason = "collision" | "timeout";

export type ChallengeDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export type ChallengeApi =
  | "forward"
  | "backward"
  | "turnLeft"
  | "turnRight"
  | "distance"
  | "odometry"
  | "bumped"
  | "wait"
  | "stop";

export type ChallengeTargetZone = {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
};

export type ChallengeStarThresholds = {
  three: number;
  two: number;
  one: number;
};

export type ChallengeDefinition = {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  hint: string;
  recommendedApis: readonly ChallengeApi[];
  starThresholdsMs: ChallengeStarThresholds;
  timeLimitMs: number;
  targetZone: ChallengeTargetZone;
  failOnCollision: boolean;
};

export type ChallengeSnapshot = {
  definition: ChallengeDefinition;
  status: ChallengeStatus;
  failureReason: ChallengeFailureReason | null;
  runId: number | null;
  startedAt: number | null;
  deadline: number | null;
  endedAt: number | null;
};
