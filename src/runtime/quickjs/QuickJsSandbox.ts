import releaseVariant from "@jitl/quickjs-singlefile-browser-release-sync";
import {
  newQuickJSWASMModuleFromVariant,
  type QuickJSContext,
  type QuickJSDeferredPromise,
  type QuickJSHandle,
  type QuickJSRuntime,
} from "quickjs-emscripten-core";

import type {
  ProgramConsoleLevel,
} from "../program.types";
import type { RobotApiCommand } from "../robotApi.types";
import type { SensorReading, SensorRequest } from "../sensor.types";
import { quickJsConfig } from "./quickjs.config";

type QuickJsSandboxOptions = {
  onRobotCommand(command: RobotApiCommand): Promise<void>;
  onSensorRequest(request: SensorRequest): Promise<SensorReading>;
  onLog(level: ProgramConsoleLevel, message: string): void;
  maxExecutionTimeMs?: number;
};

type PendingRobotPromise = {
  deferred: QuickJSDeferredPromise;
};

export class SandboxCancelledError extends Error {
  constructor() {
    super("Program stopped.");
    this.name = "SandboxCancelledError";
  }
}

export class QuickJsSandbox {
  private readonly options: QuickJsSandboxOptions;
  private readonly pendingRobotPromises = new Set<PendingRobotPromise>();
  private readonly pendingSensorPromises = new Set<PendingRobotPromise>();
  private runtime: QuickJSRuntime | null = null;
  private context: QuickJSContext | null = null;
  private cancelled = false;
  private deadline = 0;
  private rejectFatalError: ((error: Error) => void) | null = null;
  private readonly maxExecutionTimeMs: number;

  constructor(options: QuickJsSandboxOptions) {
    this.options = options;
    this.maxExecutionTimeMs =
      options.maxExecutionTimeMs ?? quickJsConfig.maxExecutionTimeMs;

    if (
      !Number.isFinite(this.maxExecutionTimeMs) ||
      this.maxExecutionTimeMs <= 0
    ) {
      throw new RangeError(
        "QuickJS execution time limit must be a finite positive number.",
      );
    }
  }

  async run(source: string): Promise<void> {
    if (this.runtime || this.context) {
      throw new Error("QuickJS sandbox is already running.");
    }

    this.cancelled = false;
    const quickJs = await newQuickJSWASMModuleFromVariant(releaseVariant);

    if (this.cancelled) {
      throw new SandboxCancelledError();
    }

    const runtime = quickJs.newRuntime();
    this.runtime = runtime;

    try {
      this.deadline = Date.now() + this.maxExecutionTimeMs;
      runtime.setMemoryLimit(quickJsConfig.memoryLimitBytes);
      runtime.setMaxStackSize(quickJsConfig.maxStackSizeBytes);
      runtime.setInterruptHandler(
        () => this.cancelled || Date.now() >= this.deadline,
      );

      const context = runtime.newContext();
      this.context = context;
      this.installRobotApi(context);
      this.installConsoleApi(context);

      const fatalError = new Promise<never>((_resolve, reject) => {
        this.rejectFatalError = reject;
      });

      const evaluation = context.evalCode(
        `(async () => {\n${source}\n})()`,
        "robot-program.js",
      );

      if (evaluation.error) {
        const error = this.readQuickJsError(evaluation.error);
        evaluation.error.dispose();
        throw error;
      }

      const programPromise = evaluation.value;

      try {
        const completion = context.resolvePromise(programPromise);
        this.executePendingJobs();
        const result = await Promise.race([completion, fatalError]);

        if (result.error) {
          const error = this.readQuickJsError(result.error);
          result.error.dispose();
          throw error;
        }

        result.value.dispose();
      } finally {
        programPromise.dispose();
      }
    } finally {
      this.rejectFatalError = null;
      this.dispose();
    }
  }

  cancel(): void {
    if (this.cancelled) {
      return;
    }

    this.cancelled = true;
    this.rejectFatalError?.(new SandboxCancelledError());
  }

  dispose(): void {
    this.cancelled = true;

    for (const pending of this.pendingRobotPromises) {
      pending.deferred.dispose();
    }
    this.pendingRobotPromises.clear();

    for (const pending of this.pendingSensorPromises) {
      pending.deferred.dispose();
    }
    this.pendingSensorPromises.clear();

    const context = this.context;
    const runtime = this.runtime;
    this.context = null;
    this.runtime = null;

    context?.dispose();
    runtime?.dispose();
  }

  private installRobotApi(context: QuickJSContext): void {
    const robot = context.newObject();

    const installTimedCommand = (
      name: string,
      createCommand: (durationMs: number) => RobotApiCommand,
    ) => {
      const fn = context.newFunction(name, (durationHandle) => {
        if (
          !durationHandle ||
          context.typeof(durationHandle) !== "number"
        ) {
          return this.rejectedPromise(
            context,
            `${name} duration must be a number.`,
          );
        }

        const durationMs = context.getNumber(durationHandle);

        if (!Number.isFinite(durationMs) || durationMs < 0) {
          return this.rejectedPromise(
            context,
            `${name} duration must be a finite non-negative number.`,
          );
        }

        return this.robotCommandPromise(
          context,
          createCommand(durationMs),
        );
      });

      context.setProp(robot, name, fn);
      fn.dispose();
    };

    installTimedCommand("forward", (durationMs) => ({
      type: "FORWARD",
      durationMs,
    }));
    installTimedCommand("backward", (durationMs) => ({
      type: "BACKWARD",
      durationMs,
    }));
    installTimedCommand("turnLeft", (durationMs) => ({
      type: "TURN_LEFT",
      durationMs,
    }));
    installTimedCommand("turnRight", (durationMs) => ({
      type: "TURN_RIGHT",
      durationMs,
    }));
    installTimedCommand("wait", (durationMs) => ({
      type: "WAIT",
      durationMs,
    }));

    const stop = context.newFunction("stop", () =>
      this.robotCommandPromise(context, { type: "STOP" }),
    );
    context.setProp(robot, "stop", stop);
    stop.dispose();

    const distance = context.newFunction("distance", () =>
      this.sensorRequestPromise(context, { type: "DISTANCE" }),
    );
    context.setProp(robot, "distance", distance);
    distance.dispose();

    const bumped = context.newFunction("bumped", () =>
      this.sensorRequestPromise(context, { type: "BUMPER" }),
    );
    context.setProp(robot, "bumped", bumped);
    bumped.dispose();

    const odometry = context.newFunction("odometry", () =>
      this.sensorRequestPromise(context, { type: "ODOMETRY" }),
    );
    context.setProp(robot, "odometry", odometry);
    odometry.dispose();

    context.setProp(context.global, "robot", robot);
    robot.dispose();
  }

  private sensorRequestPromise(
    context: QuickJSContext,
    request: SensorRequest,
  ): QuickJSHandle {
    const deferred = context.newPromise();
    const pending = { deferred };
    this.pendingSensorPromises.add(pending);

    void this.options.onSensorRequest(request).then(
      (reading) => {
        if (!deferred.alive || this.context !== context) {
          return;
        }

        this.pendingSensorPromises.delete(pending);

        const invalidDistance =
          reading.type === "DISTANCE" &&
          (!Number.isFinite(reading.value) || reading.value < 0);
        const invalidBumper =
          reading.type === "BUMPER" && typeof reading.value !== "boolean";
        const invalidOdometry =
          reading.type === "ODOMETRY" &&
          (!Number.isFinite(reading.value.x) ||
            !Number.isFinite(reading.value.z) ||
            !Number.isFinite(reading.value.heading));

        if (
          reading.type !== request.type ||
          invalidDistance ||
          invalidBumper ||
          invalidOdometry
        ) {
          const errorHandle = context.newError(
            "Sensor returned an invalid reading.",
          );
          deferred.reject(errorHandle);
          errorHandle.dispose();
        } else {
          switch (reading.type) {
            case "DISTANCE": {
              const valueHandle = context.newNumber(reading.value);
              deferred.resolve(valueHandle);
              valueHandle.dispose();
              break;
            }
            case "BUMPER":
              deferred.resolve(reading.value ? context.true : context.false);
              break;
            case "ODOMETRY": {
              const valueHandle = context.newObject();

              for (const [name, value] of Object.entries(reading.value)) {
                const numberHandle = context.newNumber(value);
                context.setProp(valueHandle, name, numberHandle);
                numberHandle.dispose();
              }

              deferred.resolve(valueHandle);
              valueHandle.dispose();
              break;
            }
          }
        }

        this.executePendingJobs();
      },
      (error: unknown) => {
        if (!deferred.alive || this.context !== context) {
          return;
        }

        this.pendingSensorPromises.delete(pending);
        const errorHandle = context.newError(
          error instanceof Error ? error.message : "Sensor request failed.",
        );
        deferred.reject(errorHandle);
        errorHandle.dispose();
        this.executePendingJobs();
      },
    );

    return deferred.handle;
  }

  private installConsoleApi(context: QuickJSContext): void {
    const safeConsole = context.newObject();
    const methods: ReadonlyArray<
      readonly [string, ProgramConsoleLevel]
    > = [
      ["log", "info"],
      ["warn", "warning"],
      ["error", "error"],
    ];

    for (const [name, level] of methods) {
      const fn = context.newFunction(name, (...args) => {
        this.options.onLog(
          level,
          args.map((arg) => this.formatConsoleValue(context, arg)).join(" "),
        );
        return context.undefined;
      });
      context.setProp(safeConsole, name, fn);
      fn.dispose();
    }

    context.setProp(context.global, "console", safeConsole);
    safeConsole.dispose();
  }

  private robotCommandPromise(
    context: QuickJSContext,
    command: RobotApiCommand,
  ): QuickJSHandle {
    const deferred = context.newPromise();
    const pending = { deferred };
    this.pendingRobotPromises.add(pending);

    void this.options.onRobotCommand(command).then(
      () => {
        if (!deferred.alive || this.context !== context) {
          return;
        }

        this.pendingRobotPromises.delete(pending);
        deferred.resolve(context.undefined);
        this.executePendingJobs();
      },
      (error: unknown) => {
        if (!deferred.alive || this.context !== context) {
          return;
        }

        this.pendingRobotPromises.delete(pending);
        const errorHandle = context.newError(
          error instanceof Error ? error.message : "Robot command failed.",
        );
        deferred.reject(errorHandle);
        errorHandle.dispose();
        this.executePendingJobs();
      },
    );

    return deferred.handle;
  }

  private rejectedPromise(
    context: QuickJSContext,
    message: string,
  ): QuickJSHandle {
    const deferred = context.newPromise();
    const error = context.newError(message);
    deferred.reject(error);
    error.dispose();
    return deferred.handle;
  }

  private executePendingJobs(): void {
    const runtime = this.runtime;
    const context = this.context;

    if (!runtime || !context || this.cancelled) {
      return;
    }

    const result = runtime.executePendingJobs();

    if (result.error) {
      const error = this.readQuickJsError(result.error);
      result.error.dispose();
      this.rejectFatalError?.(error);
    }
  }

  private readQuickJsError(handle: QuickJSHandle): Error {
    const dumped: unknown = this.context?.dump(handle);

    if (this.cancelled) {
      return new SandboxCancelledError();
    }

    if (Date.now() >= this.deadline) {
      return new Error(
        `Program exceeded the ${this.maxExecutionTimeMs}ms execution limit.`,
      );
    }

    if (dumped && typeof dumped === "object") {
      const details = dumped as Record<string, unknown>;
      const name =
        typeof details.name === "string" ? details.name : "Error";
      const message =
        typeof details.message === "string"
          ? details.message
          : "QuickJS execution failed.";
      return new Error(`${name}: ${message}`);
    }

    return new Error(String(dumped ?? "QuickJS execution failed."));
  }

  private formatConsoleValue(
    context: QuickJSContext,
    handle: QuickJSHandle,
  ): string {
    const value: unknown = handle.dup().consume(context.dump);

    if (typeof value === "string") {
      return value;
    }

    if (
      value === null ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint" ||
      typeof value === "undefined"
    ) {
      return String(value);
    }

    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return String(value);
    }
  }
}
