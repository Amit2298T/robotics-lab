import { commandRunner } from "@/simulation/commands/activeCommandRunner";
import { robotAdapter } from "@/simulation/robot/activeRobotAdapter";

import type {
  ProgramConsoleEntry,
  ProgramConsoleLevel,
  ProgramRuntimeEvent,
  ProgramStatus,
} from "./program.types";
import type { RobotApiCommand } from "./robotApi.types";
import type { SensorReading } from "./sensor.types";
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "./runtime.messages";
import { quickJsConfig } from "./quickjs/quickjs.config";

type RuntimeListener = (event: ProgramRuntimeEvent) => void;

export class ProgramRuntime {
  private worker: Worker | null = null;
  private activeProgramId: string | null = null;
  private listeners = new Set<RuntimeListener>();
  private nextConsoleId = 1;
  private currentStatus: ProgramStatus = "idle";
  private watchdogId: ReturnType<typeof setTimeout> | null = null;

  get status(): ProgramStatus {
    return this.currentStatus;
  }

  subscribe(listener: RuntimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  run(source: string): boolean {
    if (this.activeProgramId) {
      return false;
    }

    commandRunner.cancel();

    const worker = this.createWorker();
    const programId = crypto.randomUUID();
    this.activeProgramId = programId;
    this.setStatus("running");
    this.startWatchdog(programId);

    this.postMessage(worker, {
      type: "RUN_PROGRAM",
      programId,
      source,
    });

    return true;
  }

  stop(): boolean {
    const programId = this.activeProgramId;

    if (!programId) {
      this.clearWatchdog();

      if (this.currentStatus !== "idle") {
        this.setStatus("idle");
      }

      return false;
    }

    this.setStatus("stopping");
    this.addConsoleEntry("info", "Program stopped");

    if (this.worker) {
      this.postMessage(this.worker, {
        type: "STOP_PROGRAM",
        programId,
      });
    }

    this.activeProgramId = null;
    this.clearWatchdog();
    commandRunner.cancel();
    this.terminateWorker();
    this.setStatus("idle");
    return true;
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
  }

  private createWorker(): Worker {
    this.terminateWorker();

    const worker = new Worker(
      new URL("./worker/robotProgram.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      void this.handleWorkerMessage(event.data, worker);
    };
    worker.onerror = (event) => {
      if (this.worker !== worker) {
        return;
      }

      this.failProgram(event.message || "Program worker failed.");
    };

    this.worker = worker;
    return worker;
  }

  private async handleWorkerMessage(
    message: WorkerToMainMessage,
    worker: Worker,
  ): Promise<void> {
    if (this.worker !== worker) {
      return;
    }

    if (message.type === "WORKER_READY") {
      this.addConsoleEntry("info", "Runtime worker ready");
      return;
    }

    if (message.programId !== this.activeProgramId) {
      return;
    }

    switch (message.type) {
      case "PROGRAM_STARTED":
        this.setStatus("running");
        return;

      case "PROGRAM_LOG":
        this.addConsoleEntry(message.level, message.message);
        return;

      case "ROBOT_COMMAND":
        await this.handleRobotCommand(message, worker);
        return;

      case "SENSOR_REQUEST":
        await this.handleSensorRequest(message, worker);
        return;

      case "PROGRAM_COMPLETED":
        this.finishProgram("completed");
        return;

      case "PROGRAM_STOPPED":
        this.finishProgram("idle");
        return;

      case "PROGRAM_ERROR":
        this.addConsoleEntry("error", message.message);
        this.finishProgram("error");
    }
  }

  private async handleSensorRequest(
    message: Extract<WorkerToMainMessage, { type: "SENSOR_REQUEST" }>,
    worker: Worker,
  ): Promise<void> {
    try {
      let reading: SensorReading;

      switch (message.request.type) {
        case "DISTANCE":
          reading = {
            type: "DISTANCE",
            value: await robotAdapter.readDistanceSensor(),
          };
          break;
        case "BUMPER":
          reading = {
            type: "BUMPER",
            value: await robotAdapter.readBumperSensor(),
          };
          break;
        case "ODOMETRY":
          reading = {
            type: "ODOMETRY",
            value: await robotAdapter.readOdometry(),
          };
          break;
      }

      if (
        reading.type === "DISTANCE" &&
        (!Number.isFinite(reading.value) || reading.value < 0)
      ) {
        throw new Error("Distance sensor returned an invalid reading.");
      }

      if (reading.type === "BUMPER" && typeof reading.value !== "boolean") {
        throw new Error("Bumper sensor returned an invalid reading.");
      }

      if (
        reading.type === "ODOMETRY" &&
        (!Number.isFinite(reading.value.x) ||
          !Number.isFinite(reading.value.z) ||
          !Number.isFinite(reading.value.heading))
      ) {
        throw new Error("Odometry returned an invalid reading.");
      }

      if (
        this.worker === worker &&
        this.activeProgramId === message.programId
      ) {
        this.postMessage(worker, {
          type: "SENSOR_RESULT",
          programId: message.programId,
          requestId: message.requestId,
          result: "COMPLETED",
          reading,
        });
      }
    } catch (error) {
      if (
        this.worker === worker &&
        this.activeProgramId === message.programId
      ) {
        this.postMessage(worker, {
          type: "SENSOR_RESULT",
          programId: message.programId,
          requestId: message.requestId,
          result: "ERROR",
          error:
            error instanceof Error
              ? error.message
              : "Sensor request failed.",
        });
      }
    }
  }

  private async handleRobotCommand(
    message: Extract<WorkerToMainMessage, { type: "ROBOT_COMMAND" }>,
    worker: Worker,
  ): Promise<void> {
    try {
      await this.executeRobotCommand(message.command);

      if (
        this.worker === worker &&
        this.activeProgramId === message.programId
      ) {
        this.postMessage(worker, {
          type: "ROBOT_COMMAND_RESULT",
          programId: message.programId,
          commandId: message.commandId,
          result: "COMPLETED",
        });
      }
    } catch (error) {
      if (
        this.worker === worker &&
        this.activeProgramId === message.programId
      ) {
        this.postMessage(worker, {
          type: "ROBOT_COMMAND_RESULT",
          programId: message.programId,
          commandId: message.commandId,
          result: "ERROR",
          error:
            error instanceof Error
              ? error.message
              : "Robot command failed.",
        });
      }
    }
  }

  private executeRobotCommand(command: RobotApiCommand): Promise<void> {
    switch (command.type) {
      case "FORWARD":
        return commandRunner.forward(command.durationMs);
      case "BACKWARD":
        return commandRunner.backward(command.durationMs);
      case "TURN_LEFT":
        return commandRunner.turnLeft(command.durationMs);
      case "TURN_RIGHT":
        return commandRunner.turnRight(command.durationMs);
      case "WAIT":
        return commandRunner.wait(command.durationMs);
      case "STOP":
        commandRunner.stop();
        return Promise.resolve();
    }
  }

  private finishProgram(status: "idle" | "completed" | "error"): void {
    this.activeProgramId = null;
    this.clearWatchdog();
    commandRunner.cancel();
    this.terminateWorker();
    this.setStatus(status);
  }

  private failProgram(message: string): void {
    this.addConsoleEntry("error", message);
    this.finishProgram("error");
  }

  private terminateWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  private startWatchdog(programId: string): void {
    this.clearWatchdog();
    const timeoutMs =
      quickJsConfig.maxExecutionTimeMs +
      quickJsConfig.workerStartupGraceMs;

    this.watchdogId = setTimeout(() => {
      if (this.activeProgramId === programId) {
        this.failProgram(
          `Program exceeded the ${quickJsConfig.maxExecutionTimeMs}ms execution limit.`,
        );
      }
    }, timeoutMs);
  }

  private clearWatchdog(): void {
    if (this.watchdogId !== null) {
      clearTimeout(this.watchdogId);
      this.watchdogId = null;
    }
  }

  private postMessage(worker: Worker, message: MainToWorkerMessage): void {
    worker.postMessage(message);
  }

  private setStatus(status: ProgramStatus): void {
    this.currentStatus = status;
    this.emit({ type: "STATUS_CHANGED", status });
  }

  private addConsoleEntry(
    level: ProgramConsoleLevel,
    message: string,
  ): void {
    const entry: ProgramConsoleEntry = {
      id: this.nextConsoleId,
      level,
      message,
    };
    this.nextConsoleId += 1;
    this.emit({ type: "CONSOLE_ENTRY", entry });
  }

  private emit(event: ProgramRuntimeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
