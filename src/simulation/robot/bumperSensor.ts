export const BUMPER_IGNORED_USER_DATA_KEY = "bumperSensorIgnored";

type BumperContact = {
  colliderHandle: number;
  rigidBodyHandle: number | null;
  rigidBodyUserData: unknown;
};

function isBumperIgnored(userData: unknown): boolean {
  return (
    typeof userData === "object" &&
    userData !== null &&
    BUMPER_IGNORED_USER_DATA_KEY in userData &&
    (userData as Record<string, unknown>)[BUMPER_IGNORED_USER_DATA_KEY] ===
      true
  );
}

export class BumperContactTracker {
  private readonly activeColliderHandles = new Set<number>();
  private readonly internalBodyHandles = new Set<number>();

  setInternalBodyHandles(handles: Iterable<number>): void {
    this.internalBodyHandles.clear();

    for (const handle of handles) {
      this.internalBodyHandles.add(handle);
    }

    this.clear();
  }

  beginContact(contact: BumperContact): boolean {
    if (
      (contact.rigidBodyHandle !== null &&
        this.internalBodyHandles.has(contact.rigidBodyHandle)) ||
      isBumperIgnored(contact.rigidBodyUserData)
    ) {
      return false;
    }

    const previousSize = this.activeColliderHandles.size;
    this.activeColliderHandles.add(contact.colliderHandle);
    return this.activeColliderHandles.size !== previousSize;
  }

  endContact(colliderHandle: number): void {
    this.activeColliderHandles.delete(colliderHandle);
  }

  clear(): void {
    this.activeColliderHandles.clear();
  }

  get bumped(): boolean {
    return this.activeColliderHandles.size > 0;
  }
}
