import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { getDistinctMetricInfo } from "@/server/health-metrics";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  try {
    const data = await getDistinctMetricInfo(session.user.id, profileId);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/health-metrics/distinct error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
