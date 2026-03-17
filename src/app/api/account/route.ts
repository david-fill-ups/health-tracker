import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Log before deletion so the audit record exists (user cascade will remove it anyway,
  // but this records intent in case of partial failures)
  await logAudit(userId, null, "DELETE_ACCOUNT", "User", userId);

  // Deleting the User cascades to:
  //   - Account, Session (NextAuth records)
  //   - Profile where userId = user.id → and their nested health data
  //   - ProfileAccess records (removes shared access from other users' profiles)
  //   - AuditLog records
  // Profiles owned by other users that were shared with this user are NOT deleted.
  await prisma.user.delete({ where: { id: userId } });

  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Profiles that WILL be deleted (owned by this user)
  const ownedProfiles = await prisma.profile.findMany({
    where: { userId },
    select: { id: true, name: true, isOwnerProfile: true },
    orderBy: { createdAt: "asc" },
  });

  // Profiles shared WITH this user (owned by someone else — not deleted)
  const sharedProfiles = await prisma.profile.findMany({
    where: {
      userId: { not: userId },
      access: { some: { userId } },
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ownedProfiles, sharedProfiles });
}
