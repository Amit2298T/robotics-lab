export type ManualDriveDirection =
  | "forward"
  | "backward"
  | "left"
  | "right";

type ManualDriveCommands = {
  forward(): void;
  backward(): void;
  left(): void;
  right(): void;
  stop(): void;
};

export type ManualDriveKeyEvent = {
  key: string;
  repeat: boolean;
  target: EventTarget | null;
  preventDefault(): void;
};

type EditableElementLike = {
  tagName?: string;
  isContentEditable?: boolean;
  parentElement?: EditableElementLike | null;
  closest?(selector: string): unknown;
  getAttribute?(name: string): string | null;
};

const movementKeys: Record<string, ManualDriveDirection> = {
  w: "forward",
  arrowup: "forward",
  s: "backward",
  arrowdown: "backward",
  a: "left",
  arrowleft: "left",
  d: "right",
  arrowright: "right",
};

export class ManualDriveController {
  private readonly commands: ManualDriveCommands;
  private activeKeyboardKey: string | null = null;

  constructor(commands: ManualDriveCommands) {
    this.commands = commands;
  }

  start(direction: ManualDriveDirection): void {
    this.activeKeyboardKey = null;
    this.runDirection(direction);
  }

  stop(): void {
    this.activeKeyboardKey = null;
    this.commands.stop();
  }

  handleKeyDown(
    event: ManualDriveKeyEvent,
    enabled: boolean,
  ): boolean {
    if (!enabled || isEditableTarget(event.target)) {
      return false;
    }

    const key = normalizeKey(event.key);
    if (key === " " || key === "space" || key === "spacebar") {
      event.preventDefault();
      this.stop();
      return true;
    }

    const direction = movementKeys[key];
    if (!direction) {
      return false;
    }

    event.preventDefault();
    if (event.repeat) {
      return true;
    }

    this.activeKeyboardKey = key;
    this.runDirection(direction);
    return true;
  }

  handleKeyUp(event: ManualDriveKeyEvent, enabled: boolean): boolean {
    if (!enabled) {
      return false;
    }

    const key = normalizeKey(event.key);
    if (!movementKeys[key] || key !== this.activeKeyboardKey) {
      return false;
    }

    event.preventDefault();
    this.stop();
    return true;
  }

  private runDirection(direction: ManualDriveDirection): void {
    switch (direction) {
      case "forward":
        this.commands.forward();
        return;
      case "backward":
        this.commands.backward();
        return;
      case "left":
        this.commands.left();
        return;
      case "right":
        this.commands.right();
    }
  }
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (target === null || typeof target !== "object") {
    return false;
  }

  const candidate = target as EditableElementLike;
  const element = candidate.tagName ? candidate : candidate.parentElement;
  if (!element) {
    return false;
  }

  const tagName = element.tagName?.toLowerCase();
  if (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable ||
    element.getAttribute?.("role") === "textbox"
  ) {
    return true;
  }

  return Boolean(
    element.closest?.(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"], .monaco-editor',
    ),
  );
}

function normalizeKey(key: string): string {
  return key.toLowerCase();
}
