import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { DatabaseConfigurationError } from "@/server/errors";

const globalForPrisma = globalThis as unknown as {
  roboforgePrisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.roboforgePrisma) {
    return globalForPrisma.roboforgePrisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new DatabaseConfigurationError();
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.roboforgePrisma = client;
  }

  return client;
}
