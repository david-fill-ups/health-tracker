import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { generateRecommendations, getCdcLastUpdated } from "@/lib/cdc";
import { findDestination, getTravelVaccineStatus } from "@/lib/travel";
import type { VaccinationSource } from "@/generated/prisma/client";

// ── Vaccination (parent) ───────────────────────────────────────────────────────

export async function getVaccinationsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.vaccination.findMany({
    where: { profileId },
    include: {
      doses: {
        include: { facility: true },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getVaccinationById(userId: string, vaccinationId: string) {
  const vaccination = await prisma.vaccination.findUnique({
    where: { id: vaccinationId },
    include: {
      doses: {
        include: { facility: true },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!vaccination) throw new Error("Vaccination not found");
  await assertProfileAccess(userId, vaccination.profileId);
  return vaccination;
}

export interface CreateVaccinationInput {
  name: string;
  aliases?: string[];
  notes?: string;
}

export async function createVaccinationRecord(
  userId: string,
  profileId: string,
  input: CreateVaccinationInput
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const vaccination = await prisma.vaccination.create({
    data: {
      profileId,
      name: input.name,
      aliases: input.aliases ?? [],
      notes: input.notes,
    },
  });
  await logAudit(userId, profileId, "CREATE_VACCINATION", "Vaccination", vaccination.id, { name: vaccination.name });
  return vaccination;
}

export interface UpdateVaccinationInput {
  name?: string;
  aliases?: string[];
  notes?: string | null;
}

export async function updateVaccinationRecord(
  userId: string,
  vaccinationId: string,
  input: UpdateVaccinationInput
) {
  const vaccination = await prisma.vaccination.findUnique({
    where: { id: vaccinationId },
    select: { profileId: true },
  });
  if (!vaccination) throw new Error("Vaccination not found");
  await assertProfileAccess(userId, vaccination.profileId, "WRITE");
  const updated = await prisma.vaccination.update({
    where: { id: vaccinationId },
    data: { name: input.name, aliases: input.aliases, notes: input.notes },
  });
  await logAudit(userId, vaccination.profileId, "UPDATE_VACCINATION", "Vaccination", vaccinationId);
  return updated;
}

export async function deleteVaccinationRecord(userId: string, vaccinationId: string) {
  const vaccination = await prisma.vaccination.findUnique({
    where: { id: vaccinationId },
    select: { profileId: true, name: true },
  });
  if (!vaccination) throw new Error("Vaccination not found");
  await assertProfileAccess(userId, vaccination.profileId, "WRITE");
  await logAudit(userId, vaccination.profileId, "DELETE_VACCINATION", "Vaccination", vaccinationId, { name: vaccination.name });
  await prisma.vaccination.delete({ where: { id: vaccinationId } });
}

// ── Dose ───────────────────────────────────────────────────────────────────────

export interface CreateDoseInput {
  vaccineName: string;
  name?: string;
  date?: Date;
  source?: VaccinationSource;
  facilityId?: string;
  lotNumber?: string | null;
  notes?: string;
}

export async function createDose(userId: string, profileId: string, input: CreateDoseInput) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const { vaccineName, name, date, source, facilityId, lotNumber, notes } = input;

  // Find or create the Vaccination parent
  const vaccination = await prisma.vaccination.upsert({
    where: { profileId_name: { profileId, name: vaccineName } },
    create: { profileId, name: vaccineName, aliases: [] },
    update: {},
  });

  const dose = await prisma.dose.create({
    data: {
      vaccinationId: vaccination.id,
      profileId,
      name: name ?? null,
      date: date ?? new Date(),
      source: source ?? "ADMINISTERED",
      facilityId,
      lotNumber,
      notes,
    },
  });
  await logAudit(userId, profileId, "CREATE_DOSE", "Dose", dose.id, { vaccineName });
  return dose;
}

export async function getDoseById(userId: string, doseId: string) {
  const dose = await prisma.dose.findUnique({
    where: { id: doseId },
    include: { facility: true, vaccination: true },
  });
  if (!dose) throw new Error("Dose not found");
  await assertProfileAccess(userId, dose.profileId);
  return dose;
}

export interface UpdateDoseInput {
  name?: string | null;
  date?: Date;
  source?: VaccinationSource;
  facilityId?: string | null;
  lotNumber?: string | null;
  notes?: string | null;
}

export async function updateDose(userId: string, doseId: string, input: UpdateDoseInput) {
  const dose = await prisma.dose.findUnique({
    where: { id: doseId },
    select: { profileId: true },
  });
  if (!dose) throw new Error("Dose not found");
  await assertProfileAccess(userId, dose.profileId, "WRITE");
  const { name, date, source, facilityId, lotNumber, notes } = input;
  const updated = await prisma.dose.update({
    where: { id: doseId },
    data: { name, date, source, facilityId, lotNumber, notes },
  });
  await logAudit(userId, dose.profileId, "UPDATE_DOSE", "Dose", doseId);
  return updated;
}

export async function deleteDose(userId: string, doseId: string) {
  const dose = await prisma.dose.findUnique({
    where: { id: doseId },
    select: { profileId: true },
  });
  if (!dose) throw new Error("Dose not found");
  await assertProfileAccess(userId, dose.profileId, "WRITE");
  await logAudit(userId, dose.profileId, "DELETE_DOSE", "Dose", doseId);
  await prisma.dose.delete({ where: { id: doseId } });
}

// ── Recommendations ────────────────────────────────────────────────────────────

export async function getVaccinationRecommendations(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { birthDate: true },
  });
  if (!profile) throw new Error("Profile not found");

  const vaccinations = await prisma.vaccination.findMany({
    where: { profileId },
    select: {
      name: true,
      doses: { select: { date: true, source: true } },
    },
  });

  const declinedNames = new Set<string>();
  const naturalNames = new Set<string>();
  const byName = new Map<string, Date[]>();

  for (const v of vaccinations) {
    const key = v.name.toLowerCase();
    for (const dose of v.doses) {
      if (dose.source === "DECLINED") {
        declinedNames.add(key);
        continue;
      }
      if (dose.source === "NATURAL") {
        naturalNames.add(key);
      }
      byName.set(key, [...(byName.get(key) ?? []), dose.date]);
    }
  }

  const recs = generateRecommendations(profile.birthDate, byName);
  const recommendations = recs.map((r) => {
    const allNames = [r.vaccine, ...r.aliases].map((n) => n.toLowerCase());
    if (allNames.some((n) => declinedNames.has(n))) return { ...r, status: "exempt" as const };
    if (allNames.some((n) => naturalNames.has(n)))
      return { ...r, status: "completed" as const, nextDueDate: null, notes: "Natural immunity documented" };
    return r;
  });

  return {
    recommendations,
    dataLastUpdated: getCdcLastUpdated(),
  };
}

// ── Travel check ───────────────────────────────────────────────────────────────

export async function getTravelCheck(userId: string, profileId: string, destination: string) {
  await assertProfileAccess(userId, profileId);

  const destinationKey = findDestination(destination);
  if (!destinationKey) return null;

  const doses = await prisma.dose.findMany({
    where: { profileId, source: { not: "DECLINED" } },
    select: { vaccination: { select: { name: true } } },
  });

  const vaccinationNames = doses.map((d) => ({ name: d.vaccination.name }));
  return getTravelVaccineStatus(destinationKey, vaccinationNames);
}
