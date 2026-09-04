import { commandEngine } from "@/simulation/commands/activeCommandEngine";
import { commandRunner } from "@/simulation/commands/activeCommandRunner";
import { programRuntime } from "@/runtime/activeProgramRuntime";
import { behaviorRunner } from "@/behaviors/activeBehaviorRunner";

function cancelAutomatedCommands() {
  behaviorRunner.stop();
  const programOwnedRunner = programRuntime.stop();

  if (!programOwnedRunner) {
    commandRunner.cancel();
  }
}

export function moveForward() {
  cancelAutomatedCommands();
  commandEngine.dispatch({ type: "MOVE_FORWARD" });
}

export function moveBackward() {
  cancelAutomatedCommands();
  commandEngine.dispatch({ type: "MOVE_BACKWARD" });
}

export function turnLeft() {
  cancelAutomatedCommands();
  commandEngine.dispatch({ type: "TURN_LEFT" });
}

export function turnRight() {
  cancelAutomatedCommands();
  commandEngine.dispatch({ type: "TURN_RIGHT" });
}

export function stopRobot() {
  cancelAutomatedCommands();
}

export function setWheelVelocities(
  left: number,
  right: number,
) {
  cancelAutomatedCommands();
  commandEngine.dispatch({
    type: "SET_WHEEL_VELOCITIES",
    payload: { left, right },
  });
}
