import "server-only";

import type { PrismaClient, ProgramLanguage } from "@/generated/prisma/client";

export type ProgramRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  sourceCode: string;
  language: ProgramLanguage;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProgramWriteData = {
  name: string;
  description: string | null;
  sourceCode: string;
  language: ProgramLanguage;
  isPublic: boolean;
};

export type ProgramUpdateData = Partial<ProgramWriteData>;

export interface ProgramRepository {
  listByUser(userId: string): Promise<ProgramRecord[]>;
  findByIdForUser(userId: string, programId: string): Promise<ProgramRecord | null>;
  create(userId: string, data: ProgramWriteData): Promise<ProgramRecord>;
  updateForUser(
    userId: string,
    programId: string,
    data: ProgramUpdateData,
  ): Promise<ProgramRecord | null>;
  deleteForUser(userId: string, programId: string): Promise<boolean>;
}

export class PrismaProgramRepository implements ProgramRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listByUser(userId: string): Promise<ProgramRecord[]> {
    return this.prisma.program.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  findByIdForUser(
    userId: string,
    programId: string,
  ): Promise<ProgramRecord | null> {
    return this.prisma.program.findFirst({
      where: { id: programId, userId },
    });
  }

  create(userId: string, data: ProgramWriteData): Promise<ProgramRecord> {
    return this.prisma.program.create({ data: { ...data, userId } });
  }

  async updateForUser(
    userId: string,
    programId: string,
    data: ProgramUpdateData,
  ): Promise<ProgramRecord | null> {
    const result = await this.prisma.program.updateMany({
      where: { id: programId, userId },
      data,
    });
    return result.count === 0
      ? null
      : this.findByIdForUser(userId, programId);
  }

  async deleteForUser(userId: string, programId: string): Promise<boolean> {
    const result = await this.prisma.program.deleteMany({
      where: { id: programId, userId },
    });
    return result.count === 1;
  }
}
