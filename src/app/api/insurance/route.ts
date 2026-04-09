import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { getInsuranceCardsForProfile, createInsuranceCard } from "@/server/insurance";
import { parseBody, CreateInsuranceCardSchema } from "@/lib/validation";

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
    const cards = await getInsuranceCardsForProfile(session.user.id, profileId);
    return NextResponse.json(cards);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/insurance error:", err);
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
    const parsed = parseBody(CreateInsuranceCardSchema, body);
    if (!parsed.ok) return parsed.response;
    const { profileId, ...input } = parsed.data;

    const card = await createInsuranceCard(session.user.id, profileId, input);
    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/insurance error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
