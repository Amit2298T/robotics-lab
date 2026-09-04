import type { RobotBehaviorDefinition } from "./behavior.types";

export const behaviorCatalog = [
  {
    id: "patrol",
    kind: "patrol",
    title: "Patrol",
    description: "Move forward and turn periodically until stopped.",
  },
  {
    id: "avoid-obstacles",
    kind: "avoid-obstacles",
    title: "Avoid Obstacles",
    description:
      "Use the distance sensor to turn away from nearby obstacles.",
  },
  {
    id: "reach-target",
    kind: "reach-target",
    title: "Reach Target",
    description:
      "Navigate autonomously to the selected target using odometry and obstacle sensing.",
  },
  {
    id: "return-home",
    kind: "return-home",
    title: "Return Home",
    description:
      "Use odometry corrections to move back toward the spawn point.",
  },
] as const satisfies readonly RobotBehaviorDefinition[];
