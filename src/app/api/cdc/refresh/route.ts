import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * CDC Schedule refresh endpoint.
 * Called monthly by Vercel cron (vercel.json).
 * Protected by CRON_SECRET bearer token.
 *
 * In Phase 1: reads from the static data/cdc-schedule.json.
 * Future: can fetch from CDC's official API or a managed S3/blob.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Dynamic import to avoid bundling data file in client chunks
    const cdcData = await import("../../../../../data/cdc-schedule.json");
    const version = cdcData.lastUpdated;

    const existing = await prisma.cdcScheduleVersion.findFirst({
      where: { version },
    });

    if (existing) {
      return NextResponse.json({
        message: "CDC schedule already up to date",
        version,
      });
    }

    await prisma.cdcScheduleVersion.create({
      data: {
        version,
        lastUpdated: new Date(version),
        data: cdcData as object,
      },
    });

    return NextResponse.json({ message: "CDC schedule updated", version });
  } catch (error) {
    console.error("CDC refresh error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
