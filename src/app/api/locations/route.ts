import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { getLocationsForFacility, createLocation } from "@/server/locations";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId");
    if (!facilityId) return NextResponse.json({ error: "facilityId query param required" }, { status: 400 });
    const data = await getLocationsForFacility(session.user.id, facilityId);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId");
    if (!facilityId) return NextResponse.json({ error: "facilityId query param required" }, { status: 400 });
    const body = await req.json();
    const data = await createLocation(session.user.id, facilityId, body);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
