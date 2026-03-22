import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { updateMedicationLog, deleteMedicationLog } from "@/server/medications";
import { parseBody, UpdateMedicationLogSchema } from "@/lib/validation";

type Params = Promise<{ id: string; logId: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: medicationId, logId } = await params;
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = parseBody(UpdateMedicationLogSchema, body);
    if (!parsed.ok) return parsed.response;

    const log = await updateMedicationLog(session.user.id, profileId, medicationId, logId, parsed.data);
    return NextResponse.json(log);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("PUT /api/medications/[id]/logs/[logId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: medicationId, logId } = await params;
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  try {
    await deleteMedicationLog(session.user.id, profileId, medicationId, logId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("DELETE /api/medications/[id]/logs/[logId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
