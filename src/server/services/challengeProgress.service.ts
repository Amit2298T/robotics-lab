import { challengeCatalog } from "../../challenges/challenge.config.ts";
import { calculateCompletionResult } from "../../challenges/progress/challengeScoring.ts";
import { ValidationError } from "../errors.ts";
import type {
  ChallengeAttemptRecord,
  ChallengeMutationRecord,
  ChallengeProgressRecord,
  ChallengeProgressRepository,
} from "@/server/repositories/challengeProgress.repository";
import type {
  ChallengeAttemptDto,
  ChallengeProgressDto,
  ChallengeProgressMutationDto,
  RecordChallengeAttemptInput,
  RecordChallengeSuccessInput,
} from "@/server/types/challengeProgress.types";

export class ChallengeProgressService {
  private readonly repository: ChallengeProgressRepository;

  constructor(repository: ChallengeProgressRepository) {
    this.repository = repository;
  }

  async getChallengeProgress(
    userId: string,
    challengeId: string,
  ): Promise<ChallengeProgressDto> {
    const safeUserId = validateIdentifier(userId, "User ID");
    const definition = getChallengeDefinition(challengeId);
    const record = await this.repository.get(safeUserId, definition.id);
    return record
      ? toProgressDto(record)
      : createFreshProgressDto(safeUserId, definition.id);
  }

  async listChallengeProgress(userId: string): Promise<ChallengeProgressDto[]> {
    return (
      await this.repository.list(validateIdentifier(userId, "User ID"))
    ).map(toProgressDto);
  }

  async recordChallengeAttempt(
    userId: string,
    input: RecordChallengeAttemptInput,
  ): Promise<ChallengeProgressMutationDto> {
    const definition = getChallengeDefinition(input.challengeId);
    return toMutationDto(
      await this.repository.recordAttempt({
        userId: validateIdentifier(userId, "User ID"),
        challengeId: definition.id,
        runId: validateRunId(input.runId),
        startedAt: validateDate(input.startedAt ?? new Date(), "startedAt"),
      }),
    );
  }

  async recordChallengeSuccess(
    userId: string,
    input: RecordChallengeSuccessInput,
  ): Promise<ChallengeProgressMutationDto> {
    const definition = getChallengeDefinition(input.challengeId);
    const elapsedTimeMs = validateElapsedTime(input.elapsedTimeMs);
    const endedAt = validateDate(input.endedAt ?? new Date(), "endedAt");
    const completion = calculateCompletionResult(definition, elapsedTimeMs);
    return toMutationDto(
      await this.repository.recordSuccess({
        userId: validateIdentifier(userId, "User ID"),
        challengeId: definition.id,
        runId: validateRunId(input.runId),
        startedAt: validateDate(
          input.startedAt ?? new Date(endedAt.getTime() - completion.elapsedTimeMs),
          "startedAt",
        ),
        result: { ...completion, endedAt },
      }),
    );
  }
}

function getChallengeDefinition(challengeId: string) {
  const safeChallengeId = validateIdentifier(challengeId, "Challenge ID");
  const definition = challengeCatalog.find(({ id }) => id === safeChallengeId);
  if (!definition) throw new ValidationError("Unknown challenge ID.");
  return definition;
}

function validateIdentifier(value: string, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${label} is required.`);
  }
  return value.trim();
}

function validateRunId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ValidationError("runId must be a positive integer.");
  }
  return value;
}

function validateElapsedTime(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError("elapsedTimeMs must be a non-negative number.");
  }
  return Math.floor(value);
}

function validateDate(value: Date, label: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new ValidationError(`${label} must be a valid date.`);
  }
  return value;
}

function createFreshProgressDto(
  userId: string,
  challengeId: string,
): ChallengeProgressDto {
  return {
    id: null,
    userId,
    challengeId,
    attempts: 0,
    completions: 0,
    bestTimeMs: null,
    bestScore: null,
    stars: 0,
    lastCompletedAt: null,
    createdAt: null,
    updatedAt: null,
  };
}

function toProgressDto(record: ChallengeProgressRecord): ChallengeProgressDto {
  return {
    ...record,
    lastCompletedAt: record.lastCompletedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toAttemptDto(record: ChallengeAttemptRecord): ChallengeAttemptDto {
  return {
    ...record,
    status: record.status.toLowerCase() as ChallengeAttemptDto["status"],
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function toMutationDto(record: ChallengeMutationRecord): ChallengeProgressMutationDto {
  return {
    progress: toProgressDto(record.progress),
    attempt: toAttemptDto(record.attempt),
    duplicate: record.duplicate,
  };
}
