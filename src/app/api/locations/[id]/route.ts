import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { updateLocation, deleteLocation } from "@/server/locations";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const location = await prisma.location.findUnique({
      where: { id },
      include: { facility: { select: { profileId: true } } },
    });
    if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { assertProfileAccess } = await import("@/lib/permissions");
    await assertProfileAccess(session.user.id, location.facility.profileId);
    return NextResponse.json(location);
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId");
    if (!facilityId) return NextResponse.json({ error: "facilityId query param required" }, { status: 400 });
    const body = await req.json();
    const data = await updateLocation(session.user.id, facilityId, id, body);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const { searchParams } = new URL(_req.url);
    const facilityId = searchParams.get("facilityId");
    if (!facilityId) return NextResponse.json({ error: "facilityId query param required" }, { status: 400 });
    await deleteLocation(session.user.id, facilityId, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
