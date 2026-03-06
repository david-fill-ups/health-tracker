import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";

export async function getVisitsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.visit.findMany({
    where: { profileId },
    include: { doctor: true, facility: true, location: true },
    orderBy: { date: "asc" },
  });
}

export async function getNeedToSchedule(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.visit.findMany({
    where: { profileId, date: null, status: { in: ["PENDING", "SCHEDULED"] } },
    include: { doctor: true, facility: true },
    orderBy: { dueMonth: "asc" },
  });
}

export interface CreateVisitInput {
  doctorId?: string;
  facilityId?: string;
  locationId?: string;
  date?: Date;
  dueMonth?: string;
  type?: VisitType;
  notes?: string;
  status?: VisitStatus;
}

export async function getVisitById(userId: string, profileId: string, visitId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.visit.findUnique({
    where: { id: visitId, profileId },
    include: { doctor: true, facility: true, location: true },
  });
}

export async function createVisit(userId: string, profileId: string, input: CreateVisitInput) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { doctorId, facilityId, locationId, date, dueMonth, type, notes, status } = input;
  const visit = await prisma.visit.create({ data: { doctorId, facilityId, locationId, date, dueMonth, type, notes, status, profileId } });
  await logAudit(userId, profileId, "CREATE_VISIT", "Visit", visit.id, { type: visit.type });
  return visit;
}

export async function updateVisit(
  userId: string,
  profileId: string,
  visitId: string,
  input: Partial<CreateVisitInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { doctorId, facilityId, locationId, date, dueMonth, type, notes, status } = input;
  const visit = await prisma.visit.update({ where: { id: visitId, profileId }, data: { doctorId, facilityId, locationId, date, dueMonth, type, notes, status } });
  await logAudit(userId, profileId, "UPDATE_VISIT", "Visit", visitId);
  return visit;
}

export async function deleteVisit(userId: string, profileId: string, visitId: string) {
  await assertProfileAccess(userId, profileId, "OWNER");
  await logAudit(userId, profileId, "DELETE_VISIT", "Visit", visitId);
  return prisma.visit.delete({ where: { id: visitId, profileId } });
}
