/**
 * Server-only Facility and Location data access functions.
 */
import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import type { FacilityType } from "@/generated/prisma";

export async function getFacilitiesForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.facility.findMany({
    where: { profileId },
    include: { locations: true, doctors: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export interface CreateFacilityInput {
  name: string;
  type: FacilityType;
  websiteUrl?: string;
  portalUrl?: string;
  phone?: string;
  active?: boolean;
}

export async function createFacility(
  userId: string,
  profileId: string,
  input: CreateFacilityInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.facility.create({ data: { ...input, profileId } });
}

export async function updateFacility(
  userId: string,
  profileId: string,
  facilityId: string,
  input: Partial<CreateFacilityInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.facility.update({ where: { id: facilityId, profileId }, data: input });
}

export async function deleteFacility(
  userId: string,
  profileId: string,
  facilityId: string
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.facility.delete({ where: { id: facilityId, profileId } });
}
