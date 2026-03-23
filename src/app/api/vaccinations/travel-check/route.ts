import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { parseBody, TravelCheckSchema } from "@/lib/validation";
import { getTravelCheck } from "@/server/vaccinations";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = parseBody(TravelCheckSchema, body);
  if (!parsed.ok) return parsed.response;

  const { profileId, destination } = parsed.data;

  try {
    const result = await getTravelCheck(session.user.id, profileId, destination);
    if (!result) {
      return NextResponse.json({ error: "Destination not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/vaccinations/travel-check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
