import type { RobotOdometry } from "../simulation/types/robot.types";

export type SensorRequest =
  | { type: "DISTANCE" }
  | { type: "BUMPER" }
  | { type: "ODOMETRY" };

export type SensorReading =
  | {
      type: "DISTANCE";
      value: number;
    }
  | {
      type: "BUMPER";
      value: boolean;
    }
  | {
      type: "ODOMETRY";
      value: RobotOdometry;
    };
