import type { RobotApiCommand } from "./robotApi.types";
import type { ProgramConsoleLevel } from "./program.types";
import type { SensorReading, SensorRequest } from "./sensor.types";

export type MainToWorkerMessage =
  | {
      type: "RUN_PROGRAM";
      programId: string;
      source: string;
    }
  | { type: "STOP_PROGRAM"; programId: string }
  | {
      type: "ROBOT_COMMAND_RESULT";
      programId: string;
      commandId: number;
      result: "COMPLETED" | "ERROR";
      error?: string;
    }
  | {
      type: "SENSOR_RESULT";
      programId: string;
      requestId: number;
      result: "COMPLETED";
      reading: SensorReading;
    }
  | {
      type: "SENSOR_RESULT";
      programId: string;
      requestId: number;
      result: "ERROR";
      error: string;
    };

export type WorkerToMainMessage =
  | { type: "WORKER_READY" }
  | { type: "PROGRAM_STARTED"; programId: string }
  | {
      type: "ROBOT_COMMAND";
      programId: string;
      commandId: number;
      command: RobotApiCommand;
    }
  | {
      type: "SENSOR_REQUEST";
      programId: string;
      requestId: number;
      request: SensorRequest;
    }
  | {
      type: "PROGRAM_LOG";
      programId: string;
      level: ProgramConsoleLevel;
      message: string;
    }
  | { type: "PROGRAM_COMPLETED"; programId: string }
  | { type: "PROGRAM_STOPPED"; programId: string }
  | {
      type: "PROGRAM_ERROR";
      programId: string;
      message: string;
    };
