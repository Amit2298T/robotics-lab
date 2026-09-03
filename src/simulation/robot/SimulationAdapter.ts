import {
  MotorModel,
  type RevoluteImpulseJoint,
  type RigidBody,
} from "@dimforge/rapier3d-compat";

/*
 * The wheel colliders sit very close to the chassis collider. Contacts between
 * bodies connected by a revolute joint would fight the wheel motor, so the
 * joint must be the only constraint between each wheel and the chassis.
 */
const configureWheelJoint = (
  joint: RevoluteImpulseJoint,
) => {
  joint.setContactsEnabled(false);
  joint.configureMotorModel(
    MotorModel.AccelerationBased,
  );
};

const MOTOR_VELOCITY_GAIN = 12;

/*
 * Motor configuration wakes connected bodies in Rapier today, but doing this
 * explicitly keeps commands reliable if sleeping is enabled later.
 */
const wakeJointBodies = (
  joint: RevoluteImpulseJoint,
) => {
  joint.body1().wakeUp();
  joint.body2().wakeUp();
};

import type {
  RobotAdapter,
  RobotPose,
  WheelVelocityCommand,
} from "@/simulation/types/robot.types";

export class SimulationAdapter implements RobotAdapter {
  private chassis: RigidBody | null = null;

  private leftJoint: RevoluteImpulseJoint | null = null;
  private rightJoint: RevoluteImpulseJoint | null = null;

  attachBodies(
    chassis: RigidBody,
    leftJoint: RevoluteImpulseJoint,
    rightJoint: RevoluteImpulseJoint,
  ) {
    this.chassis = chassis;
    this.leftJoint = leftJoint;
    this.rightJoint = rightJoint;

    configureWheelJoint(leftJoint);
    configureWheelJoint(rightJoint);
  }

  detachBodies() {
    this.chassis = null;
    this.leftJoint = null;
    this.rightJoint = null;
  }

  setWheelVelocities({
    left,
    right,
  }: WheelVelocityCommand) {
    if (!this.leftJoint || !this.rightJoint) {
      return;
    }

    wakeJointBodies(this.leftJoint);
    wakeJointBodies(this.rightJoint);

    this.leftJoint.configureMotorVelocity(
      left,
      MOTOR_VELOCITY_GAIN,
    );

    this.rightJoint.configureMotorVelocity(
      right,
      MOTOR_VELOCITY_GAIN,
    );
  }

  stop() {
    if (!this.leftJoint || !this.rightJoint) {
      return;
    }

    wakeJointBodies(this.leftJoint);
    wakeJointBodies(this.rightJoint);

    this.leftJoint.configureMotorVelocity(
      0,
      MOTOR_VELOCITY_GAIN,
    );

    this.rightJoint.configureMotorVelocity(
      0,
      MOTOR_VELOCITY_GAIN,
    );
  }

  getPose(): RobotPose | null {
    if (!this.chassis) {
      return null;
    }

    const translation = this.chassis.translation();
    const rotation = this.chassis.rotation();

    return {
      position: {
        x: translation.x,
        y: translation.y,
        z: translation.z,
      },

      rotation: {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
        w: rotation.w,
      },
    };
  }
}

export const simulationAdapter =
  new SimulationAdapter();
