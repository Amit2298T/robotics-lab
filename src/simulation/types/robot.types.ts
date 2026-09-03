export type WheelVelocityCommand = {
  left: number;
  right: number;
};

export type RobotPose = {
  position: {
    x: number;
    y: number;
    z: number;
  };

  rotation: {
    x: number;
    y: number;
    z: number;
    w: number;
  };
};

export interface RobotAdapter {
  setWheelVelocities(command: WheelVelocityCommand): void;
  stop(): void;
  getPose(): RobotPose | null;
}