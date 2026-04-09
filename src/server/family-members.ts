import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { PermissionError } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { FamilyRelationship, FamilySide } from "@/generated/prisma/enums";

export interface CreateFamilyMemberInput {
  name: string;
  relationship: FamilyRelationship;
  side?: FamilySide;
  dateOfBirth?: Date | null;
  dateOfDeath?: Date | null;
  causeOfDeath?: string | null;
  notes?: string;
}

export interface CreateFamilyConditionInput {
  name: string;
  notes?: string;
}

export async function getFamilyMembersForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.familyMember.findMany({
    where: { profileId },
    include: { conditions: { orderBy: { name: "asc" } } },
    orderBy: [{ relationship: "asc" }, { name: "asc" }],
  });
}

export async function getFamilyMemberById(userId: string, profileId: string, memberId: string) {
  await assertProfileAccess(userId, profileId);
  return prisma.familyMember.findUnique({
    where: { id: memberId, profileId },
    include: { conditions: { orderBy: { name: "asc" } } },
  });
}

export async function createFamilyMember(
  userId: string,
  profileId: string,
  input: CreateFamilyMemberInput
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const member = await prisma.familyMember.create({ data: { profileId, ...input } });
  await logAudit(userId, profileId, "CREATE_FAMILY_MEMBER", "FamilyMember", member.id, {
    name: member.name,
    relationship: member.relationship,
  });
  return member;
}

export async function updateFamilyMember(
  userId: string,
  profileId: string,
  memberId: string,
  input: Partial<CreateFamilyMemberInput>
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const member = await prisma.familyMember.update({
    where: { id: memberId, profileId },
    data: input,
  });
  await logAudit(userId, profileId, "UPDATE_FAMILY_MEMBER", "FamilyMember", memberId);
  return member;
}

export async function deleteFamilyMember(userId: string, profileId: string, memberId: string) {
  await assertProfileAccess(userId, profileId, "WRITE");
  await logAudit(userId, profileId, "DELETE_FAMILY_MEMBER", "FamilyMember", memberId);
  return prisma.familyMember.delete({ where: { id: memberId, profileId } });
}

export async function createFamilyCondition(
  userId: string,
  profileId: string,
  memberId: string,
  input: CreateFamilyConditionInput
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId, profileId },
    select: { id: true },
  });
  if (!member) throw new PermissionError("FORBIDDEN", 403);
  const condition = await prisma.familyCondition.create({
    data: { familyMemberId: memberId, ...input },
  });
  await logAudit(userId, profileId, "CREATE_FAMILY_CONDITION", "FamilyCondition", condition.id, {
    name: condition.name,
    memberId,
  });
  return condition;
}

export async function updateFamilyCondition(
  userId: string,
  profileId: string,
  memberId: string,
  conditionId: string,
  input: Partial<CreateFamilyConditionInput>
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const existing = await prisma.familyCondition.findFirst({
    where: { id: conditionId, familyMemberId: memberId, familyMember: { profileId } },
  });
  if (!existing) throw new PermissionError("FORBIDDEN", 403);
  const condition = await prisma.familyCondition.update({ where: { id: conditionId }, data: input });
  await logAudit(userId, profileId, "UPDATE_FAMILY_CONDITION", "FamilyCondition", conditionId, { memberId });
  return condition;
}

export async function deleteFamilyCondition(
  userId: string,
  profileId: string,
  memberId: string,
  conditionId: string
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const existing = await prisma.familyCondition.findFirst({
    where: { id: conditionId, familyMemberId: memberId, familyMember: { profileId } },
  });
  if (!existing) throw new PermissionError("FORBIDDEN", 403);
  await logAudit(userId, profileId, "DELETE_FAMILY_CONDITION", "FamilyCondition", conditionId, { memberId });
  return prisma.familyCondition.delete({ where: { id: conditionId } });
}
