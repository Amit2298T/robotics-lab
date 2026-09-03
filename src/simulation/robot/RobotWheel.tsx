"use client";

import {
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";

import {
  forwardRef,
} from "react";

import type {
  RigidBody as RapierRigidBody,
} from "@dimforge/rapier3d-compat";

import { robotConfig } from "./robot.config";

type RobotWheelProps = {
  position: [
    number,
    number,
    number,
  ];
};

const RobotWheel =
  forwardRef<
    RapierRigidBody,
    RobotWheelProps
  >(
    function RobotWheel(
      { position },
      ref,
    ) {
      const {
        mass,
        radius,
        width,
      } = robotConfig.wheels;

      return (
        <RigidBody
          ref={ref}
          type="dynamic"
          colliders={false}
          position={position}
          linearDamping={0.05}
          angularDamping={0.05}
          canSleep={false}
        >
          <mesh
            castShadow
            rotation={[
              0,
              0,
              Math.PI / 2,
            ]}
          >
            <cylinderGeometry
              args={[
                radius,
                radius,
                width,
                32,
              ]}
            />

            <meshStandardMaterial
              color="#111827"
              metalness={0.15}
              roughness={0.75}
            />
          </mesh>

          <mesh
            rotation={[
              0,
              0,
              Math.PI / 2,
            ]}
            position={[
              0,
              width / 2 + 0.01,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                radius * 0.38,
                radius * 0.38,
                0.02,
                24,
              ]}
            />

            <meshStandardMaterial
              color="#cbd5e1"
              metalness={0.75}
              roughness={0.2}
            />
          </mesh>

          <CylinderCollider
            args={[
              width / 2,
              radius,
            ]}
            rotation={[
              0,
              0,
              Math.PI / 2,
            ]}
            friction={1.8}
            restitution={0}
            mass={mass}
          />
        </RigidBody>
      );
    },
  );

RobotWheel.displayName =
  "RobotWheel";

export default RobotWheel;
