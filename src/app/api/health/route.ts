import { checkDatabaseReadiness } from "@/server/services/health.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const connected = await checkDatabaseReadiness();
  return Response.json(
    {
      success: connected,
      service: "roboforge",
      database: connected ? "connected" : "unavailable",
    },
    { status: connected ? 200 : 503 },
  );
}
