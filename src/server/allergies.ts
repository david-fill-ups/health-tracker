import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function getAllergiesForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.allergy.findMany({
    where: { profileId },
    orderBy: { allergen: "asc" },
  });
}

export interface CreateAllergyInput {
  allergen: string;
  category?: string | null;
  diagnosisDate?: Date;
  whealSize?: number;
  notes?: string;
}

export async function getAllergyById(userId: string, profileId: string, allergyId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.allergy.findUnique({ where: { id: allergyId, profileId } });
}

export async function createAllergy(
  userId: string,
  profileId: string,
  input: CreateAllergyInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { allergen, category, diagnosisDate, whealSize, notes } = input;
  const allergy = await prisma.allergy.create({ data: { allergen, category, diagnosisDate, whealSize, notes, profileId } });
  await logAudit(userId, profileId, "CREATE_ALLERGY", "Allergy", allergy.id, { allergen: allergy.allergen });
  return allergy;
}

export async function updateAllergy(
  userId: string,
  profileId: string,
  allergyId: string,
  input: Partial<CreateAllergyInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  const { allergen, category, diagnosisDate, whealSize, notes } = input;
  const allergy = await prisma.allergy.update({ where: { id: allergyId, profileId }, data: { allergen, category, diagnosisDate, whealSize, notes } });
  await logAudit(userId, profileId, "UPDATE_ALLERGY", "Allergy", allergyId);
  return allergy;
}

export async function deleteAllergy(userId: string, profileId: string, allergyId: string) {
  await assertProfileAccess(userId, profileId, "OWNER");
  await logAudit(userId, profileId, "DELETE_ALLERGY", "Allergy", allergyId);
  return prisma.allergy.delete({ where: { id: allergyId, profileId } });
}
