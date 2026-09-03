import type { ChallengeDefinition } from "./challenge.types";

export const reachGoalChallenge: ChallengeDefinition = {
  id: "reach-goal-01",
  title: "Reach the Goal",
  description:
    "Program the robot to reach the green target zone without colliding with an obstacle.",
  timeLimitMs: 30_000,
  targetZone: {
    position: [3.7, 0, -3.5],
    size: [1.4, 0.5, 1.4],
  },
  failOnCollision: true,
};
