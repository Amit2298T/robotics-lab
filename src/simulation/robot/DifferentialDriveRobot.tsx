"use client";

import { useEffect, useRef } from "react";
import {
  RigidBody,
  useRapier,
  useRevoluteJoint,
} from "@react-three/rapier";
import { Line } from "@react-three/drei";

import type {
  RevoluteImpulseJoint,
  RigidBody as RapierRigidBody,
} from "@dimforge/rapier3d-compat";

import RobotBody from "./RobotBody";
import RobotWheel from "./RobotWheel";
import { robotConfig } from "./robot.config";
import { simulationAdapter } from "./SimulationAdapter";
import { chassisPhysicsMetadata } from "./robotPhysicsMetadata";
import { useSimulationStore } from "@/simulation/state/simulation.store";

export default function DifferentialDriveRobot() {
  const { world } = useRapier();
  const chassisRef =
    useRef<RapierRigidBody>(null!);

  const leftWheelRef =
    useRef<RapierRigidBody>(null!);

  const rightWheelRef =
    useRef<RapierRigidBody>(null!);

  const resetVersion =
    useSimulationStore(
      (state) => state.resetVersion,
    );

  const debugPhysics = useSimulationStore(
    (state) => state.debugPhysics,
  );

  const {
    spawn,
    wheels,
    caster,
    chassis,
    distanceSensor,
  } = robotConfig;

  const leftJoint = useRevoluteJoint(
    chassisRef,
    leftWheelRef,
    [
      [-wheels.offsetX, -0.12, 0],
      [0, 0, 0],
      [1, 0, 0],
    ],
  );

  const rightJoint = useRevoluteJoint(
    chassisRef,
    rightWheelRef,
    [
      [wheels.offsetX, -0.12, 0],
      [0, 0, 0],
      [1, 0, 0],
    ],
  );

  useEffect(() => {
    const chassisBody =
      chassisRef.current;

    const leftMotor =
      leftJoint.current as RevoluteImpulseJoint | null;

    const rightMotor =
      rightJoint.current as RevoluteImpulseJoint | null;

    if (
      !chassisBody ||
      !leftMotor ||
      !rightMotor
    ) {
      return;
    }

    simulationAdapter.attachBodies(
      world,
      chassisBody,
      leftWheelRef.current,
      rightWheelRef.current,
      leftMotor,
      rightMotor,
    );

    return () => {
      simulationAdapter.detachBodies();
    };
  }, [leftJoint, rightJoint, world]);

  useEffect(() => {
    const chassisBody =
      chassisRef.current;

    const leftWheelBody =
      leftWheelRef.current;

    const rightWheelBody =
      rightWheelRef.current;

    if (
      !chassisBody ||
      !leftWheelBody ||
      !rightWheelBody
    ) {
      return;
    }

    simulationAdapter.stop();
    simulationAdapter.clearBumperContacts();

    chassisBody.setTranslation(
      {
        x: spawn.position[0],
        y: spawn.position[1],
        z: spawn.position[2],
      },
      true,
    );

    chassisBody.setRotation(
      {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      },
      true,
    );

    chassisBody.setLinvel(
      {
        x: 0,
        y: 0,
        z: 0,
      },
      true,
    );

    chassisBody.setAngvel(
      {
        x: 0,
        y: 0,
        z: 0,
      },
      true,
    );

    leftWheelBody.setTranslation(
      {
        x:
          spawn.position[0] -
          wheels.offsetX,

        y:
          spawn.position[1] +
          wheels.positionY,

        z:
          spawn.position[2] +
          wheels.positionZ,
      },
      true,
    );

    leftWheelBody.setRotation(
      {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      },
      true,
    );

    leftWheelBody.setLinvel(
      {
        x: 0,
        y: 0,
        z: 0,
      },
      true,
    );

    leftWheelBody.setAngvel(
      {
        x: 0,
        y: 0,
        z: 0,
      },
      true,
    );

    rightWheelBody.setTranslation(
      {
        x:
          spawn.position[0] +
          wheels.offsetX,

        y:
          spawn.position[1] +
          wheels.positionY,

        z:
          spawn.position[2] +
          wheels.positionZ,
      },
      true,
    );

    rightWheelBody.setRotation(
      {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      },
      true,
    );

    rightWheelBody.setLinvel(
      {
        x: 0,
        y: 0,
        z: 0,
      },
      true,
    );

    rightWheelBody.setAngvel(
      {
        x: 0,
        y: 0,
        z: 0,
      },
      true,
    );

    simulationAdapter.resetOdometry();
  }, [
    resetVersion,
    spawn.position,
    wheels.offsetX,
    wheels.positionY,
    wheels.positionZ,
  ]);

  return (
    <>
      <RigidBody
        ref={chassisRef}
        type="dynamic"
        colliders={false}
        position={spawn.position}
        rotation={spawn.rotation}
        mass={chassis.mass}
        linearDamping={0.35}
        angularDamping={0.55}
        canSleep={false}
        userData={chassisPhysicsMetadata}
      >
        <RobotBody
          onBumperCollisionEnter={({ other }) => {
            simulationAdapter.beginBumperContact(
              other.collider,
              other.rigidBody ?? null,
            );
          }}
          onBumperCollisionExit={({ other }) => {
            simulationAdapter.endBumperContact(other.collider);
          }}
        />

        {debugPhysics ? (
          <Line
            points={[
              distanceSensor.originOffset,
              [
                distanceSensor.originOffset[0] +
                  distanceSensor.localDirection[0] *
                    distanceSensor.maxDistance,
                distanceSensor.originOffset[1] +
                  distanceSensor.localDirection[1] *
                    distanceSensor.maxDistance,
                distanceSensor.originOffset[2] +
                  distanceSensor.localDirection[2] *
                    distanceSensor.maxDistance,
              ],
            ]}
            color="#38bdf8"
            lineWidth={1.5}
          />
        ) : null}

        <mesh
          castShadow
          position={caster.position}
        >
          <sphereGeometry
            args={[
              caster.radius,
              24,
              24,
            ]}
          />

          <meshStandardMaterial
            color="#666666"
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      </RigidBody>

      <RobotWheel
        ref={leftWheelRef}
        position={[
          spawn.position[0] -
            wheels.offsetX,

          spawn.position[1] +
            wheels.positionY,

          spawn.position[2] +
            wheels.positionZ,
        ]}
      />

      <RobotWheel
        ref={rightWheelRef}
        position={[
          spawn.position[0] +
            wheels.offsetX,

          spawn.position[1] +
            wheels.positionY,

          spawn.position[2] +
            wheels.positionZ,
        ]}
      />
    </>
  );
}
