import { commandRunner } from "@/simulation/commands/activeCommandRunner";
import { robotAdapter } from "@/simulation/robot/activeRobotAdapter";
import { programRuntime } from "@/runtime/activeProgramRuntime";

import { ChallengeEngine } from "./ChallengeEngine";
import { reachGoalChallenge } from "./challenge.config";

export const challengeEngine = new ChallengeEngine(reachGoalChallenge, {
  onTerminal: () => {
    const programOwnedRunner = programRuntime.stop();

    if (!programOwnedRunner) {
      commandRunner.cancel();
    }
  },
});

robotAdapter.subscribeBumperHits(() => {
  challengeEngine.handleCollision();
});
