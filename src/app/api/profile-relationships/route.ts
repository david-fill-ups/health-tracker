import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { getProfileRelationships, createProfileRelationship } from "@/server/profile-relationships";
import { parseBody, CreateProfileRelationshipSchema } from "@/lib/validation";

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
    const relationships = await getProfileRelationships(session.user.id, profileId);
    return NextResponse.json(relationships);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/profile-relationships error:", err);
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
    const parsed = parseBody(CreateProfileRelationshipSchema, body);
    if (!parsed.ok) return parsed.response;
    const { profileId, ...input } = parsed.data;

    const rel = await createProfileRelationship(session.user.id, profileId, input);
    return NextResponse.json(rel, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (err instanceof Error && err.message === "Cannot link a profile to itself") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/profile-relationships error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
