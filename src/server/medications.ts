import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";

export async function getMedicationsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.medication.findMany({
    where: { profileId },
    include: { prescribingDoctor: true, logs: { orderBy: { date: "desc" }, take: 10 } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
}

export async function getMedicationLogs(
  userId: string,
  profileId: string,
  medicationId: string
) {
  await assertProfileAccess(userId, profileId);
  return prisma.medicationLog.findMany({
    where: { medicationId, medication: { profileId } },
    orderBy: { date: "desc" },
  });
}

export interface CreateMedicationInput {
  name: string;
  prescribingDoctorId?: string;
  startDate?: Date;
  endDate?: Date;
  instructions?: string;
  active?: boolean;
}

export async function createMedication(
  userId: string,
  profileId: string,
  input: CreateMedicationInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.medication.create({ data: { ...input, profileId } });
}

export interface CreateLogInput {
  date: Date;
  dosage?: number;
  unit?: string;
  injectionSite?: string;
  weight?: number;
  notes?: string;
}

export async function createMedicationLog(
  userId: string,
  profileId: string,
  medicationId: string,
  input: CreateLogInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.medicationLog.create({
    data: { ...input, medicationId },
  });
}
