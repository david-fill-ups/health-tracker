import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { generateRecommendations, getCdcLastUpdated } from "@/lib/cdc";
import { findDestination, getTravelVaccineStatus } from "@/lib/travel";
import type { VaccinationSource } from "@/generated/prisma/client";

export async function getVaccinationsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.vaccination.findMany({
    where: { profileId },
    include: { facility: true },
    orderBy: { date: "desc" },
  });
}

export async function getVaccinationRecommendations(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { birthDate: true },
  });
  if (!profile) throw new Error("Profile not found");

  const vaccinations = await prisma.vaccination.findMany({
    where: { profileId },
    select: { name: true, date: true, source: true },
  });

  const declinedNames = new Set<string>();
  const naturalNames = new Set<string>();
  const byName = new Map<string, Date[]>();
  for (const v of vaccinations) {
    const key = v.name.toLowerCase();
    if (v.source === "DECLINED") {
      declinedNames.add(key);
      continue;
    }
    if (v.source === "NATURAL") {
      naturalNames.add(key);
    }
    byName.set(key, [...(byName.get(key) ?? []), v.date]);
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

export interface CreateVaccinationInput {
  name: string;
  date?: Date;
  source?: VaccinationSource;
  facilityId?: string;
  lotNumber?: string | null;
  notes?: string;
}

export async function createVaccination(
  userId: string,
  profileId: string,
  input: CreateVaccinationInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { name, date, source, facilityId, lotNumber, notes } = input;
  const vaccination = await prisma.vaccination.create({
    data: {
      name,
      date: date ?? new Date(),
      source: source ?? "ADMINISTERED",
      facilityId,
      lotNumber,
      notes,
      profileId,
    },
  });
  await logAudit(userId, profileId, "CREATE_VACCINATION", "Vaccination", vaccination.id, { name: vaccination.name });
  return vaccination;
}

export interface UpdateVaccinationInput {
  name?: string;
  date?: Date;
  source?: VaccinationSource;
  facilityId?: string | null;
  lotNumber?: string | null;
  notes?: string | null;
}

export async function updateVaccination(
  userId: string,
  id: string,
  input: UpdateVaccinationInput
) {
  const vaccination = await prisma.vaccination.findUnique({
    where: { id },
    select: { profileId: true },
  });
  if (!vaccination) throw new Error("Vaccination not found");
  await assertProfileAccess(userId, vaccination.profileId, "OWNER");
  const { name, date, source, facilityId, lotNumber, notes } = input;
  const updated = await prisma.vaccination.update({
    where: { id },
    data: { name, date, source, facilityId, lotNumber, notes },
  });
  await logAudit(userId, vaccination.profileId, "UPDATE_VACCINATION", "Vaccination", id);
  return updated;
}

export async function deleteVaccination(userId: string, id: string) {
  const vaccination = await prisma.vaccination.findUnique({
    where: { id },
    select: { profileId: true },
  });
  if (!vaccination) throw new Error("Vaccination not found");
  await assertProfileAccess(userId, vaccination.profileId, "OWNER");
  await logAudit(userId, vaccination.profileId, "DELETE_VACCINATION", "Vaccination", id);
  await prisma.vaccination.delete({ where: { id } });
}

export async function getTravelCheck(userId: string, profileId: string, destination: string) {
  await assertProfileAccess(userId, profileId);

  const destinationKey = findDestination(destination);
  if (!destinationKey) return null;

  const vaccinations = await prisma.vaccination.findMany({
    where: { profileId, source: { not: "DECLINED" } },
    select: { name: true },
  });

  return getTravelVaccineStatus(destinationKey, vaccinations);
}

export async function getVaccinationById(userId: string, id: string) {
  const vaccination = await prisma.vaccination.findUnique({
    where: { id },
    include: { facility: true },
  });
  if (!vaccination) throw new Error("Vaccination not found");
  await assertProfileAccess(userId, vaccination.profileId);
  return vaccination;
}
