import { CommandRunner } from "./CommandRunner";
import { commandRunnerConfig } from "./commandRunner.config";
import { commandEngine } from "./activeCommandEngine";

export const commandRunner = new CommandRunner(
  commandEngine,
  commandRunnerConfig,
);
