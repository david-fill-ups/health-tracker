/**
 * Server-only Profile data access functions.
 * All functions verify the caller has appropriate access before returning data.
 */
import { prisma } from "@/lib/prisma";
import { assertProfileAccess, PermissionError } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { Sex } from "@/generated/prisma/enums";

export async function getProfilesForUser(userId: string) {
  const results = await prisma.profile.findMany({
    where: {
      access: { some: { userId } },
    },
    include: {
      // Fetch the caller's permission level so we can redact calendarToken for non-owners
      access: { where: { userId }, select: { permission: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return results.map(({ access, ...profile }) => ({
    ...profile,
    // OWNER and WRITE users can subscribe to the calendar feed; READ_ONLY cannot.
    calendarToken: access[0]?.permission !== "READ_ONLY" ? profile.calendarToken : undefined,
  }));
}

export async function getProfileById(userId: string, profileId: string) {
  const access = await prisma.profileAccess.findUnique({
    where: { profileId_userId: { profileId, userId } },
    select: { permission: true },
  });
  if (!access) throw new PermissionError("UNAUTHORIZED", 401);

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return null;

  // OWNER and WRITE users can subscribe to the calendar feed; READ_ONLY cannot.
  return access.permission !== "READ_ONLY"
    ? profile
    : { ...profile, calendarToken: undefined };
}

export interface CreateProfileInput {
  name: string;
  birthDate: Date;
  sex: Sex;
  state?: string;
  heightIn?: number;
  notes?: string;
}

export async function createProfile(
  userId: string,
  input: CreateProfileInput,
  options: { isOwnerProfile?: boolean } = {}
) {
  const { randomBytes } = await import("crypto");
  const profile = await prisma.profile.create({
    data: {
      // Explicitly enumerate allowed fields — prevents mass assignment of system
      // fields (calendarToken, userId, isOwnerProfile, createdAt, etc.) from the raw request body.
      name: input.name,
      birthDate: input.birthDate,
      sex: input.sex,
      state: input.state,
      heightIn: input.heightIn,
      notes: input.notes,
      calendarToken: randomBytes(20).toString("hex"),
      userId,
      isOwnerProfile: options.isOwnerProfile ?? false,
      access: {
        create: { userId, permission: "OWNER" },
      },
    },
  });
  await logAudit(userId, profile.id, "CREATE_PROFILE", "Profile", profile.id);
  return profile;
}

export async function updateProfile(
  userId: string,
  profileId: string,
  input: Partial<CreateProfileInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  // Explicitly enumerate allowed fields — prevents mass assignment of system
  // fields (userId, calendarToken, etc.) from the raw request body.
  const { name, birthDate, sex, state, heightIn, notes } = input;
  const profile = await prisma.profile.update({
    where: { id: profileId },
    data: { name, birthDate, sex, state, heightIn, notes },
  });
  await logAudit(userId, profileId, "UPDATE_PROFILE", "Profile", profileId);
  return profile;
}

export async function deleteProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId, "OWNER");
  await logAudit(userId, profileId, "DELETE_PROFILE", "Profile", profileId);
  return prisma.profile.delete({ where: { id: profileId } });
}

export async function regenerateCalendarToken(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { randomBytes } = await import("crypto");
  const newToken = randomBytes(20).toString("hex");
  const profile = await prisma.profile.update({
    where: { id: profileId },
    data: { calendarToken: newToken },
  });
  await logAudit(userId, profileId, "REGENERATE_CALENDAR_TOKEN", "Profile", profileId);
  return profile;
}
