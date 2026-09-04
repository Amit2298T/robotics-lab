import type { ChallengeDefinition } from "./challenge.types";

export const reachGoalChallenge: ChallengeDefinition = {
  id: "reach-goal-01",
  title: "Reach the Goal",
  description:
    "Program the robot to reach the green target zone without colliding with an obstacle.",
  difficulty: "beginner",
  hint: "Use small movement steps and adjust the heading before moving forward.",
  recommendedApis: ["forward", "turnLeft", "turnRight"],
  starThresholdsMs: { three: 10_000, two: 20_000, one: 30_000 },
  timeLimitMs: 30_000,
  targetZone: {
    position: [3.7, 0, -3.5],
    size: [1.4, 0.5, 1.4],
  },
  failOnCollision: true,
};

const avoidObstacleChallenge: ChallengeDefinition = {
  id: "avoid-obstacle-01",
  title: "Avoid the Obstacle",
  description:
    "Navigate around the obstacle in the direct path and reach the target without a collision.",
  difficulty: "intermediate",
  hint: "Turn away before the obstacle, move past it, then turn back toward the target.",
  recommendedApis: ["forward", "turnLeft", "turnRight"],
  starThresholdsMs: { three: 12_000, two: 22_000, one: 30_000 },
  timeLimitMs: 30_000,
  targetZone: {
    position: [-2.4, 0, -3.8],
    size: [1.2, 0.5, 1.2],
  },
  failOnCollision: true,
};

const distanceSensorChallenge: ChallengeDefinition = {
  id: "distance-sensor-01",
  title: "Sense and Navigate",
  description:
    "Use robot.distance() to navigate around obstacles and reach the target safely.",
  difficulty: "intermediate",
  hint: "Read the distance before each short move and turn when an obstacle is close.",
  recommendedApis: ["distance", "forward", "turnLeft", "turnRight"],
  starThresholdsMs: { three: 15_000, two: 24_000, one: 30_000 },
  timeLimitMs: 30_000,
  targetZone: {
    position: [1.3, 0, 4.6],
    size: [1.3, 0.5, 1.3],
  },
  failOnCollision: true,
};

const odometryChallenge: ChallengeDefinition = {
  id: "odometry-01",
  title: "Reach the Coordinate",
  description:
    "Use robot.odometry() to reach the target near x = 2.5 m and z = -2.8 m relative to spawn.",
  difficulty: "advanced",
  hint: "Check x, z, and heading after each movement, then correct the remaining error.",
  recommendedApis: ["odometry", "forward", "turnLeft", "turnRight"],
  starThresholdsMs: { three: 15_000, two: 24_000, one: 30_000 },
  timeLimitMs: 30_000,
  targetZone: {
    position: [2.5, 0, -2.8],
    size: [1, 0.5, 1],
  },
  failOnCollision: true,
};

export const challengeCatalog = [
  reachGoalChallenge,
  avoidObstacleChallenge,
  distanceSensorChallenge,
  odometryChallenge,
] as const satisfies readonly ChallengeDefinition[];
