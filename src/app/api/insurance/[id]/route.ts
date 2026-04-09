import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import {
  getInsuranceCardById,
  updateInsuranceCard,
  deleteInsuranceCard,
} from "@/server/insurance";
import { parseBody, UpdateInsuranceCardSchema } from "@/lib/validation";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    const card = await getInsuranceCardById(session.user.id, profileId, id);
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(card);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/insurance/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    const body = await req.json();
    const parsed = parseBody(UpdateInsuranceCardSchema, body);
    if (!parsed.ok) return parsed.response;

    const card = await updateInsuranceCard(session.user.id, profileId, id, parsed.data);
    return NextResponse.json(card);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("PUT /api/insurance/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params;
    await deleteInsuranceCard(session.user.id, profileId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("DELETE /api/insurance/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
