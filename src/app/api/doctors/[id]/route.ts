import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { updateDoctor, deleteDoctor } from "@/server/doctors";
import { parseBody, UpdateDoctorSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");
    if (!profileId) return NextResponse.json({ error: "profileId query param required" }, { status: 400 });
    // Single query: only returns the doctor if it belongs to the requested profile
    // and the user has access to that profile.
    const doctor = await prisma.doctor.findFirst({
      where: {
        id,
        profileId,
        profile: { access: { some: { userId: session.user.id } } },
      },
      include: {
        facility: true,
        _count: { select: { visits: true } },
        visits: {
          orderBy: { date: "desc" },
          select: { id: true, date: true, type: true, status: true, reason: true, facility: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
        },
      },
    });
    if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doctor);
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
    const profileId = searchParams.get("profileId");
    if (!profileId) return NextResponse.json({ error: "profileId query param required" }, { status: 400 });
    const body = await req.json();
    const parsed = parseBody(UpdateDoctorSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = await updateDoctor(session.user.id, profileId, id, parsed.data);
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
    const profileId = searchParams.get("profileId");
    if (!profileId) return NextResponse.json({ error: "profileId query param required" }, { status: 400 });
    await deleteDoctor(session.user.id, profileId, id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
