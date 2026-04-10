import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { z } from "zod";
import type { CreateInsuranceCardSchema, UpdateInsuranceCardSchema } from "@/lib/validation";

export type CreateInsuranceCardInput = z.infer<typeof CreateInsuranceCardSchema>;
export type UpdateInsuranceCardInput = z.infer<typeof UpdateInsuranceCardSchema>;

export type InsuranceCardListItem = Awaited<ReturnType<typeof getInsuranceCardsForProfile>>[number];

/**
 * List all insurance cards for a profile — both owned and shared.
 * Image blobs are stripped — the list returns hasFrontImage / hasBackImage booleans instead.
 * Ordered: ACTIVE first, then by expiration date ascending (soonest expiring first).
 */
export async function getInsuranceCardsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  const cards = await prisma.insuranceCard.findMany({
    where: {
      OR: [
        { profileId },
        { members: { some: { profileId } } },
      ],
    },
    include: {
      profile: { select: { id: true, name: true } },
      members: { include: { profile: { select: { name: true } } } },
    },
    orderBy: [{ status: "asc" }, { expirationDate: "asc" }],
  });
  return cards.map(({ frontImageData, backImageData, profile, members, ...rest }) => ({
    ...rest,
    hasFrontImage: frontImageData != null,
    hasBackImage: backImageData != null,
    isShared: rest.profileId !== profileId,
    ownerName: profile.name,
    memberProfileIds: members.map((m) => m.profileId),
    memberNames: members.map((m) => m.profile.name),
  }));
}

/**
 * Fetch a single card including image data (used by the edit form and image viewer).
 * Supports both owned cards and cards the profile is a member of.
 * Also returns memberProfileIds for pre-populating the member selection.
 */
export async function getInsuranceCardById(
  userId: string,
  profileId: string,
  cardId: string
) {
  await assertProfileAccess(userId, profileId);
  const card = await prisma.insuranceCard.findFirst({
    where: {
      id: cardId,
      OR: [
        { profileId },
        { members: { some: { profileId } } },
      ],
    },
    include: { members: { select: { profileId: true } } },
  });
  if (!card) return null;
  const { members, ...rest } = card;
  return { ...rest, memberProfileIds: members.map((m) => m.profileId) };
}

export async function createInsuranceCard(
  userId: string,
  profileId: string,
  input: Omit<CreateInsuranceCardInput, "profileId">
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const { memberProfileIds, ...cardData } = input;
  const card = await prisma.insuranceCard.create({
    data: {
      ...cardData,
      profileId,
      members: memberProfileIds?.length
        ? { createMany: { data: memberProfileIds.map((id) => ({ profileId: id })) } }
        : undefined,
    },
  });
  await logAudit(userId, profileId, "CREATE_INSURANCE_CARD", "InsuranceCard", card.id, {
    type: card.type,
    insurerName: card.insurerName,
  });
  return card;
}

export async function updateInsuranceCard(
  userId: string,
  profileId: string,
  cardId: string,
  input: UpdateInsuranceCardInput
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const { memberProfileIds, ...cardData } = input;
  const card = await prisma.insuranceCard.update({
    where: { id: cardId, profileId },
    data: {
      ...cardData,
      members: memberProfileIds !== undefined
        ? { deleteMany: {}, createMany: { data: memberProfileIds.map((id) => ({ profileId: id })) } }
        : undefined,
    },
  });
  await logAudit(userId, profileId, "UPDATE_INSURANCE_CARD", "InsuranceCard", cardId);
  return card;
}

export async function deleteInsuranceCard(
  userId: string,
  profileId: string,
  cardId: string
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  await logAudit(userId, profileId, "DELETE_INSURANCE_CARD", "InsuranceCard", cardId);
  return prisma.insuranceCard.delete({ where: { id: cardId, profileId } });
}
