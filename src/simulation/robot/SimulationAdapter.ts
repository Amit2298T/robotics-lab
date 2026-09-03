import {
  MotorModel,
  type Collider,
  type RevoluteImpulseJoint,
  type RigidBody,
  type World,
} from "@dimforge/rapier3d-compat";

import { castDistanceRay } from "./distanceSensor";
import { BumperContactTracker } from "./bumperSensor";
import {
  computeOdometry,
  createOdometryReference,
  type OdometryReference,
} from "./odometry";
import { robotConfig } from "./robot.config";

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
  RobotOdometry,
  RobotPose,
  WheelVelocityCommand,
} from "@/simulation/types/robot.types";

export class SimulationAdapter implements RobotAdapter {
  private readonly bumperContacts = new BumperContactTracker();
  private readonly bumperHitListeners = new Set<() => void>();
  private odometryReference: OdometryReference = {
    x: 0,
    z: 0,
    heading: 0,
  };
  private world: World | null = null;
  private chassis: RigidBody | null = null;

  private leftWheel: RigidBody | null = null;
  private rightWheel: RigidBody | null = null;

  private leftJoint: RevoluteImpulseJoint | null = null;
  private rightJoint: RevoluteImpulseJoint | null = null;

  attachBodies(
    world: World,
    chassis: RigidBody,
    leftWheel: RigidBody,
    rightWheel: RigidBody,
    leftJoint: RevoluteImpulseJoint,
    rightJoint: RevoluteImpulseJoint,
  ) {
    this.world = world;
    this.chassis = chassis;
    this.leftWheel = leftWheel;
    this.rightWheel = rightWheel;
    this.leftJoint = leftJoint;
    this.rightJoint = rightJoint;

    this.bumperContacts.setInternalBodyHandles([
      chassis.handle,
      leftWheel.handle,
      rightWheel.handle,
    ]);
    this.resetOdometry();

    configureWheelJoint(leftJoint);
    configureWheelJoint(rightJoint);
  }

  detachBodies() {
    this.bumperContacts.setInternalBodyHandles([]);
    this.world = null;
    this.chassis = null;
    this.leftWheel = null;
    this.rightWheel = null;
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

  readDistanceSensor(): Promise<number> {
    if (!this.world || !this.chassis || !this.leftWheel || !this.rightWheel) {
      return Promise.resolve(robotConfig.distanceSensor.maxDistance);
    }

    return Promise.resolve(
      castDistanceRay(
        this.world,
        {
          chassis: this.chassis,
          leftWheel: this.leftWheel,
          rightWheel: this.rightWheel,
        },
        robotConfig.distanceSensor,
      ),
    );
  }

  beginBumperContact(collider: Collider, rigidBody: RigidBody | null): void {
    const isNewValidContact = this.bumperContacts.beginContact({
      colliderHandle: collider.handle,
      rigidBodyHandle: rigidBody?.handle ?? null,
      rigidBodyUserData: rigidBody?.userData,
    });

    if (isNewValidContact) {
      for (const listener of this.bumperHitListeners) {
        listener();
      }
    }
  }

  endBumperContact(collider: Collider): void {
    this.bumperContacts.endContact(collider.handle);
  }

  clearBumperContacts(): void {
    this.bumperContacts.clear();
  }

  readBumperSensor(): Promise<boolean> {
    return Promise.resolve(this.bumperContacts.bumped);
  }

  subscribeBumperHits(listener: () => void): () => void {
    this.bumperHitListeners.add(listener);
    return () => this.bumperHitListeners.delete(listener);
  }

  resetOdometry(): void {
    if (!this.chassis) {
      this.odometryReference = { x: 0, z: 0, heading: 0 };
      return;
    }

    this.odometryReference = createOdometryReference(
      this.chassis.translation(),
      this.chassis.rotation(),
    );
  }

  readOdometry(): Promise<RobotOdometry> {
    if (!this.chassis) {
      return Promise.resolve({ x: 0, z: 0, heading: 0 });
    }

    return Promise.resolve(
      computeOdometry(
        this.chassis.translation(),
        this.chassis.rotation(),
        this.odometryReference,
      ),
    );
  }
}

export const simulationAdapter =
  new SimulationAdapter();
