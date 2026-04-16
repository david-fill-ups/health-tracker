import { prisma } from "@/lib/prisma";
import { assertProfileAccess, hasProfileAccess, PermissionError } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { ProfileRelationshipType } from "@/generated/prisma/enums";

import type { Sex } from "@/generated/prisma/enums";

/** Returns the inverse relationship type for auto-mirroring, or null if not applicable. */
function computeInverse(
  relationship: ProfileRelationshipType,
  fromSex: Sex,
  toSex: Sex
): ProfileRelationshipType | null {
  switch (relationship) {
    case "FATHER":
    case "MOTHER":
      // fromProfile is the child; toProfile is the parent — give toProfile SON or DAUGHTER
      return fromSex === "FEMALE" ? "DAUGHTER" : "SON";
    case "SON":
    case "DAUGHTER":
      // fromProfile is the parent; toProfile is the child — give toProfile FATHER or MOTHER
      return toSex === "FEMALE" ? "MOTHER" : "FATHER";
    case "BROTHER":
    case "SISTER":
      return fromSex === "FEMALE" ? "SISTER" : "BROTHER";
    case "HALF_BROTHER":
    case "HALF_SISTER":
      return fromSex === "FEMALE" ? "HALF_SISTER" : "HALF_BROTHER";
    case "SPOUSE":
      return "SPOUSE";
    default:
      // Grandparents, aunts/uncles, step/in-law — too complex to infer automatically
      return null;
  }
}

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

const INHERITABLE_FAMILY_RELATIONSHIPS = new Set([
  // Only one level deep: parent-tier and sibling-tier entries
  // (GRANDFATHER/GRANDMOTHER/AUNT/UNCLE would be great-grandparents — skip)
  "PARENT", "FATHER", "MOTHER",
  "SIBLING", "BROTHER", "SISTER", "HALF_BROTHER", "HALF_SISTER",
]);

const INHERITABLE_PROFILE_RELATIONSHIPS = new Set([
  "FATHER", "MOTHER", "PARENT",
  "BROTHER", "HALF_BROTHER", "SISTER", "HALF_SISTER", "SIBLING",
]);

async function getInheritedFamilyData(userId: string, linkedProfileId: string) {
  const [familyMembers, linkedRels] = await Promise.all([
    prisma.familyMember.findMany({
      where: {
        profileId: linkedProfileId,
        relationship: { in: [...INHERITABLE_FAMILY_RELATIONSHIPS] as any[] },
      },
      include: { conditions: true },
      orderBy: { relationship: "asc" },
    }),
    prisma.profileRelationship.findMany({
      where: {
        fromProfileId: linkedProfileId,
        relationship: { in: [...INHERITABLE_PROFILE_RELATIONSHIPS] as any[] },
      },
      include: { toProfile: { select: { id: true, name: true, imageData: true } } },
      orderBy: { relationship: "asc" },
    }),
  ]);

  const linkedProfilesWithConditions = await Promise.all(
    linkedRels.map(async (rel) => {
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

  return { familyMembers, linkedProfiles: linkedProfilesWithConditions };
}

export async function getProfileRelationships(
  userId: string,
  fromProfileId: string,
  options?: { includeInherited?: boolean }
) {
  await assertProfileAccess(userId, fromProfileId);
  const relationships = await prisma.profileRelationship.findMany({
    where: { fromProfileId },
    include: { toProfile: { select: { id: true, name: true, imageData: true } } },
    orderBy: { relationship: "asc" },
  });

  return Promise.all(
    relationships.map(async (rel) => {
      if (!rel.biological) return { ...rel, conditions: [], inherited: null };
      const accessible = await hasProfileAccess(userId, rel.toProfileId);
      if (!accessible) return { ...rel, conditions: [], inherited: null };
      const conditions = await prisma.condition.findMany({
        where: { profileId: rel.toProfileId },
        orderBy: { name: "asc" },
      });
      const inherited = options?.includeInherited
        ? await getInheritedFamilyData(userId, rel.toProfileId)
        : null;
      return { ...rel, conditions, inherited };
    })
  );
}

export async function createProfileRelationship(
  userId: string,
  fromProfileId: string,
  input: CreateProfileRelationshipInput
) {
  await assertProfileAccess(userId, fromProfileId, "WRITE");
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
    include: { toProfile: { select: { id: true, name: true, imageData: true } } },
  });
  await logAudit(userId, fromProfileId, "CREATE_PROFILE_RELATIONSHIP", "ProfileRelationship", rel.id, {
    linkedProfileId: input.linkedProfileId,
    relationship: input.relationship,
    biological,
  });

  // Auto-create the inverse relationship if the user also owns the linked profile
  const ownsLinked = await hasProfileAccess(userId, input.linkedProfileId, "OWNER");
  if (ownsLinked) {
    const [fromProfile, toProfile] = await Promise.all([
      prisma.profile.findUnique({ where: { id: fromProfileId }, select: { sex: true } }),
      prisma.profile.findUnique({ where: { id: input.linkedProfileId }, select: { sex: true } }),
    ]);
    if (fromProfile && toProfile) {
      const inverseType = computeInverse(input.relationship, fromProfile.sex, toProfile.sex);
      if (inverseType) {
        const existingInverse = await prisma.profileRelationship.findUnique({
          where: { fromProfileId_toProfileId: { fromProfileId: input.linkedProfileId, toProfileId: fromProfileId } },
        });
        if (!existingInverse) {
          const inverseRel = await prisma.profileRelationship.create({
            data: {
              fromProfileId: input.linkedProfileId,
              toProfileId: fromProfileId,
              relationship: inverseType,
              biological,
            },
          });
          await logAudit(userId, input.linkedProfileId, "CREATE_PROFILE_RELATIONSHIP", "ProfileRelationship", inverseRel.id, {
            linkedProfileId: fromProfileId,
            relationship: inverseType,
            biological,
            auto: true,
          });
        }
      }
    }
  }

  return { ...rel, conditions: [] };
}

export async function updateProfileRelationship(
  userId: string,
  fromProfileId: string,
  relId: string,
  input: { relationship?: ProfileRelationshipType; biological?: boolean }
) {
  await assertProfileAccess(userId, fromProfileId, "WRITE");
  const existing = await prisma.profileRelationship.findUnique({
    where: { id: relId, fromProfileId },
  });
  if (!existing) throw new PermissionError("FORBIDDEN", 403);
  const rel = await prisma.profileRelationship.update({
    where: { id: relId },
    data: input,
    include: { toProfile: { select: { id: true, name: true, imageData: true } } },
  });
  await logAudit(userId, fromProfileId, "UPDATE_PROFILE_RELATIONSHIP", "ProfileRelationship", relId);
  return rel;
}

export async function deleteProfileRelationship(
  userId: string,
  fromProfileId: string,
  relId: string
) {
  await assertProfileAccess(userId, fromProfileId, "WRITE");
  const existing = await prisma.profileRelationship.findUnique({
    where: { id: relId, fromProfileId },
  });
  if (!existing) throw new PermissionError("FORBIDDEN", 403);
  await logAudit(userId, fromProfileId, "DELETE_PROFILE_RELATIONSHIP", "ProfileRelationship", relId);
  return prisma.profileRelationship.delete({ where: { id: relId } });
}
