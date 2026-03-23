import { prisma } from "@/lib/prisma";
import { assertProfileAccess, hasProfileAccess, PermissionError } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { ProfileRelationshipType } from "@/generated/prisma/enums";

export interface CreateProfileRelationshipInput {
  linkedProfileId: string;
  relationship: ProfileRelationshipType;
  biological?: boolean;
}

const BIOLOGICAL_DEFAULTS: Record<ProfileRelationshipType, boolean> = {
  // Legacy
  PARENT: true, CHILD: true, SIBLING: true, HALF_SIBLING: true,
  GRANDPARENT: true, GRANDCHILD: true, AUNT_UNCLE: true, NIECE_NEPHEW: true,
  STEP_PARENT: false, STEP_CHILD: false, IN_LAW: false,
  // Current
  SPOUSE: false,
  MOTHER: true, FATHER: true, DAUGHTER: true, SON: true,
  SISTER: true, BROTHER: true, HALF_SISTER: true, HALF_BROTHER: true,
  MATERNAL_GRANDMOTHER: true, MATERNAL_GRANDFATHER: true,
  PATERNAL_GRANDMOTHER: true, PATERNAL_GRANDFATHER: true,
  GRANDDAUGHTER: true, GRANDSON: true,
  MATERNAL_AUNT: true, MATERNAL_UNCLE: true,
  PATERNAL_AUNT: true, PATERNAL_UNCLE: true,
  NIECE: true, NEPHEW: true,
  COUSIN: true,
  STEP_MOTHER: false, STEP_FATHER: false, STEP_DAUGHTER: false, STEP_SON: false,
  STEP_SISTER: false, STEP_BROTHER: false,
  MOTHER_IN_LAW: false, FATHER_IN_LAW: false,
  DAUGHTER_IN_LAW: false, SON_IN_LAW: false,
  SISTER_IN_LAW: false, BROTHER_IN_LAW: false,
  OTHER: false,
};

export async function getProfileRelationships(userId: string, fromProfileId: string) {
  await assertProfileAccess(userId, fromProfileId);
  const relationships = await prisma.profileRelationship.findMany({
    where: { fromProfileId },
    include: { toProfile: { select: { id: true, name: true } } },
    orderBy: { relationship: "asc" },
  });

  return Promise.all(
    relationships.map(async (rel) => {
      if (!rel.biological) return { ...rel, conditions: [] };
      const accessible = await hasProfileAccess(userId, rel.toProfileId);
      if (!accessible) return { ...rel, conditions: [] };
      const conditions = await prisma.condition.findMany({
        where: { profileId: rel.toProfileId },
        orderBy: { name: "asc" },
      });
      return { ...rel, conditions };
    })
  );
}

export async function createProfileRelationship(
  userId: string,
  fromProfileId: string,
  input: CreateProfileRelationshipInput
) {
  await assertProfileAccess(userId, fromProfileId, "OWNER");
  if (fromProfileId === input.linkedProfileId) {
    throw new Error("Cannot link a profile to itself");
  }
  const accessible = await hasProfileAccess(userId, input.linkedProfileId);
  if (!accessible) throw new PermissionError("No access to linked profile", 403);
  const biological = input.biological ?? BIOLOGICAL_DEFAULTS[input.relationship];
  const rel = await prisma.profileRelationship.create({
    data: {
      fromProfileId,
      toProfileId: input.linkedProfileId,
      relationship: input.relationship,
      biological,
    },
    include: { toProfile: { select: { id: true, name: true } } },
  });
  await logAudit(userId, fromProfileId, "CREATE_PROFILE_RELATIONSHIP", "ProfileRelationship", rel.id, {
    linkedProfileId: input.linkedProfileId,
    relationship: input.relationship,
    biological,
  });
  return { ...rel, conditions: [] };
}

export async function updateProfileRelationship(
  userId: string,
  fromProfileId: string,
  relId: string,
  input: { relationship?: ProfileRelationshipType; biological?: boolean }
) {
  await assertProfileAccess(userId, fromProfileId, "OWNER");
  const existing = await prisma.profileRelationship.findUnique({
    where: { id: relId, fromProfileId },
  });
  if (!existing) throw new PermissionError("FORBIDDEN", 403);
  const rel = await prisma.profileRelationship.update({
    where: { id: relId },
    data: input,
    include: { toProfile: { select: { id: true, name: true } } },
  });
  await logAudit(userId, fromProfileId, "UPDATE_PROFILE_RELATIONSHIP", "ProfileRelationship", relId);
  return rel;
}

export async function deleteProfileRelationship(
  userId: string,
  fromProfileId: string,
  relId: string
) {
  await assertProfileAccess(userId, fromProfileId, "OWNER");
  const existing = await prisma.profileRelationship.findUnique({
    where: { id: relId, fromProfileId },
  });
  if (!existing) throw new PermissionError("FORBIDDEN", 403);
  await logAudit(userId, fromProfileId, "DELETE_PROFILE_RELATIONSHIP", "ProfileRelationship", relId);
  return prisma.profileRelationship.delete({ where: { id: relId } });
}
