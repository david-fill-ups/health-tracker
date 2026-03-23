import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { createFamilyCondition } from "@/server/family-members";
import { parseBody, CreateFamilyConditionSchema } from "@/lib/validation";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: memberId } = await params;

  try {
    const body = await req.json();
    const parsed = parseBody(CreateFamilyConditionSchema, body);
    if (!parsed.ok) return parsed.response;
    const { profileId, ...input } = parsed.data;

    const condition = await createFamilyCondition(session.user.id, profileId, memberId, input);
    return NextResponse.json(condition, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/family-members/[id]/conditions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
