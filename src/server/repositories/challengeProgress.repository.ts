import "server-only";

import type {
  ChallengeAttemptStatus,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";

import {
  applyChallengeSuccess,
  type ChallengeSuccessResult,
} from "@/server/domain/challengeProgress.domain";

export type ChallengeProgressRecord = {
  id: string;
  userId: string;
  challengeId: string;
  attempts: number;
  completions: number;
  bestTimeMs: number | null;
  bestScore: number | null;
  stars: number;
  lastCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChallengeAttemptRecord = {
  id: string;
  userId: string;
  challengeId: string;
  runId: number;
  status: ChallengeAttemptStatus;
  elapsedTimeMs: number | null;
  score: number | null;
  stars: number | null;
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
};

export type ChallengeMutationRecord = {
  progress: ChallengeProgressRecord;
  attempt: ChallengeAttemptRecord;
  duplicate: boolean;
};

export interface ChallengeProgressRepository {
  get(userId: string, challengeId: string): Promise<ChallengeProgressRecord | null>;
  list(userId: string): Promise<ChallengeProgressRecord[]>;
  recordAttempt(input: {
    userId: string;
    challengeId: string;
    runId: number;
    startedAt: Date;
  }): Promise<ChallengeMutationRecord>;
  recordSuccess(input: {
    userId: string;
    challengeId: string;
    runId: number;
    startedAt: Date;
    result: ChallengeSuccessResult;
  }): Promise<ChallengeMutationRecord>;
}

export class PrismaChallengeProgressRepository
  implements ChallengeProgressRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  get(
    userId: string,
    challengeId: string,
  ): Promise<ChallengeProgressRecord | null> {
    return this.prisma.challengeProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
  }

  list(userId: string): Promise<ChallengeProgressRecord[]> {
    return this.prisma.challengeProgress.findMany({
      where: { userId },
      orderBy: { challengeId: "asc" },
    });
  }

  async recordAttempt(input: {
    userId: string;
    challengeId: string;
    runId: number;
    startedAt: Date;
  }): Promise<ChallengeMutationRecord> {
    try {
      return await this.prisma.$transaction(
        (transaction) => this.recordAttemptTransaction(transaction, input),
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return this.readDuplicateMutation(input);
      }
      throw error;
    }
  }

  async recordSuccess(input: {
    userId: string;
    challengeId: string;
    runId: number;
    startedAt: Date;
    result: ChallengeSuccessResult;
  }): Promise<ChallengeMutationRecord> {
    try {
      return await this.prisma.$transaction(
        (transaction) => this.recordSuccessTransaction(transaction, input),
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return this.readDuplicateMutation(input);
      }
      throw error;
    }
  }

  private async recordAttemptTransaction(
    transaction: Prisma.TransactionClient,
    input: {
      userId: string;
      challengeId: string;
      runId: number;
      startedAt: Date;
    },
  ): Promise<ChallengeMutationRecord> {
    const existing = await this.findAttempt(transaction, input);
    if (existing) {
      const progress = await this.ensureProgress(transaction, input);
      return { progress, attempt: existing, duplicate: true };
    }

    const attempt = await transaction.challengeAttempt.create({
      data: { ...input, status: "STARTED" },
    });
    const progress = await transaction.challengeProgress.upsert({
      where: {
        userId_challengeId: {
          userId: input.userId,
          challengeId: input.challengeId,
        },
      },
      create: {
        userId: input.userId,
        challengeId: input.challengeId,
        attempts: 1,
      },
      update: { attempts: { increment: 1 } },
    });
    return { progress, attempt, duplicate: false };
  }

  private async recordSuccessTransaction(
    transaction: Prisma.TransactionClient,
    input: {
      userId: string;
      challengeId: string;
      runId: number;
      startedAt: Date;
      result: ChallengeSuccessResult;
    },
  ): Promise<ChallengeMutationRecord> {
    const existingAttempt = await this.findAttempt(transaction, input);
    if (existingAttempt?.status === "SUCCESS") {
      const progress = await this.ensureProgress(transaction, input);
      return { progress, attempt: existingAttempt, duplicate: true };
    }

    const countAttempt = existingAttempt === null;
    const attempt = existingAttempt
      ? await transaction.challengeAttempt.update({
          where: { id: existingAttempt.id },
          data: {
            status: "SUCCESS",
            elapsedTimeMs: input.result.elapsedTimeMs,
            score: input.result.score,
            stars: input.result.stars,
            endedAt: input.result.endedAt,
          },
        })
      : await transaction.challengeAttempt.create({
          data: {
            userId: input.userId,
            challengeId: input.challengeId,
            runId: input.runId,
            status: "SUCCESS",
            elapsedTimeMs: input.result.elapsedTimeMs,
            score: input.result.score,
            stars: input.result.stars,
            startedAt: input.startedAt,
            endedAt: input.result.endedAt,
          },
        });

    const current = await this.ensureProgress(transaction, input);
    const aggregate = applyChallengeSuccess(current, input.result, countAttempt);
    const progress = await transaction.challengeProgress.update({
      where: { id: current.id },
      data: aggregate,
    });
    return { progress, attempt, duplicate: false };
  }

  private findAttempt(
    transaction: Prisma.TransactionClient,
    input: { userId: string; challengeId: string; runId: number },
  ): Promise<ChallengeAttemptRecord | null> {
    return transaction.challengeAttempt.findUnique({
      where: {
        userId_challengeId_runId: {
          userId: input.userId,
          challengeId: input.challengeId,
          runId: input.runId,
        },
      },
    });
  }

  private ensureProgress(
    transaction: Prisma.TransactionClient,
    input: { userId: string; challengeId: string },
  ): Promise<ChallengeProgressRecord> {
    return transaction.challengeProgress.upsert({
      where: {
        userId_challengeId: {
          userId: input.userId,
          challengeId: input.challengeId,
        },
      },
      create: {
        userId: input.userId,
        challengeId: input.challengeId,
      },
      update: {},
    });
  }

  private async readDuplicateMutation(input: {
    userId: string;
    challengeId: string;
    runId: number;
  }): Promise<ChallengeMutationRecord> {
    const [attempt, progress] = await Promise.all([
      this.prisma.challengeAttempt.findUnique({
        where: {
          userId_challengeId_runId: {
            userId: input.userId,
            challengeId: input.challengeId,
            runId: input.runId,
          },
        },
      }),
      this.get(input.userId, input.challengeId),
    ]);
    if (!attempt || !progress) {
      throw new Error("Duplicate challenge mutation could not be resolved.");
    }
    return { attempt, progress, duplicate: true };
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
