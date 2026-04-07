import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { generateRecommendations, getCdcLastUpdated, getAllCanonicals } from "@/lib/cdc";
import { findDestination, getTravelVaccineStatus } from "@/lib/travel";
import type { VaccinationSource } from "@/generated/prisma/client";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Flattens the M2M join shape into a plain Dose array for API consumers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenDoses(doseVaccinations: any[]) {
  return doseVaccinations.map((dv) => dv.dose);
}

// ── Vaccination (parent) ───────────────────────────────────────────────────────

export async function getVaccinationsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  const vaccinations = await prisma.vaccination.findMany({
    where: { profileId },
    include: {
      doses: {
        include: {
          dose: { include: { facility: true } },
        },
        orderBy: { dose: { date: "desc" } },
      },
    },
    orderBy: { name: "asc" },
  });
  // Flatten: vaccination.doses[].dose → vaccination.doses[]
  return vaccinations.map((v) => ({ ...v, doses: flattenDoses(v.doses) }));
}

export async function getVaccinationById(userId: string, vaccinationId: string) {
  const vaccination = await prisma.vaccination.findUnique({
    where: { id: vaccinationId },
    include: {
      doses: {
        include: {
          dose: { include: { facility: true } },
        },
        orderBy: { dose: { date: "desc" } },
      },
    },
  });
  if (!vaccination) throw new Error("Vaccination not found");
  await assertProfileAccess(userId, vaccination.profileId);
  return { ...vaccination, doses: flattenDoses(vaccination.doses) };
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

  // Resolve combo vaccine names to all canonical CDC components.
  // "DTaP-Hib-IPV-HepB" → ["DTaP", "Hib", "Hepatitis B", "Polio (IPV)"]
  // "Vaxelis" → same; "Influenza" → ["Influenza"]; unknown → [vaccineName]
  const canonicals = getAllCanonicals(vaccineName);
  const vaccinationNames = canonicals.size > 0 ? Array.from(canonicals) : [vaccineName];
  const isCombo = vaccinationNames.length > 1;

  // Upsert all target Vaccination records
  const vaccinationIds = await Promise.all(
    vaccinationNames.map((vaxName) =>
      prisma.vaccination
        .upsert({
          where: { profileId_name: { profileId, name: vaxName } },
          create: { profileId, name: vaxName, aliases: [] },
          update: {},
          select: { id: true },
        })
        .then((v) => v.id)
    )
  );

  const dose = await prisma.dose.create({
    data: {
      profileId,
      // Store the original combo/brand name for display when it differs from the canonical
      name: name ?? (isCombo ? vaccineName : null),
      date: date ?? new Date(),
      source: source ?? "ADMINISTERED",
      facilityId,
      lotNumber,
      notes,
      vaccinations: {
        create: vaccinationIds.map((vaccinationId) => ({ vaccinationId })),
      },
    },
  });
  await logAudit(userId, profileId, "CREATE_DOSE", "Dose", dose.id, { vaccineName });
  return dose;
}

export async function getDoseById(userId: string, doseId: string) {
  const dose = await prisma.dose.findUnique({
    where: { id: doseId },
    include: {
      facility: true,
      vaccinations: { include: { vaccination: true } },
    },
  });
  if (!dose) throw new Error("Dose not found");
  await assertProfileAccess(userId, dose.profileId);
  // Expose first vaccination as `vaccination` for backward compat; also expose full array
  const vaccination = dose.vaccinations[0]?.vaccination ?? null;
  const allVaccinations = dose.vaccinations.map((dv) => dv.vaccination);
  return { ...dose, vaccination, allVaccinations };
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
      doses: {
        select: {
          dose: { select: { date: true, source: true } },
        },
      },
    },
  });

  const declinedNames = new Set<string>();
  const naturalNames = new Set<string>();
  const byName = new Map<string, Date[]>();

  for (const v of vaccinations) {
    const key = v.name.toLowerCase();
    for (const dv of v.doses) {
      const dose = dv.dose;
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

  // Query canonical Vaccination records directly — simpler and correct with M2M
  const vaccinations = await prisma.vaccination.findMany({
    where: { profileId },
    select: { name: true },
  });

  return getTravelVaccineStatus(destinationKey, vaccinations);
}
