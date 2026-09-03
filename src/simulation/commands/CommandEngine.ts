import type { RobotCommand } from "./robotCommand.types";
import type {
  RobotAdapter,
  WheelVelocityCommand,
} from "@/simulation/types/robot.types";

export type CommandEngineConfig = {
  defaultWheelSpeed: number;
  maxWheelSpeed: number;
};

export class CommandEngine {
  private readonly adapter: RobotAdapter;
  private readonly defaultWheelSpeed: number;
  private readonly maxWheelSpeed: number;

  constructor(
    adapter: RobotAdapter,
    config: CommandEngineConfig,
  ) {
    if (
      !Number.isFinite(config.maxWheelSpeed) ||
      config.maxWheelSpeed <= 0
    ) {
      throw new RangeError(
        "maxWheelSpeed must be a finite positive number.",
      );
    }

    if (
      !Number.isFinite(config.defaultWheelSpeed) ||
      config.defaultWheelSpeed < 0
    ) {
      throw new RangeError(
        "defaultWheelSpeed must be a finite non-negative number.",
      );
    }

    this.adapter = adapter;
    this.maxWheelSpeed = config.maxWheelSpeed;
    this.defaultWheelSpeed = Math.min(
      config.defaultWheelSpeed,
      config.maxWheelSpeed,
    );
  }

  dispatch(command: RobotCommand): void {
    switch (command.type) {
      case "MOVE_FORWARD":
        this.setWheelVelocities({
          left: -this.defaultWheelSpeed,
          right: -this.defaultWheelSpeed,
        });
        return;

      case "MOVE_BACKWARD":
        this.setWheelVelocities({
          left: this.defaultWheelSpeed,
          right: this.defaultWheelSpeed,
        });
        return;

      case "TURN_LEFT":
        this.setWheelVelocities({
          left: this.defaultWheelSpeed,
          right: -this.defaultWheelSpeed,
        });
        return;

      case "TURN_RIGHT":
        this.setWheelVelocities({
          left: -this.defaultWheelSpeed,
          right: this.defaultWheelSpeed,
        });
        return;

      case "STOP":
        this.adapter.stop();
        return;

      case "SET_WHEEL_VELOCITIES":
        this.setWheelVelocities(command.payload);
    }
  }

  private setWheelVelocities({
    left,
    right,
  }: WheelVelocityCommand): void {
    this.adapter.setWheelVelocities({
      left: this.clampWheelVelocity(left),
      right: this.clampWheelVelocity(right),
    });
  }

  private clampWheelVelocity(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(
      -this.maxWheelSpeed,
      Math.min(this.maxWheelSpeed, value),
    );
  }
}
