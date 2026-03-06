import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { getMedicationLogs, createMedicationLog } from "@/server/medications";

type Params = Promise<{ id: string }>;

export async function GET(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: medicationId } = await params;
  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId required" }, { status: 400 });
  }

  try {
    const logs = await getMedicationLogs(session.user.id, profileId, medicationId);
    return NextResponse.json(logs);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/medications/[id]/logs error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: medicationId } = await params;

  try {
    const body = await req.json();
    const { profileId, ...input } = body;
    if (!profileId) {
      return NextResponse.json({ error: "profileId required" }, { status: 400 });
    }
    if (!input.date) {
      return NextResponse.json({ error: "date required" }, { status: 400 });
    }

    input.date = new Date(input.date);

    const log = await createMedicationLog(session.user.id, profileId, medicationId, input);
    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/medications/[id]/logs error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
