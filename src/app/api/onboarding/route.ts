import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { createProfile } from "@/server/profiles";
import { prisma } from "@/lib/prisma";
import { parseBody, OnboardingSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Prevent creating a second owner profile — onboarding is one-time only
  const existing = await prisma.profileAccess.count({ where: { userId: session.user.id } });
  if (existing > 0) return NextResponse.json({ error: "Already onboarded" }, { status: 409 });

  try {
    const body = await req.json();
    const parsed = parseBody(OnboardingSchema, body);
    if (!parsed.ok) return parsed.response;
    const data = await createProfile(session.user.id, parsed.data, { isOwnerProfile: true });
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
