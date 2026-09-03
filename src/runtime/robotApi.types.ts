export type RobotApiCommand =
  | { type: "FORWARD"; durationMs: number }
  | { type: "BACKWARD"; durationMs: number }
  | { type: "TURN_LEFT"; durationMs: number }
  | { type: "TURN_RIGHT"; durationMs: number }
  | { type: "WAIT"; durationMs: number }
  | { type: "STOP" };
