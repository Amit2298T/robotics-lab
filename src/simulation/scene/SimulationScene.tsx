"use client";

import CameraController from "./CameraController";
import Lighting from "./Lighting";
import SimulationWorld from "./SimulationWorld";

export default function SimulationScene() {
  return (
    <>
      <Lighting />
      <SimulationWorld />
      <CameraController />
    </>
  );
}