export const quickJsConfig = {
  maxExecutionTimeMs: 10_000,
  workerStartupGraceMs: 5_000,
  memoryLimitBytes: 32 * 1024 * 1024,
  maxStackSizeBytes: 512 * 1024,
} as const;
