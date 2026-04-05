import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import {
  getVaccinationsForProfile,
  createDose,
  updateVaccinationRecord,
} from "@/server/vaccinations";
import { parseBody, CreateDoseSchema, UpdateVaccinationSchema } from "@/lib/validation";
import { z } from "zod";

const PatchBodySchema = UpdateVaccinationSchema.extend({ id: z.string().min(1) });

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = req.nextUrl.searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  try {
    const vaccinations = await getVaccinationsForProfile(session.user.id, profileId);
    return NextResponse.json(vaccinations);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("GET /api/vaccinations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = parseBody(CreateDoseSchema, body);
    if (!parsed.ok) return parsed.response;
    const { profileId, ...input } = parsed.data;

    const dose = await createDose(session.user.id, profileId, input);
    return NextResponse.json(dose, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/vaccinations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = parseBody(PatchBodySchema, body);
    if (!parsed.ok) return parsed.response;
    const { id, ...input } = parsed.data;

    const result = await updateVaccinationRecord(session.user.id, id, input);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (err instanceof Error && err.message === "Vaccination not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("PATCH /api/vaccinations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
