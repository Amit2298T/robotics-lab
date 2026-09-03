import { CommandEngine } from "./CommandEngine";
import { robotConfig } from "@/simulation/robot/robot.config";
import { robotAdapter } from "@/simulation/robot/activeRobotAdapter";

export const commandEngine = new CommandEngine(
  robotAdapter,
  robotConfig.control,
);
