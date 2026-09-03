export type ProgramStatus =
  | "idle"
  | "running"
  | "stopping"
  | "completed"
  | "error";

export type ProgramConsoleLevel =
  | "info"
  | "command"
  | "warning"
  | "error";

export type ProgramConsoleEntry = {
  id: number;
  level: ProgramConsoleLevel;
  message: string;
};

export type ProgramRuntimeEvent =
  | { type: "STATUS_CHANGED"; status: ProgramStatus }
  | { type: "CONSOLE_ENTRY"; entry: ProgramConsoleEntry };
