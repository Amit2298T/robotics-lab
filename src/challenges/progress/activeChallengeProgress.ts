import { ChallengeProgressStore } from "./ChallengeProgressStore.ts";
import type {
  ChallengeProgressDocument,
  ChallengeProgressPersistence,
} from "./challengeProgress.types";

export const CHALLENGE_PROGRESS_STORAGE_KEY =
  "roboforge.challenge-progress.v1";

type ProgressStorage = Pick<Storage, "getItem" | "setItem">;

export class BrowserChallengeProgressPersistence
  implements ChallengeProgressPersistence
{
  private readonly getStorage: () => ProgressStorage | null;

  constructor(
    getStorage: () => ProgressStorage | null = () =>
      typeof window === "undefined" ? null : window.localStorage,
  ) {
    this.getStorage = getStorage;
  }

  load(): unknown {
    const storage = this.getStorage();
    if (storage === null) {
      return null;
    }

    try {
      const stored = storage.getItem(
        CHALLENGE_PROGRESS_STORAGE_KEY,
      );
      return stored === null ? null : JSON.parse(stored);
    } catch {
      return null;
    }
  }

  save(document: ChallengeProgressDocument): void {
    const storage = this.getStorage();
    if (storage === null) {
      return;
    }

    try {
      storage.setItem(
        CHALLENGE_PROGRESS_STORAGE_KEY,
        JSON.stringify(document),
      );
    } catch {
      // Storage may be unavailable or full; progress remains valid in memory.
    }
  }
}

export const challengeProgressStore = new ChallengeProgressStore(
  new BrowserChallengeProgressPersistence(),
);
