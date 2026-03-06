/**
 * Server-only Facility and Location data access functions.
 */
import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { FacilityType } from "@/generated/prisma/enums";

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
  const { name, type, websiteUrl, portalUrl, phone, active } = input;
  const facility = await prisma.facility.create({ data: { name, type, websiteUrl, portalUrl, phone, active, profileId } });
  await logAudit(userId, profileId, "CREATE_FACILITY", "Facility", facility.id, { name: facility.name });
  return facility;
}

export async function updateFacility(
  userId: string,
  profileId: string,
  facilityId: string,
  input: Partial<CreateFacilityInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, type, websiteUrl, portalUrl, phone, active } = input;
  const facility = await prisma.facility.update({ where: { id: facilityId, profileId }, data: { name, type, websiteUrl, portalUrl, phone, active } });
  await logAudit(userId, profileId, "UPDATE_FACILITY", "Facility", facilityId);
  return facility;
}

export async function deleteFacility(
  userId: string,
  profileId: string,
  facilityId: string
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  await logAudit(userId, profileId, "DELETE_FACILITY", "Facility", facilityId);
  return prisma.facility.delete({ where: { id: facilityId, profileId } });
}
