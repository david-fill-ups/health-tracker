/**
 * Server-only Location data access functions.
 * Locations belong to a Facility, which is scoped to a Profile.
 * Permission checks go through the facility's profileId.
 */
import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";

async function getProfileIdForFacility(facilityId: string): Promise<string> {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { profileId: true },
  });
  if (!facility) throw new Error("Facility not found");
  return facility.profileId;
}

export async function getLocationsForFacility(userId: string, facilityId: string) {
  const profileId = await getProfileIdForFacility(facilityId);
  await assertProfileAccess(userId, profileId);
  return prisma.location.findMany({
    where: { facilityId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export interface CreateLocationInput {
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  active?: boolean;
}

export async function createLocation(
  userId: string,
  facilityId: string,
  input: CreateLocationInput
) {
  const profileId = await getProfileIdForFacility(facilityId);
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, address1, address2, city, state, zip, phone, active } = input;
  return prisma.location.create({ data: { name, address1, address2, city, state, zip, phone, active, facilityId } });
}

export async function updateLocation(
  userId: string,
  facilityId: string,
  locationId: string,
  input: Partial<CreateLocationInput>
) {
  const profileId = await getProfileIdForFacility(facilityId);
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, address1, address2, city, state, zip, phone, active } = input;
  return prisma.location.update({ where: { id: locationId, facilityId }, data: { name, address1, address2, city, state, zip, phone, active } });
}

export async function deleteLocation(
  userId: string,
  facilityId: string,
  locationId: string
) {
  const profileId = await getProfileIdForFacility(facilityId);
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.location.delete({ where: { id: locationId, facilityId } });
}
