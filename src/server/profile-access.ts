/**
 * Server-only Profile access/sharing functions.
 * All functions verify the caller has OWNER access before mutating.
 */
import { prisma } from "@/lib/prisma";
import { assertProfileAccess, PermissionError } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { ProfilePermission } from "@/generated/prisma/enums";

export async function getProfileAccessDetails(userId: string, profileId: string) {
  const members = await prisma.profileAccess.findMany({
    where: { profileId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const callerAccess = members.find((m) => m.userId === userId);
  if (!callerAccess) throw new PermissionError("UNAUTHORIZED", 401);

  // Pending invitations expose email addresses — only show to owners
  const pending = callerAccess.permission === "OWNER"
    ? await prisma.profileInvitation.findMany({ where: { profileId }, orderBy: { createdAt: "asc" } })
    : [];

  return { members, pending };
}

export async function addProfileAccess(
  userId: string,
  profileId: string,
  email: string,
  permission: ProfilePermission
) {
  await assertProfileAccess(userId, profileId, "OWNER");

  const normalizedEmail = email.toLowerCase().trim();
  const target = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (target) {
    // User exists — grant access directly
    const existing = await prisma.profileAccess.findUnique({
      where: { profileId_userId: { profileId, userId: target.id } },
    });
    if (existing) {
      // Update permission if already shared
      await prisma.profileAccess.update({
        where: { profileId_userId: { profileId, userId: target.id } },
        data: { permission },
      });
    } else {
      await prisma.profileAccess.create({
        data: { profileId, userId: target.id, permission },
      });
    }
    await logAudit(userId, profileId, "SHARE_PROFILE", "ProfileAccess", target.id, { email, permission });
    return { type: "granted" as const };
  } else {
    // No account yet — create a pending invitation
    await prisma.profileInvitation.upsert({
      where: { profileId_email: { profileId, email: normalizedEmail } },
      create: { profileId, email: normalizedEmail, permission, invitedBy: userId },
      update: { permission, invitedBy: userId },
    });
    await logAudit(userId, profileId, "SHARE_PROFILE_INVITE", "ProfileInvitation", undefined, { email: normalizedEmail, permission });
    return { type: "invited" as const };
  }
}

export async function updateProfileAccessPermission(
  userId: string,
  profileId: string,
  targetUserId: string,
  permission: ProfilePermission
) {
  await assertProfileAccess(userId, profileId, "OWNER");

  // Prevent removing the last OWNER
  if (permission !== "OWNER") {
    const ownerCount = await prisma.profileAccess.count({
      where: { profileId, permission: "OWNER" },
    });
    const isTarget = await prisma.profileAccess.findUnique({
      where: { profileId_userId: { profileId, userId: targetUserId } },
      select: { permission: true },
    });
    if (ownerCount === 1 && isTarget?.permission === "OWNER") {
      throw new PermissionError("Cannot remove the last owner", 403);
    }
  }

  const updated = await prisma.profileAccess.update({
    where: { profileId_userId: { profileId, userId: targetUserId } },
    data: { permission },
  });
  await logAudit(userId, profileId, "UPDATE_PROFILE_ACCESS", "ProfileAccess", targetUserId, { permission });
  return updated;
}

export async function removeProfileAccess(
  userId: string,
  profileId: string,
  targetUserId: string
) {
  await assertProfileAccess(userId, profileId, "OWNER");

  const target = await prisma.profileAccess.findUnique({
    where: { profileId_userId: { profileId, userId: targetUserId } },
    select: { permission: true },
  });

  if (!target) throw new PermissionError("Access record not found", 403);

  // Prevent removing the last OWNER
  if (target.permission === "OWNER") {
    const ownerCount = await prisma.profileAccess.count({
      where: { profileId, permission: "OWNER" },
    });
    if (ownerCount === 1) {
      throw new PermissionError("Cannot remove the last owner", 403);
    }
  }

  await prisma.profileAccess.delete({
    where: { profileId_userId: { profileId, userId: targetUserId } },
  });
  await logAudit(userId, profileId, "REVOKE_PROFILE_ACCESS", "ProfileAccess", targetUserId);
}

export async function cancelProfileInvitation(
  userId: string,
  profileId: string,
  email: string
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  await prisma.profileInvitation.delete({
    where: { profileId_email: { profileId, email } },
  });
  await logAudit(userId, profileId, "CANCEL_PROFILE_INVITE", "ProfileInvitation", undefined, { email });
}
