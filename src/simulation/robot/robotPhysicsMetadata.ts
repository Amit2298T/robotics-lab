const ROBOT_PART_KEY = "robotPart";

export const chassisPhysicsMetadata = {
  [ROBOT_PART_KEY]: "chassis",
} as const;

export function isRobotChassis(userData: unknown): boolean {
  return (
    typeof userData === "object" &&
    userData !== null &&
    ROBOT_PART_KEY in userData &&
    (userData as Record<string, unknown>)[ROBOT_PART_KEY] === "chassis"
  );
}
