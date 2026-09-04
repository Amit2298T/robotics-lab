import type {
  BehaviorDetail,
  BehaviorSnapshot,
  RobotBehaviorDefinition,
} from "./behavior.types";
import type { RobotAdapter } from "@/simulation/types/robot.types";
import { robotConfig } from "../simulation/robot/robot.config.ts";
import {
  calculateTargetHeading,
  distance2D,
  normalizeAngle,
  type NavigationTarget,
} from "./behaviorNavigation.ts";
import {
  NAVIGATION_GRID_SIZE,
  NAVIGATION_OBSTACLE_INFLATION,
  planGridPath,
  type GridPathPlanner,
  type NavigationBlockage,
} from "./gridPathPlanner.ts";

type BehaviorCommandRunner = {
  forward(durationMs: number): Promise<void>;
  backward(durationMs: number): Promise<void>;
  turnLeft(durationMs: number): Promise<void>;
  turnRight(durationMs: number): Promise<void>;
  stop(): void;
  cancel(): void;
};

export type BehaviorTimingConfig = {
  patrolForwardMs: number;
  patrolTurnMs: number;
  avoidanceForwardMs: number;
  avoidanceTurnMs: number;
  reachForwardStepMs: number;
  reachTurnStepMs: number;
  returnTurnMs: number;
  returnForwardMs: number;
};

type BehaviorRunnerOptions = {
  timings?: Partial<BehaviorTimingConfig>;
  obstacleDistance?: number;
  emergencyObstacleDistance?: number;
  maxNavigationReplans?: number;
  homeTolerance?: number;
  targetTolerance?: number;
  headingTolerance?: number;
  waypointTolerance?: number;
  maxNavigationIterations?: number;
  maxNavigationDurationMs?: number;
  getTargetPosition?(): NavigationTarget;
  pathPlanner?: GridPathPlanner;
  now?(): number;
  onBeforeStart?(): void;
};

type BehaviorListener = (snapshot: BehaviorSnapshot) => void;

const defaultTimings: BehaviorTimingConfig = {
  patrolForwardMs: 1_200,
  patrolTurnMs: 450,
  avoidanceForwardMs: 450,
  avoidanceTurnMs: 500,
  reachForwardStepMs: 180,
  reachTurnStepMs: 80,
  returnTurnMs: 250,
  returnForwardMs: 350,
};

type BehaviorExecutionContext = {
  startedAt: number;
  pausedAt: number | null;
  pausedDurationMs: number;
  navigationIterations: number;
  reach: {
    waypoints: NavigationTarget[];
    waypointIndex: number;
    targetKey: string | null;
    replanCount: number;
    dynamicBlockages: NavigationBlockage[];
  };
};

export class BehaviorRunner {
  private readonly behaviorDefinitions: readonly RobotBehaviorDefinition[];
  private readonly commandRunner: BehaviorCommandRunner;
  private readonly robotAdapter: RobotAdapter;
  private readonly timings: BehaviorTimingConfig;
  private readonly obstacleDistance: number;
  private readonly emergencyObstacleDistance: number;
  private readonly maxNavigationReplans: number;
  private readonly homeTolerance: number;
  private readonly targetTolerance: number;
  private readonly headingTolerance: number;
  private readonly waypointTolerance: number;
  private readonly maxNavigationIterations: number;
  private readonly maxNavigationDurationMs: number;
  private readonly getTargetPosition?: () => NavigationTarget;
  private readonly pathPlanner: GridPathPlanner;
  private readonly now: () => number;
  private readonly onBeforeStart?: () => void;
  private readonly listeners = new Set<BehaviorListener>();
  private readonly resumeWaiters = new Set<() => void>();
  private activeController: AbortController | null = null;
  private activeContext: BehaviorExecutionContext | null = null;
  private currentSnapshot: BehaviorSnapshot;

  constructor(
    definitions: readonly RobotBehaviorDefinition[],
    commandRunner: BehaviorCommandRunner,
    robotAdapter: RobotAdapter,
    options: BehaviorRunnerOptions = {},
  ) {
    if (definitions.length === 0) {
      throw new Error("BehaviorRunner requires at least one behavior.");
    }

    this.behaviorDefinitions = [...definitions];
    this.commandRunner = commandRunner;
    this.robotAdapter = robotAdapter;
    this.timings = { ...defaultTimings, ...options.timings };
    this.obstacleDistance = options.obstacleDistance ?? 1.1;
    this.emergencyObstacleDistance =
      options.emergencyObstacleDistance ?? 0.45;
    this.maxNavigationReplans = options.maxNavigationReplans ?? 3;
    this.homeTolerance = options.homeTolerance ?? 0.3;
    this.targetTolerance = options.targetTolerance ?? 0.55;
    this.headingTolerance = options.headingTolerance ?? 0.18;
    this.waypointTolerance = options.waypointTolerance ?? 0.1;
    this.maxNavigationIterations = options.maxNavigationIterations ?? 300;
    this.maxNavigationDurationMs = options.maxNavigationDurationMs ?? 60_000;
    this.getTargetPosition = options.getTargetPosition;
    this.pathPlanner = options.pathPlanner ?? planGridPath;
    this.now = options.now ?? (() => Date.now());
    this.onBeforeStart = options.onBeforeStart;
    this.currentSnapshot = this.createIdleSnapshot(
      this.behaviorDefinitions[0],
    );
  }

  get snapshot(): BehaviorSnapshot {
    return this.currentSnapshot;
  }

  get definitions(): readonly RobotBehaviorDefinition[] {
    return this.behaviorDefinitions;
  }

  subscribe(listener: BehaviorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  selectBehavior(behaviorId: string): boolean {
    const definition = this.behaviorDefinitions.find(
      ({ id }) => id === behaviorId,
    );
    if (!definition || definition.id === this.currentSnapshot.definition.id) {
      return false;
    }

    this.stop();
    this.currentSnapshot = this.createIdleSnapshot(definition);
    this.emit();
    return true;
  }

  start(): boolean {
    if (this.activeController !== null) {
      return false;
    }

    this.onBeforeStart?.();
    const controller = new AbortController();
    const context: BehaviorExecutionContext = {
      startedAt: this.now(),
      pausedAt: null,
      pausedDurationMs: 0,
      navigationIterations: 0,
      reach: {
        waypoints: [],
        waypointIndex: 0,
        targetKey: null,
        replanCount: 0,
        dynamicBlockages: [],
      },
    };
    this.activeController = controller;
    this.activeContext = context;
    this.currentSnapshot = {
      definition: this.currentSnapshot.definition,
      status: "running",
      detail:
        this.currentSnapshot.definition.kind === "reach-target"
          ? "Navigating"
          : null,
      error: null,
    };
    this.emit();
    void this.executeBehavior(controller, context);
    return true;
  }

  pause(): boolean {
    if (
      this.activeController === null ||
      this.currentSnapshot.status !== "running"
    ) {
      return false;
    }

    this.currentSnapshot = {
      ...this.currentSnapshot,
      status: "paused",
    };
    if (this.activeContext) {
      this.activeContext.pausedAt = this.now();
    }
    this.commandRunner.cancel();
    this.emit();
    return true;
  }

  resume(): boolean {
    if (
      this.activeController === null ||
      this.currentSnapshot.status !== "paused"
    ) {
      return false;
    }

    this.currentSnapshot = {
      ...this.currentSnapshot,
      status: "running",
    };
    if (this.activeContext?.pausedAt !== null && this.activeContext) {
      this.activeContext.pausedDurationMs +=
        this.now() - this.activeContext.pausedAt;
      this.activeContext.pausedAt = null;
    }
    this.emit();
    this.releaseResumeWaiters();
    return true;
  }

  stop(): boolean {
    const controller = this.activeController;
    if (controller === null) {
      if (this.currentSnapshot.status === "error") {
        this.currentSnapshot = this.createIdleSnapshot(
          this.currentSnapshot.definition,
        );
        this.emit();
        return true;
      }
      return false;
    }

    this.activeController = null;
    this.activeContext = null;
    controller.abort();
    this.commandRunner.cancel();
    this.releaseResumeWaiters();
    this.currentSnapshot = this.createIdleSnapshot(
      this.currentSnapshot.definition,
    );
    this.emit();
    return true;
  }

  private async executeBehavior(
    controller: AbortController,
    context: BehaviorExecutionContext,
  ): Promise<void> {
    try {
      let shouldContinue = true;
      while (!controller.signal.aborted && shouldContinue) {
        await this.waitUntilRunnable(controller.signal);

        try {
          shouldContinue = await this.executeCycle(
            this.currentSnapshot.definition,
            controller.signal,
            context,
          );
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }

          if (isCommandCancellation(error)) {
            continue;
          }

          throw error;
        }
      }

      if (this.activeController === controller) {
        this.activeController = null;
        this.activeContext = null;
        this.commandRunner.stop();
        this.currentSnapshot = {
          ...this.currentSnapshot,
          status: "idle",
          error: null,
        };
        this.emit();
      }
    } catch (error) {
      if (this.activeController !== controller) {
        return;
      }

      this.activeController = null;
      this.activeContext = null;
      this.commandRunner.cancel();
      this.currentSnapshot = {
        definition: this.currentSnapshot.definition,
        status: "error",
        detail: null,
        error:
          error instanceof Error ? error.message : "Behavior execution failed.",
      };
      this.emit();
    }
  }

  private async executeCycle(
    definition: RobotBehaviorDefinition,
    signal: AbortSignal,
    context: BehaviorExecutionContext,
  ): Promise<boolean> {
    switch (definition.kind) {
      case "patrol":
        await this.commandRunner.forward(this.timings.patrolForwardMs);
        await this.waitUntilRunnable(signal);
        await this.commandRunner.turnLeft(this.timings.patrolTurnMs);
        return true;

      case "avoid-obstacles": {
        const distance = await this.robotAdapter.readDistanceSensor();
        await this.waitUntilRunnable(signal);
        if (distance <= this.obstacleDistance) {
          await this.commandRunner.turnRight(this.timings.avoidanceTurnMs);
        } else {
          await this.commandRunner.forward(this.timings.avoidanceForwardMs);
        }
        return true;
      }

      case "reach-target":
        return this.executeReachTargetCycle(signal, context);

      case "return-home": {
        const odometry = await this.robotAdapter.readOdometry();
        await this.waitUntilRunnable(signal);
        const distanceHome = Math.hypot(odometry.x, odometry.z);
        if (distanceHome <= this.homeTolerance) {
          return false;
        }

        const targetHeading = calculateTargetHeading(
          -odometry.x,
          -odometry.z,
        );
        const headingError = normalizeAngle(
          targetHeading - odometry.heading,
        );
        if (Math.abs(headingError) > 0.2) {
          if (headingError > 0) {
            await this.commandRunner.turnLeft(this.timings.returnTurnMs);
          } else {
            await this.commandRunner.turnRight(this.timings.returnTurnMs);
          }
        } else {
          await this.commandRunner.forward(this.timings.returnForwardMs);
        }
        return true;
      }
    }
  }

  private async executeReachTargetCycle(
    signal: AbortSignal,
    context: BehaviorExecutionContext,
  ): Promise<boolean> {
    context.navigationIterations += 1;
    if (
      context.navigationIterations > this.maxNavigationIterations ||
      this.now() - context.startedAt - context.pausedDurationMs >
        this.maxNavigationDurationMs
    ) {
      throw new Error("Navigation blocked.");
    }

    const target = this.getTargetPosition?.();
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) {
      throw new Error("Reach Target does not have a valid selected target.");
    }

    const odometry = await this.robotAdapter.readOdometry();
    await this.waitUntilRunnable(signal);
    const dx = target.x - odometry.x;
    const dz = target.z - odometry.z;
    if (this.isInsideTarget(dx, dz, target)) {
      this.setDetail("Target reached");
      return false;
    }

    this.ensurePath(context, odometry, target);
    while (
      context.reach.waypointIndex < context.reach.waypoints.length - 1 &&
      this.distanceToWaypoint(
        odometry,
        context.reach.waypoints[context.reach.waypointIndex],
      ) <= this.waypointTolerance
    ) {
      context.reach.waypointIndex += 1;
    }

    const waypoint = context.reach.waypoints[context.reach.waypointIndex];
    if (!waypoint) {
      throw new Error("Navigation blocked.");
    }

    const waypointDx = waypoint.x - odometry.x;
    const waypointDz = waypoint.z - odometry.z;
    const desiredHeading = calculateTargetHeading(waypointDx, waypointDz);
    const headingError = normalizeAngle(desiredHeading - odometry.heading);
    if (Math.abs(headingError) > this.headingTolerance) {
      this.setDetail("Turning");
      if (headingError > 0) {
        await this.commandRunner.turnLeft(this.timings.reachTurnStepMs);
      } else {
        await this.commandRunner.turnRight(this.timings.reachTurnStepMs);
      }
      return true;
    }

    const clearance = await this.robotAdapter.readDistanceSensor();
    await this.waitUntilRunnable(signal);
    if (clearance <= this.emergencyObstacleDistance) {
      this.commandRunner.stop();
      this.replanAfterUnexpectedBlockage(context, odometry, clearance, target);
      return true;
    }

    this.setDetail("Navigating");
    await this.commandRunner.forward(this.timings.reachForwardStepMs);
    return true;
  }

  private ensurePath(
    context: BehaviorExecutionContext,
    position: NavigationTarget,
    target: NavigationTarget,
  ): void {
    const targetKey = `${target.x}:${target.z}`;
    if (
      context.reach.targetKey === targetKey &&
      context.reach.waypoints.length > 0
    ) {
      return;
    }

    this.setDetail(
      context.reach.replanCount > 0 ? "Replanning route" : "Planning route",
    );
    const path = this.pathPlanner(
      position,
      target,
      context.reach.dynamicBlockages,
    );
    if (!path || path.waypoints.length < 2) {
      throw new Error("Navigation blocked.");
    }

    context.reach.waypoints = path.waypoints;
    context.reach.waypointIndex = 1;
    context.reach.targetKey = targetKey;
  }

  private replanAfterUnexpectedBlockage(
    context: BehaviorExecutionContext,
    odometry: NavigationTarget & { heading: number },
    clearance: number,
    target: NavigationTarget,
  ): void {
    if (context.reach.replanCount >= this.maxNavigationReplans) {
      throw new Error("Navigation blocked.");
    }

    context.reach.replanCount += 1;
    const blockageDistance =
      Math.abs(robotConfig.distanceSensor.originOffset[2]) +
      clearance +
      NAVIGATION_GRID_SIZE / 2;
    context.reach.dynamicBlockages.push({
      x: odometry.x - Math.sin(odometry.heading) * blockageDistance,
      z: odometry.z - Math.cos(odometry.heading) * blockageDistance,
      radius: NAVIGATION_OBSTACLE_INFLATION,
    });
    context.reach.targetKey = null;
    context.reach.waypoints = [];
    this.setDetail("Replanning route");
    this.ensurePath(context, odometry, target);
  }

  private distanceToWaypoint(
    position: NavigationTarget,
    waypoint: NavigationTarget,
  ): number {
    return distance2D(waypoint.x - position.x, waypoint.z - position.z);
  }

  private isInsideTarget(
    dx: number,
    dz: number,
    target: NavigationTarget,
  ): boolean {
    if (
      target.halfWidth !== undefined &&
      target.halfDepth !== undefined
    ) {
      return Math.abs(dx) <= target.halfWidth && Math.abs(dz) <= target.halfDepth;
    }
    return distance2D(dx, dz) <= this.targetTolerance;
  }

  private setDetail(detail: BehaviorDetail): void {
    if (this.currentSnapshot.detail === detail) {
      return;
    }

    this.currentSnapshot = { ...this.currentSnapshot, detail };
    this.emit();
  }

  private waitUntilRunnable(signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      return Promise.reject(createAbortError());
    }

    if (this.currentSnapshot.status !== "paused") {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const resume = () => {
        signal.removeEventListener("abort", handleAbort);
        resolve();
      };
      const handleAbort = () => {
        this.resumeWaiters.delete(resume);
        reject(createAbortError());
      };

      this.resumeWaiters.add(resume);
      signal.addEventListener("abort", handleAbort, { once: true });
    });
  }

  private releaseResumeWaiters(): void {
    const waiters = [...this.resumeWaiters];
    this.resumeWaiters.clear();
    for (const resume of waiters) {
      resume();
    }
  }

  private createIdleSnapshot(
    definition: RobotBehaviorDefinition,
  ): BehaviorSnapshot {
    return { definition, status: "idle", detail: null, error: null };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.currentSnapshot);
    }
  }
}

function isCommandCancellation(error: unknown): boolean {
  return error instanceof Error && error.name === "CommandCancelledError";
}

function createAbortError(): Error {
  const error = new Error("Behavior was stopped.");
  error.name = "AbortError";
  return error;
}
