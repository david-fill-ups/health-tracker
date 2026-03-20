import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { getAllergiesForProfile, createAllergy } from "@/server/allergies";
import { parseBody, CreateAllergySchema } from "@/lib/validation";

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
    const allergies = await getAllergiesForProfile(session.user.id, profileId);
    return NextResponse.json(allergies);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/allergies error:", err);
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
    const parsed = parseBody(CreateAllergySchema, body);
    if (!parsed.ok) return parsed.response;
    const { profileId, ...input } = parsed.data;

    const allergy = await createAllergy(session.user.id, profileId, input);
    return NextResponse.json(allergy, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/allergies error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
