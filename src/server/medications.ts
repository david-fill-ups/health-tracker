import { prisma } from "@/lib/prisma";
import { assertProfileAccess, PermissionError } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function getMedicationsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.medication.findMany({
    where: { profileId },
    include: { prescribingDoctor: true, logs: { orderBy: { date: "desc" }, take: 1 } },
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
  dosage?: string;
  frequency?: string;
  prescribingDoctorId?: string;
  startDate?: Date;
  endDate?: Date;
  instructions?: string;
  active?: boolean;
}

export async function getMedicationById(
  userId: string,
  profileId: string,
  medicationId: string
) {
  await assertProfileAccess(userId, profileId);
  return prisma.medication.findUnique({
    where: { id: medicationId, profileId },
    include: { prescribingDoctor: true, logs: { orderBy: { date: "desc" }, take: 20 } },
  });
}

export async function createMedication(
  userId: string,
  profileId: string,
  input: CreateMedicationInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, dosage, frequency, prescribingDoctorId, startDate, endDate, instructions, active } = input;
  const medication = await prisma.medication.create({ data: { name, dosage, frequency, prescribingDoctorId, startDate, endDate, instructions, active, profileId } });
  await logAudit(userId, profileId, "CREATE_MEDICATION", "Medication", medication.id, { name: medication.name });
  return medication;
}

export interface CreateLogInput {
  date: Date;
  dosage?: number;
  unit?: string;
  injectionSite?: string;
  weight?: number;
  notes?: string;
}

export async function updateMedication(
  userId: string,
  profileId: string,
  medicationId: string,
  input: Partial<CreateMedicationInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, dosage, frequency, prescribingDoctorId, startDate, endDate, instructions, active } = input;
  const medication = await prisma.medication.update({ where: { id: medicationId, profileId }, data: { name, dosage, frequency, prescribingDoctorId, startDate, endDate, instructions, active } });
  await logAudit(userId, profileId, "UPDATE_MEDICATION", "Medication", medicationId);
  return medication;
}

export async function deleteMedication(
  userId: string,
  profileId: string,
  medicationId: string
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  await logAudit(userId, profileId, "DELETE_MEDICATION", "Medication", medicationId);
  return prisma.medication.delete({ where: { id: medicationId, profileId } });
}

export async function createMedicationLog(
  userId: string,
  profileId: string,
  medicationId: string,
  input: CreateLogInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  // Verify the medication belongs to the asserted profile — prevents cross-profile
  // log injection if an attacker knows a medicationId from another profile.
  const medication = await prisma.medication.findUnique({
    where: { id: medicationId, profileId },
    select: { id: true },
  });
  if (!medication) throw new PermissionError("FORBIDDEN", 403);
  const { date, dosage, unit, injectionSite, weight, notes } = input;
  const log = await prisma.medicationLog.create({
    data: { date, dosage, unit, injectionSite, weight, notes, medicationId },
  });
  await logAudit(userId, profileId, "CREATE_MEDICATION_LOG", "MedicationLog", log.id, { medicationId });
  return log;
}

export async function updateMedicationLog(
  userId: string,
  profileId: string,
  medicationId: string,
  logId: string,
  input: Partial<CreateLogInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const existing = await prisma.medicationLog.findFirst({
    where: { id: logId, medicationId, medication: { profileId } },
  });
  if (!existing) throw new PermissionError("FORBIDDEN", 403);
  const { date, dosage, unit, injectionSite, weight, notes } = input;
  const log = await prisma.medicationLog.update({
    where: { id: logId },
    data: { date, dosage, unit, injectionSite, weight, notes },
  });
  await logAudit(userId, profileId, "UPDATE_MEDICATION_LOG", "MedicationLog", logId, { medicationId });
  return log;
}

export async function deleteMedicationLog(
  userId: string,
  profileId: string,
  medicationId: string,
  logId: string
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const existing = await prisma.medicationLog.findFirst({
    where: { id: logId, medicationId, medication: { profileId } },
  });
  if (!existing) throw new PermissionError("FORBIDDEN", 403);
  await logAudit(userId, profileId, "DELETE_MEDICATION_LOG", "MedicationLog", logId, { medicationId });
  return prisma.medicationLog.delete({ where: { id: logId } });
}
