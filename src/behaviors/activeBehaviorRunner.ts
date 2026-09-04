import { programRuntime } from "@/runtime/activeProgramRuntime";
import { challengeEngine } from "@/challenges/activeChallengeEngine";
import { commandRunner } from "@/simulation/commands/activeCommandRunner";
import { robotAdapter } from "@/simulation/robot/activeRobotAdapter";

import { behaviorCatalog } from "./behavior.config";
import { BehaviorRunner } from "./BehaviorRunner";

export const behaviorRunner = new BehaviorRunner(
  behaviorCatalog,
  commandRunner,
  robotAdapter,
  {
    getTargetPosition: () => {
      const { position, size } =
        challengeEngine.snapshot.definition.targetZone;
      const [x, , z] = position;
      return {
        x,
        z,
        halfWidth: size[0] / 2,
        halfDepth: size[2] / 2,
      };
    },
    onBeforeStart: () => {
      const programOwnedRunner = programRuntime.stop();
      if (!programOwnedRunner) {
        commandRunner.cancel();
      }
    },
  },
);
