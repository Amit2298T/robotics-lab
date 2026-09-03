import type { WheelVelocityCommand } from "@/simulation/types/robot.types";

export type RobotCommand =
  | { type: "MOVE_FORWARD" }
  | { type: "MOVE_BACKWARD" }
  | { type: "TURN_LEFT" }
  | { type: "TURN_RIGHT" }
  | { type: "STOP" }
  | {
      type: "SET_WHEEL_VELOCITIES";
      payload: WheelVelocityCommand;
    };

