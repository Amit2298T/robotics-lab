import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

export class HealthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async isDatabaseConnected(): Promise<boolean> {
    await this.prisma.$queryRaw`SELECT 1`;
    return true;
  }
}
