import type { RobotOdometry } from "@/simulation/types/robot.types";

export type RobotBehaviorKind =
  | "patrol"
  | "avoid-obstacles"
  | "reach-target"
  | "return-home";

export type RobotBehaviorDefinition = {
  id: string;
  kind: RobotBehaviorKind;
  title: string;
  description: string;
};

export type BehaviorStatus = "idle" | "running" | "paused" | "error";

export type BehaviorDetail =
  | "Planning route"
  | "Navigating"
  | "Turning"
  | "Replanning route"
  | "Target reached";

export type BehaviorSnapshot = {
  definition: RobotBehaviorDefinition;
  status: BehaviorStatus;
  detail: BehaviorDetail | null;
  error: string | null;
};

export type RobotTelemetry = {
  distance: number;
  bumped: boolean;
  odometry: RobotOdometry;
};
