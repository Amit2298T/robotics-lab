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

/** Ground-truth planar pose relative to the latest spawn/reset pose. */
export type RobotOdometry = {
  /** Right/left displacement along the spawn frame's X axis, in meters. */
  x: number;
  /** Forward/back displacement along the spawn frame's Z axis, in meters. */
  z: number;
  /** Radians in [-PI, PI]; positive turns left from the initial local -Z. */
  heading: number;
};

export interface RobotAdapter {
  setWheelVelocities(command: WheelVelocityCommand): void;
  stop(): void;
  getPose(): RobotPose | null;
  readDistanceSensor(): Promise<number>;
  readBumperSensor(): Promise<boolean>;
  subscribeBumperHits(listener: () => void): () => void;
  readOdometry(): Promise<RobotOdometry>;
}
