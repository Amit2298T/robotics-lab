import type {
  ProgramRecord,
  ProgramRepository,
  ProgramUpdateData,
  ProgramWriteData,
} from "@/server/repositories/program.repository";
import { ResourceNotFoundError, ValidationError } from "../errors.ts";
import type {
  CreateProgramInput,
  ProgramDto,
  UpdateProgramInput,
} from "@/server/types/program.types";

const MAX_PROGRAM_NAME_LENGTH = 100;
const MAX_PROGRAM_DESCRIPTION_LENGTH = 500;
const MAX_SOURCE_CODE_LENGTH = 1_000_000;

export class ProgramService {
  private readonly repository: ProgramRepository;

  constructor(repository: ProgramRepository) {
    this.repository = repository;
  }

  async listProgramsByUser(userId: string): Promise<ProgramDto[]> {
    const safeUserId = validateIdentifier(userId, "User ID");
    return (await this.repository.listByUser(safeUserId)).map(toProgramDto);
  }

  async getProgramById(userId: string, programId: string): Promise<ProgramDto> {
    const record = await this.repository.findByIdForUser(
      validateIdentifier(userId, "User ID"),
      validateIdentifier(programId, "Program ID"),
    );
    if (!record) throw new ResourceNotFoundError("Program");
    return toProgramDto(record);
  }

  async createProgram(
    userId: string,
    input: CreateProgramInput,
  ): Promise<ProgramDto> {
    const record = await this.repository.create(
      validateIdentifier(userId, "User ID"),
      validateCreateInput(input),
    );
    return toProgramDto(record);
  }

  async updateProgram(
    userId: string,
    programId: string,
    input: UpdateProgramInput,
  ): Promise<ProgramDto> {
    const data = validateUpdateInput(input);
    const record = await this.repository.updateForUser(
      validateIdentifier(userId, "User ID"),
      validateIdentifier(programId, "Program ID"),
      data,
    );
    if (!record) throw new ResourceNotFoundError("Program");
    return toProgramDto(record);
  }

  async deleteProgram(userId: string, programId: string): Promise<void> {
    const deleted = await this.repository.deleteForUser(
      validateIdentifier(userId, "User ID"),
      validateIdentifier(programId, "Program ID"),
    );
    if (!deleted) throw new ResourceNotFoundError("Program");
  }
}

function validateCreateInput(input: CreateProgramInput): ProgramWriteData {
  return {
    name: validateName(input.name),
    description: validateDescription(input.description),
    sourceCode: validateSourceCode(input.sourceCode),
    language: validateLanguage(input.language),
    isPublic: validateBoolean(input.isPublic, false),
  };
}

function validateUpdateInput(input: UpdateProgramInput): ProgramUpdateData {
  const data: ProgramUpdateData = {};
  if (input.name !== undefined) data.name = validateName(input.name);
  if (input.description !== undefined) {
    data.description = validateDescription(input.description);
  }
  if (input.sourceCode !== undefined) {
    data.sourceCode = validateSourceCode(input.sourceCode);
  }
  if (input.language !== undefined) {
    data.language = validateLanguage(input.language);
  }
  if (input.isPublic !== undefined) {
    data.isPublic = validateBoolean(input.isPublic, false);
  }
  if (Object.keys(data).length === 0) {
    throw new ValidationError("At least one program field must be updated.");
  }
  return data;
}

function validateIdentifier(value: string, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${label} is required.`);
  }
  return value.trim();
}

function validateName(value: string): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length === 0 || name.length > MAX_PROGRAM_NAME_LENGTH) {
    throw new ValidationError("Program name must be between 1 and 100 characters.");
  }
  return name;
}

function validateDescription(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null;
  }
  const description = value.trim();
  if (description.length > MAX_PROGRAM_DESCRIPTION_LENGTH) {
    throw new ValidationError("Program description must not exceed 500 characters.");
  }
  return description;
}

function validateSourceCode(value: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError("Program source code must not be empty.");
  }
  if (value.length > MAX_SOURCE_CODE_LENGTH) {
    throw new ValidationError("Program source code is too large.");
  }
  return value;
}

function validateLanguage(value: "javascript" | undefined): "JAVASCRIPT" {
  if (value !== undefined && value !== "javascript") {
    throw new ValidationError("Only JavaScript programs are supported.");
  }
  return "JAVASCRIPT";
}

function validateBoolean(value: boolean | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new ValidationError("isPublic must be boolean.");
  return value;
}

function toProgramDto(record: ProgramRecord): ProgramDto {
  return {
    ...record,
    language: "javascript",
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
