/**
 * Server-only Profile data access functions.
 * All functions verify the caller has appropriate access before returning data.
 */
import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import type { Sex } from "@/generated/prisma";

export async function getProfilesForUser(userId: string) {
  return prisma.profile.findMany({
    where: {
      access: { some: { userId } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getProfileById(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.profile.findUnique({ where: { id: profileId } });
}

export interface CreateProfileInput {
  name: string;
  birthYear: number;
  sex: Sex;
  state?: string;
  notes?: string;
}

export async function createProfile(userId: string, input: CreateProfileInput) {
  return prisma.profile.create({
    data: {
      ...input,
      userId,
      access: {
        create: { userId, permission: "OWNER" },
      },
    },
  });
}

export async function updateProfile(
  userId: string,
  profileId: string,
  input: Partial<CreateProfileInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.profile.update({ where: { id: profileId }, data: input });
}

export async function deleteProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.profile.delete({ where: { id: profileId } });
}

export async function regenerateCalendarToken(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId, "OWNER");
  // Generate a new cuid via Prisma's default — we push a random string instead
  const { randomBytes } = await import("crypto");
  const newToken = randomBytes(20).toString("hex");
  return prisma.profile.update({
    where: { id: profileId },
    data: { calendarToken: newToken },
  });
}
