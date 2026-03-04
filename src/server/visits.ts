import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import type { VisitStatus, VisitType } from "@/generated/prisma";

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

export async function createVisit(userId: string, profileId: string, input: CreateVisitInput) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.visit.create({ data: { ...input, profileId } });
}

export async function updateVisit(
  userId: string,
  profileId: string,
  visitId: string,
  input: Partial<CreateVisitInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.visit.update({ where: { id: visitId, profileId }, data: input });
}

export async function deleteVisit(userId: string, profileId: string, visitId: string) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.visit.delete({ where: { id: visitId, profileId } });
}
