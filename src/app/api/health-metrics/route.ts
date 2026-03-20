import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { getHealthMetricsForProfile, createHealthMetric } from "@/server/health-metrics";
import { parseBody, CreateHealthMetricSchema } from "@/lib/validation";

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

  const metricType = searchParams.get("metricType") ?? undefined;

  try {
    const metrics = await getHealthMetricsForProfile(session.user.id, profileId, metricType);
    return NextResponse.json(metrics);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/health-metrics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = parseBody(CreateHealthMetricSchema, body);
    if (!parsed.ok) return parsed.response;
    const { profileId, ...input } = parsed.data;

    const metric = await createHealthMetric(session.user.id, profileId, input);
    return NextResponse.json(metric, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/health-metrics error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
