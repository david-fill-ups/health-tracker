import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { getDoctorsForProfile, createDoctor } from "@/server/doctors";
import { parseBody, CreateDoctorSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");
    if (!profileId) return NextResponse.json({ error: "profileId query param required" }, { status: 400 });
    const data = await getDoctorsForProfile(session.user.id, profileId);
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
    const profileId = searchParams.get("profileId");
    if (!profileId) return NextResponse.json({ error: "profileId query param required" }, { status: 400 });
    const body = await req.json();
    const parsed = parseBody(CreateDoctorSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = await createDoctor(session.user.id, profileId, parsed.data);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
