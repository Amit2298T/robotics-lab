import { CommandEngine } from "./CommandEngine";
import { robotConfig } from "@/simulation/robot/robot.config";
import { simulationAdapter } from "@/simulation/robot/SimulationAdapter";

export const commandEngine = new CommandEngine(
  simulationAdapter,
  robotConfig.control,
);

