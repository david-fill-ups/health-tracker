import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import type { ConditionStatus } from "@/generated/prisma";

export async function getConditionsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.condition.findMany({
    where: { profileId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export interface CreateConditionInput {
  name: string;
  diagnosisDate?: Date;
  status?: ConditionStatus;
  notes?: string;
}

export async function createCondition(
  userId: string,
  profileId: string,
  input: CreateConditionInput
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.condition.create({ data: { ...input, profileId } });
}

export async function updateCondition(
  userId: string,
  profileId: string,
  conditionId: string,
  input: Partial<CreateConditionInput>
) {
  await assertProfileAccess(userId, profileId, "OWNER");
  return prisma.condition.update({ where: { id: conditionId, profileId }, data: input });
}
