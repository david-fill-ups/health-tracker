import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import {
  getVaccinationById,
  updateVaccinationRecord,
  deleteVaccinationRecord,
} from "@/server/vaccinations";
import { parseBody, UpdateVaccinationSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const profileId = req.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profileId query param required" }, { status: 400 });

  try {
    const vaccination = await getVaccinationById(session.user.id, id);
    if (vaccination.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(vaccination);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (err instanceof Error && err.message === "Vaccination not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("GET /api/vaccinations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = parseBody(UpdateVaccinationSchema, body);
    if (!parsed.ok) return parsed.response;

    const vaccination = await updateVaccinationRecord(session.user.id, id, parsed.data);
    return NextResponse.json(vaccination);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (err instanceof Error && err.message === "Vaccination not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("PUT /api/vaccinations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteVaccinationRecord(session.user.id, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (err instanceof Error && err.message === "Vaccination not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("DELETE /api/vaccinations/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
