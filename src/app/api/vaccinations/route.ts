import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import {
  getVaccinationsForProfile,
  createVaccination,
} from "@/server/vaccinations";

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

  const body = await req.json();
  const { profileId, name, date, facilityId, lotNumber, notes } = body;

  if (!profileId || !name || !date) {
    return NextResponse.json(
      { error: "profileId, name, and date are required" },
      { status: 400 }
    );
  }

  try {
    const vaccination = await createVaccination(session.user.id, profileId, {
      name,
      date: new Date(date),
      facilityId,
      lotNumber,
      notes,
    });
    return NextResponse.json(vaccination, { status: 201 });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    console.error("POST /api/vaccinations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
