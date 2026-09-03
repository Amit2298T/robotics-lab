import type {
  ChallengeDefinition,
  ChallengeFailureReason,
  ChallengeSnapshot,
} from "./challenge.types";

type ChallengeListener = (snapshot: ChallengeSnapshot) => void;
type TimerHandle = ReturnType<typeof setTimeout>;

export type ChallengeScheduler = {
  now(): number;
  setTimer(callback: () => void, delayMs: number): TimerHandle;
  clearTimer(handle: TimerHandle): void;
};

type ChallengeEngineOptions = {
  scheduler?: ChallengeScheduler;
  onTerminal?(snapshot: ChallengeSnapshot): void;
};

const browserScheduler: ChallengeScheduler = {
  now: () => Date.now(),
  setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer: (handle) => clearTimeout(handle),
};

export class ChallengeEngine {
  private readonly definition: ChallengeDefinition;
  private readonly scheduler: ChallengeScheduler;
  private readonly onTerminal?: (snapshot: ChallengeSnapshot) => void;
  private readonly listeners = new Set<ChallengeListener>();
  private timer: TimerHandle | null = null;
  private runVersion = 0;
  private currentSnapshot: ChallengeSnapshot;

  constructor(
    definition: ChallengeDefinition,
    options: ChallengeEngineOptions = {},
  ) {
    this.definition = definition;
    this.scheduler = options.scheduler ?? browserScheduler;
    this.onTerminal = options.onTerminal;
    this.currentSnapshot = this.createIdleSnapshot();
  }

  get snapshot(): ChallengeSnapshot {
    return this.currentSnapshot;
  }

  subscribe(listener: ChallengeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): boolean {
    if (this.currentSnapshot.status !== "idle") {
      return false;
    }

    this.clearActiveTimer();
    this.runVersion += 1;
    const version = this.runVersion;
    const startedAt = this.scheduler.now();
    this.currentSnapshot = {
      definition: this.definition,
      status: "running",
      failureReason: null,
      startedAt,
      deadline: startedAt + this.definition.timeLimitMs,
      endedAt: null,
    };

    this.timer = this.scheduler.setTimer(() => {
      if (version === this.runVersion) {
        this.fail("timeout");
      }
    }, this.definition.timeLimitMs);
    this.emit();

    return true;
  }

  handleTargetReached(): void {
    if (this.currentSnapshot.status !== "running") {
      return;
    }

    this.finish("success", null);
  }

  handleCollision(): void {
    if (
      this.currentSnapshot.status !== "running" ||
      !this.definition.failOnCollision
    ) {
      return;
    }

    this.fail("collision");
  }

  reset(): void {
    this.runVersion += 1;
    this.clearActiveTimer();
    this.currentSnapshot = this.createIdleSnapshot();
    this.emit();
  }

  private fail(reason: ChallengeFailureReason): void {
    if (this.currentSnapshot.status !== "running") {
      return;
    }

    this.finish("failed", reason);
  }

  private finish(
    status: "success" | "failed",
    failureReason: ChallengeFailureReason | null,
  ): void {
    this.runVersion += 1;
    this.clearActiveTimer();
    this.currentSnapshot = {
      ...this.currentSnapshot,
      status,
      failureReason,
      endedAt: this.scheduler.now(),
    };
    this.emit();
    this.onTerminal?.(this.currentSnapshot);
  }

  private clearActiveTimer(): void {
    if (this.timer !== null) {
      this.scheduler.clearTimer(this.timer);
      this.timer = null;
    }
  }

  private createIdleSnapshot(): ChallengeSnapshot {
    return {
      definition: this.definition,
      status: "idle",
      failureReason: null,
      startedAt: null,
      deadline: null,
      endedAt: null,
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.currentSnapshot);
    }
  }
}
