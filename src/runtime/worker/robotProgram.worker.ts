import type { ProgramConsoleLevel } from "../program.types";
import {
  QuickJsSandbox,
  SandboxCancelledError,
} from "../quickjs/QuickJsSandbox";
import type { RobotApiCommand } from "../robotApi.types";
import type { SensorReading, SensorRequest } from "../sensor.types";
import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
} from "../runtime.messages";

type WorkerScope = {
  postMessage(message: WorkerToMainMessage): void;
  onmessage:
    | ((event: MessageEvent<MainToWorkerMessage>) => void)
    | null;
};

type PendingCommand = {
  resolve: () => void;
  reject: (error: Error) => void;
};

type PendingSensorRequest = {
  resolve: (reading: SensorReading) => void;
  reject: (error: Error) => void;
};

type ActiveProgram = {
  programId: string;
  pendingCommands: Map<number, PendingCommand>;
  pendingSensorRequests: Map<number, PendingSensorRequest>;
  nextCommandId: number;
  nextSensorRequestId: number;
  sandbox: QuickJsSandbox | null;
};

class ProgramStoppedError extends Error {}

const workerScope = self as unknown as WorkerScope;
let activeProgram: ActiveProgram | null = null;

function send(message: WorkerToMainMessage): void {
  workerScope.postMessage(message);
}

function formatSensorRequest(request: SensorRequest): string {
  switch (request.type) {
    case "DISTANCE":
      return "robot.distance()";
    case "BUMPER":
      return "robot.bumped()";
    case "ODOMETRY":
      return "robot.odometry()";
  }
}

function requestSensor(
  program: ActiveProgram,
  request: SensorRequest,
): Promise<SensorReading> {
  if (activeProgram !== program) {
    return Promise.reject(new ProgramStoppedError());
  }

  const requestId = program.nextSensorRequestId;
  program.nextSensorRequestId += 1;
  emitLog(
    program,
    "command",
    formatSensorRequest(request),
  );

  return new Promise((resolve, reject) => {
    program.pendingSensorRequests.set(requestId, { resolve, reject });
    send({
      type: "SENSOR_REQUEST",
      programId: program.programId,
      requestId,
      request,
    });
  });
}

function formatCommand(command: RobotApiCommand): string {
  switch (command.type) {
    case "FORWARD":
      return `robot.forward(${command.durationMs})`;
    case "BACKWARD":
      return `robot.backward(${command.durationMs})`;
    case "TURN_LEFT":
      return `robot.turnLeft(${command.durationMs})`;
    case "TURN_RIGHT":
      return `robot.turnRight(${command.durationMs})`;
    case "WAIT":
      return `robot.wait(${command.durationMs})`;
    case "STOP":
      return "robot.stop()";
  }
}

function emitLog(
  program: ActiveProgram,
  level: ProgramConsoleLevel,
  message: string,
): void {
  if (activeProgram !== program) {
    return;
  }

  send({
    type: "PROGRAM_LOG",
    programId: program.programId,
    level,
    message,
  });
}

function requestRobotCommand(
  program: ActiveProgram,
  command: RobotApiCommand,
): Promise<void> {
  if (activeProgram !== program) {
    return Promise.reject(new ProgramStoppedError());
  }

  const commandId = program.nextCommandId;
  program.nextCommandId += 1;
  emitLog(program, "command", formatCommand(command));

  return new Promise((resolve, reject) => {
    program.pendingCommands.set(commandId, { resolve, reject });
    send({
      type: "ROBOT_COMMAND",
      programId: program.programId,
      commandId,
      command,
    });
  });
}

async function runProgram(
  program: ActiveProgram,
  source: string,
): Promise<void> {
  send({ type: "PROGRAM_STARTED", programId: program.programId });
  emitLog(program, "info", "Program started");

  try {
    const sandbox = new QuickJsSandbox({
      onRobotCommand: (command) =>
        requestRobotCommand(program, command),
      onSensorRequest: (request) => requestSensor(program, request),
      onLog: (level, message) => emitLog(program, level, message),
    });
    program.sandbox = sandbox;

    if (activeProgram !== program) {
      sandbox.dispose();
      return;
    }

    await sandbox.run(source);

    if (activeProgram === program) {
      emitLog(program, "info", "Program completed");
      send({
        type: "PROGRAM_COMPLETED",
        programId: program.programId,
      });
    }
  } catch (error) {
    if (
      activeProgram === program &&
      !(error instanceof SandboxCancelledError) &&
      !(error instanceof ProgramStoppedError)
    ) {
      send({
        type: "PROGRAM_ERROR",
        programId: program.programId,
        message:
          error instanceof Error
            ? error.message
            : "Unknown QuickJS runtime error.",
      });
    }
  } finally {
    program.sandbox?.dispose();
    program.sandbox = null;

    if (activeProgram === program) {
      activeProgram = null;
    }
  }
}

function stopProgram(programId: string): void {
  const program = activeProgram;

  if (!program || program.programId !== programId) {
    return;
  }

  activeProgram = null;
  program.sandbox?.cancel();

  for (const pending of program.pendingCommands.values()) {
    pending.reject(new ProgramStoppedError());
  }
  program.pendingCommands.clear();
  for (const pending of program.pendingSensorRequests.values()) {
    pending.reject(new ProgramStoppedError());
  }
  program.pendingSensorRequests.clear();
  send({ type: "PROGRAM_STOPPED", programId });
}

function settleSensorRequest(
  message: Extract<MainToWorkerMessage, { type: "SENSOR_RESULT" }>,
): void {
  const program = activeProgram;

  if (!program || program.programId !== message.programId) {
    return;
  }

  const pending = program.pendingSensorRequests.get(message.requestId);
  if (!pending) {
    return;
  }

  program.pendingSensorRequests.delete(message.requestId);

  if (message.result === "COMPLETED") {
    pending.resolve(message.reading);
  } else {
    pending.reject(new Error(message.error));
  }
}

function settleRobotCommand(
  message: Extract<MainToWorkerMessage, { type: "ROBOT_COMMAND_RESULT" }>,
): void {
  const program = activeProgram;

  if (!program || program.programId !== message.programId) {
    return;
  }

  const pending = program.pendingCommands.get(message.commandId);
  if (!pending) {
    return;
  }

  program.pendingCommands.delete(message.commandId);

  if (message.result === "COMPLETED") {
    pending.resolve();
  } else {
    pending.reject(new Error(message.error ?? "Robot command failed."));
  }
}

workerScope.onmessage = (event) => {
  const message = event.data;

  switch (message.type) {
    case "RUN_PROGRAM": {
      if (activeProgram) {
        send({
          type: "PROGRAM_ERROR",
          programId: message.programId,
          message: "A program is already running.",
        });
        return;
      }

      const program: ActiveProgram = {
        programId: message.programId,
        pendingCommands: new Map(),
        pendingSensorRequests: new Map(),
        nextCommandId: 1,
        nextSensorRequestId: 1,
        sandbox: null,
      };
      activeProgram = program;
      void runProgram(program, message.source);
      return;
    }

    case "STOP_PROGRAM":
      stopProgram(message.programId);
      return;

    case "ROBOT_COMMAND_RESULT":
      settleRobotCommand(message);
      return;

    case "SENSOR_RESULT":
      settleSensorRequest(message);
  }
};

send({ type: "WORKER_READY" });
