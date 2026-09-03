import {
  CommandCancelledError,
  CommandRunner,
} from "../src/simulation/commands/CommandRunner.ts";

const dispatched = [];
const commandEngine = {
  dispatch(command) {
    dispatched.push(command);
  },
};
const runner = new CommandRunner(commandEngine, { maxDurationMs: 5_000 });

const cancelledRun = runner.run([{ type: "FORWARD", durationMs: 1_000 }]);

if (!runner.isRunning || dispatched.at(-1)?.type !== "MOVE_FORWARD") {
  throw new Error("initial automated command did not start");
}

runner.cancel();
commandEngine.dispatch({ type: "TURN_LEFT" });

try {
  await cancelledRun;
  throw new Error("cancelled command unexpectedly completed");
} catch (error) {
  if (!(error instanceof CommandCancelledError)) {
    throw error;
  }
}

if (runner.isRunning || dispatched.at(-1)?.type !== "TURN_LEFT") {
  throw new Error("stale cancellation stopped the manual takeover command");
}

await runner.run([
  { type: "FORWARD", durationMs: 0 },
  { type: "TURN_RIGHT", durationMs: 0 },
  { type: "STOP" },
]);

if (runner.isRunning || dispatched.at(-1)?.type !== "STOP") {
  throw new Error("completed demo retained command-runner ownership");
}

commandEngine.dispatch({ type: "MOVE_BACKWARD" });

if (dispatched.at(-1)?.type !== "MOVE_BACKWARD") {
  throw new Error("manual command failed after demo completion");
}

console.log("Control ownership verification passed.");
