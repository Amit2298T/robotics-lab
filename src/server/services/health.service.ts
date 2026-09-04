import { getPrisma } from "@/server/db/prisma";
import { HealthRepository } from "@/server/repositories/health.repository";

export async function checkDatabaseReadiness(): Promise<boolean> {
  try {
    return await new HealthRepository(getPrisma()).isDatabaseConnected();
  } catch {
    return false;
  }
}
