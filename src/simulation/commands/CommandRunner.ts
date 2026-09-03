import type { RobotCommand } from "./robotCommand.types";

export type CommandRunnerConfig = {
  maxDurationMs: number;
};

export type RobotOperation =
  | { type: "FORWARD"; durationMs: number }
  | { type: "BACKWARD"; durationMs: number }
  | { type: "TURN_LEFT"; durationMs: number }
  | { type: "TURN_RIGHT"; durationMs: number }
  | { type: "WAIT"; durationMs: number }
  | { type: "STOP" };

type CommandDispatcher = {
  dispatch(command: RobotCommand): void;
};

export class CommandCancelledError extends Error {
  constructor() {
    super("Robot command sequence was cancelled.");
    this.name = "CommandCancelledError";
  }
}

export class CommandRunner {
  private readonly commandEngine: CommandDispatcher;
  private readonly maxDurationMs: number;
  private activeController: AbortController | null = null;

  constructor(
    commandEngine: CommandDispatcher,
    config: CommandRunnerConfig,
  ) {
    if (
      !Number.isFinite(config.maxDurationMs) ||
      config.maxDurationMs <= 0
    ) {
      throw new RangeError(
        "maxDurationMs must be a finite positive number.",
      );
    }

    this.commandEngine = commandEngine;
    this.maxDurationMs = config.maxDurationMs;
  }

  get isRunning(): boolean {
    return this.activeController !== null;
  }

  async run(operations: readonly RobotOperation[]): Promise<void> {
    if (this.activeController) {
      throw new Error("A robot command sequence is already running.");
    }

    const controller = new AbortController();
    this.activeController = controller;

    try {
      for (const operation of operations) {
        this.throwIfCancelled(controller.signal);
        await this.execute(operation, controller.signal);
      }
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }
  }

  forward(durationMs: number): Promise<void> {
    return this.run([{ type: "FORWARD", durationMs }]);
  }

  backward(durationMs: number): Promise<void> {
    return this.run([{ type: "BACKWARD", durationMs }]);
  }

  turnLeft(durationMs: number): Promise<void> {
    return this.run([{ type: "TURN_LEFT", durationMs }]);
  }

  turnRight(durationMs: number): Promise<void> {
    return this.run([{ type: "TURN_RIGHT", durationMs }]);
  }

  wait(durationMs: number): Promise<void> {
    return this.run([{ type: "WAIT", durationMs }]);
  }

  stop(): void {
    this.cancel();
  }

  cancel(): void {
    const controller = this.activeController;
    this.activeController = null;
    controller?.abort();
    this.commandEngine.dispatch({ type: "STOP" });
  }

  private async execute(
    operation: RobotOperation,
    signal: AbortSignal,
  ): Promise<void> {
    switch (operation.type) {
      case "FORWARD":
        await this.executeTimedMovement(
          { type: "MOVE_FORWARD" },
          operation.durationMs,
          signal,
        );
        return;

      case "BACKWARD":
        await this.executeTimedMovement(
          { type: "MOVE_BACKWARD" },
          operation.durationMs,
          signal,
        );
        return;

      case "TURN_LEFT":
        await this.executeTimedMovement(
          { type: "TURN_LEFT" },
          operation.durationMs,
          signal,
        );
        return;

      case "TURN_RIGHT":
        await this.executeTimedMovement(
          { type: "TURN_RIGHT" },
          operation.durationMs,
          signal,
        );
        return;

      case "WAIT":
        await this.delay(
          this.validateDuration(operation.durationMs),
          signal,
        );
        return;

      case "STOP":
        this.commandEngine.dispatch({ type: "STOP" });
    }
  }

  private async executeTimedMovement(
    command: RobotCommand,
    durationMs: number,
    signal: AbortSignal,
  ): Promise<void> {
    const safeDurationMs = this.validateDuration(durationMs);

    this.throwIfCancelled(signal);
    this.commandEngine.dispatch(command);
    await this.delay(safeDurationMs, signal);
    this.commandEngine.dispatch({ type: "STOP" });
  }

  private validateDuration(durationMs: number): number {
    if (!Number.isFinite(durationMs)) {
      throw new RangeError("Command duration must be a finite number.");
    }

    if (durationMs < 0 || durationMs > this.maxDurationMs) {
      throw new RangeError(
        `Command duration must be between 0 and ${this.maxDurationMs}ms.`,
      );
    }

    return durationMs;
  }

  private delay(durationMs: number, signal: AbortSignal): Promise<void> {
    this.throwIfCancelled(signal);

    return new Promise((resolve, reject) => {
      const handleAbort = () => {
        clearTimeout(timeoutId);
        signal.removeEventListener("abort", handleAbort);
        reject(new CommandCancelledError());
      };

      const timeoutId = setTimeout(() => {
        signal.removeEventListener("abort", handleAbort);
        resolve();
      }, durationMs);

      signal.addEventListener("abort", handleAbort, { once: true });
    });
  }

  private throwIfCancelled(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new CommandCancelledError();
    }
  }
}
