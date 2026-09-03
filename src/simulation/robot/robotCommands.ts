import { commandEngine } from "@/simulation/commands/activeCommandEngine";

export function moveForward() {
  commandEngine.dispatch({ type: "MOVE_FORWARD" });
}

export function moveBackward() {
  commandEngine.dispatch({ type: "MOVE_BACKWARD" });
}

export function turnLeft() {
  commandEngine.dispatch({ type: "TURN_LEFT" });
}

export function turnRight() {
  commandEngine.dispatch({ type: "TURN_RIGHT" });
}

export function stopRobot() {
  commandEngine.dispatch({ type: "STOP" });
}

export function setWheelVelocities(
  left: number,
  right: number,
) {
  commandEngine.dispatch({
    type: "SET_WHEEL_VELOCITIES",
    payload: { left, right },
  });
}
