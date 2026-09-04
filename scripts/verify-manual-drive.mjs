import {
  isEditableTarget,
  ManualDriveController,
} from "../src/simulation/controls/ManualDriveController.ts";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createHarness() {
  const commands = [];
  const controller = new ManualDriveController({
    forward: () => commands.push("FORWARD"),
    backward: () => commands.push("BACKWARD"),
    left: () => commands.push("LEFT"),
    right: () => commands.push("RIGHT"),
    stop: () => commands.push("STOP"),
  });
  return { controller, commands };
}

function keyEvent(key, options = {}) {
  let prevented = false;
  return {
    event: {
      key,
      repeat: options.repeat ?? false,
      target: options.target ?? null,
      preventDefault: () => {
        prevented = true;
      },
    },
    wasPrevented: () => prevented,
  };
}

const movementCases = [
  ["w", "FORWARD"],
  ["W", "FORWARD"],
  ["ArrowUp", "FORWARD"],
  ["s", "BACKWARD"],
  ["ArrowDown", "BACKWARD"],
  ["a", "LEFT"],
  ["ArrowLeft", "LEFT"],
  ["d", "RIGHT"],
  ["ArrowRight", "RIGHT"],
];

for (const [key, expected] of movementCases) {
  const { controller, commands } = createHarness();
  const keyDown = keyEvent(key);
  assert(controller.handleKeyDown(keyDown.event, true), `${key} was ignored`);
  assert(keyDown.wasPrevented(), `${key} did not prevent browser behavior`);
  assert(commands.at(-1) === expected, `${key} mapped to the wrong command`);

  const keyUp = keyEvent(key);
  assert(controller.handleKeyUp(keyUp.event, true), `${key} keyup was ignored`);
  assert(keyUp.wasPrevented(), `${key} keyup was not consumed`);
  assert(commands.at(-1) === "STOP", `${key} keyup did not stop`);
}

{
  const { controller, commands } = createHarness();
  const space = keyEvent(" ");
  assert(controller.handleKeyDown(space.event, true), "Space was ignored");
  assert(space.wasPrevented(), "Space did not prevent page scrolling");
  assert(commands.at(-1) === "STOP", "Space did not stop immediately");
}

{
  const { controller, commands } = createHarness();
  controller.handleKeyDown(keyEvent("w").event, true);
  controller.handleKeyDown(keyEvent("d").event, true);
  assert(commands.at(-1) === "RIGHT", "most recent movement key did not win");
  controller.handleKeyUp(keyEvent("w").event, true);
  assert(commands.at(-1) === "RIGHT", "older key release stopped active direction");
  controller.handleKeyUp(keyEvent("d").event, true);
  assert(commands.at(-1) === "STOP", "active key release did not stop");
}

{
  const { controller, commands } = createHarness();
  controller.handleKeyDown(keyEvent("w").event, true);
  const repeated = keyEvent("w", { repeat: true });
  controller.handleKeyDown(repeated.event, true);
  assert(commands.length === 1, "key repeat issued a duplicate movement command");
  assert(repeated.wasPrevented(), "repeated movement key was not consumed");
}

const editableTargets = [
  { tagName: "INPUT" },
  { tagName: "TEXTAREA" },
  { tagName: "SELECT" },
  { tagName: "DIV", isContentEditable: true },
  { tagName: "DIV", getAttribute: (name) => (name === "role" ? "textbox" : null) },
  { tagName: "SPAN", closest: () => ({ className: "monaco-editor" }) },
];

for (const target of editableTargets) {
  const { controller, commands } = createHarness();
  const typing = keyEvent("w", { target });
  assert(isEditableTarget(target), "editable target was not recognized");
  assert(
    !controller.handleKeyDown(typing.event, true),
    "editable field triggered manual driving",
  );
  assert(commands.length === 0, "editable field dispatched a command");
  assert(!typing.wasPrevented(), "editable field input was prevented");
}

{
  const { controller, commands } = createHarness();
  const buildModeKey = keyEvent("ArrowUp");
  assert(
    !controller.handleKeyDown(buildModeKey.event, false),
    "Build Mode accepted a drive hotkey",
  );
  assert(commands.length === 0, "Build Mode dispatched manual movement");
  assert(!buildModeKey.wasPrevented(), "Build Mode keyboard input was blocked");
}

{
  const { controller, commands } = createHarness();
  for (const direction of ["forward", "left", "right", "backward"]) {
    controller.start(direction);
    controller.stop();
  }
  assert(
    commands.join(",") ===
      "FORWARD,STOP,LEFT,STOP,RIGHT,STOP,BACKWARD,STOP",
    "on-screen pointer control commands were incorrect",
  );
}

{
  const { controller, commands } = createHarness();
  controller.start("forward");
  controller.stop();
  controller.stop();
  assert(
    commands.at(-1) === "STOP" && commands.filter((item) => item === "STOP").length === 2,
    "mode switch or Reset did not preserve immediate Stop behavior",
  );
}

console.log("Manual drive verification passed.");
