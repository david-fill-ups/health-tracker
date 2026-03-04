import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { generateRecommendations } from "@/lib/cdc";

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
    select: { birthYear: true },
  });
  if (!profile) throw new Error("Profile not found");

  const vaccinations = await prisma.vaccination.findMany({
    where: { profileId },
    select: { name: true, date: true },
  });

  // Build a map of vaccine name → dates
  const byName = new Map<string, Date[]>();
  for (const v of vaccinations) {
    const key = v.name.toLowerCase();
    const existing = byName.get(key) ?? [];
    existing.push(v.date);
    byName.set(key, existing);
  }

  return generateRecommendations(profile.birthYear, byName);
}

export interface CreateVaccinationInput {
  name: string;
  date: Date;
  facilityId?: string;
  lotNumber?: string;
  notes?: string;
}

export async function createVaccination(
  userId: string,
  profileId: string,
  input: CreateVaccinationInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.vaccination.create({ data: { ...input, profileId } });
}
