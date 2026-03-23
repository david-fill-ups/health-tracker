import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { updateFamilyCondition, deleteFamilyCondition } from "@/server/family-members";
import { parseBody, UpdateFamilyConditionSchema } from "@/lib/validation";

type Params = Promise<{ id: string; conditionId: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: memberId, conditionId } = await params;
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = parseBody(UpdateFamilyConditionSchema, body);
    if (!parsed.ok) return parsed.response;

    const condition = await updateFamilyCondition(session.user.id, profileId, memberId, conditionId, parsed.data);
    return NextResponse.json(condition);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("PUT /api/family-members/[id]/conditions/[conditionId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: memberId, conditionId } = await params;
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  try {
    await deleteFamilyCondition(session.user.id, profileId, memberId, conditionId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("DELETE /api/family-members/[id]/conditions/[conditionId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
