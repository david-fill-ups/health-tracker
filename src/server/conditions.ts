import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { ConditionStatus } from "@/generated/prisma/enums";

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
  await assertProfileAccess(userId, profileId, "WRITE");
  const { name, diagnosisDate, status, notes } = input;
  const condition = await prisma.condition.create({ data: { name, diagnosisDate, status, notes, profileId } });
  await logAudit(userId, profileId, "CREATE_CONDITION", "Condition", condition.id, { name: condition.name });
  return condition;
}

export async function getConditionById(
  userId: string,
  profileId: string,
  conditionId: string
) {
  await assertProfileAccess(userId, profileId);
  return prisma.condition.findUnique({ where: { id: conditionId, profileId } });
}

export async function updateCondition(
  userId: string,
  profileId: string,
  conditionId: string,
  input: Partial<CreateConditionInput>
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const { name, diagnosisDate, status, notes } = input;
  const condition = await prisma.condition.update({ where: { id: conditionId, profileId }, data: { name, diagnosisDate, status, notes } });
  await logAudit(userId, profileId, "UPDATE_CONDITION", "Condition", conditionId);
  return condition;
}

export async function deleteCondition(
  userId: string,
  profileId: string,
  conditionId: string
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  await logAudit(userId, profileId, "DELETE_CONDITION", "Condition", conditionId);
  return prisma.condition.delete({ where: { id: conditionId, profileId } });
}
