import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function getPortalsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.portal.findMany({
    where: { profileId },
    include: { facility: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}

export interface CreatePortalInput {
  name: string;
  organization?: string;
  url: string;
  facilityId?: string;
  notes?: string;
  active?: boolean;
}

export async function getPortalById(userId: string, profileId: string, portalId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.portal.findUnique({
    where: { id: portalId, profileId },
    include: { facility: { select: { id: true, name: true } } },
  });
}

export async function createPortal(
  userId: string,
  profileId: string,
  input: CreatePortalInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, organization, url, facilityId, notes, active } = input;
  const portal = await prisma.portal.create({ data: { name, organization, url, facilityId, notes, active, profileId } });
  await logAudit(userId, profileId, "CREATE_PORTAL", "Portal", portal.id, { name: portal.name });
  return portal;
}

export async function updatePortal(
  userId: string,
  profileId: string,
  portalId: string,
  input: Partial<CreatePortalInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, organization, url, facilityId, notes, active } = input;
  const portal = await prisma.portal.update({ where: { id: portalId, profileId }, data: { name, organization, url, facilityId, notes, active } });
  await logAudit(userId, profileId, "UPDATE_PORTAL", "Portal", portalId);
  return portal;
}

export async function deletePortal(userId: string, profileId: string, portalId: string) {
  await assertProfileAccess(userId, profileId, "OWNER");
  await logAudit(userId, profileId, "DELETE_PORTAL", "Portal", portalId);
  return prisma.portal.delete({ where: { id: portalId, profileId } });
}
