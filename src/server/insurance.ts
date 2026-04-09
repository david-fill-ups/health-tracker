import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { z } from "zod";
import type { CreateInsuranceCardSchema, UpdateInsuranceCardSchema } from "@/lib/validation";

export type CreateInsuranceCardInput = z.infer<typeof CreateInsuranceCardSchema>;
export type UpdateInsuranceCardInput = z.infer<typeof UpdateInsuranceCardSchema>;

export type InsuranceCardListItem = Awaited<ReturnType<typeof getInsuranceCardsForProfile>>[number];

/**
 * List all insurance cards for a profile.
 * Image blobs are stripped — the list returns hasFrontImage / hasBackImage booleans instead.
 * Ordered: ACTIVE first, then by expiration date ascending (soonest expiring first).
 */
export async function getInsuranceCardsForProfile(userId: string, profileId: string) {
  await assertProfileAccess(userId, profileId);
  const cards = await prisma.insuranceCard.findMany({
    where: { profileId },
    orderBy: [{ status: "asc" }, { expirationDate: "asc" }],
  });
  return cards.map(({ frontImageData, backImageData, ...rest }) => ({
    ...rest,
    hasFrontImage: frontImageData != null,
    hasBackImage: backImageData != null,
  }));
}

/**
 * Fetch a single card including image data (used by the edit form).
 */
export async function getInsuranceCardById(
  userId: string,
  profileId: string,
  cardId: string
) {
  await assertProfileAccess(userId, profileId);
  return prisma.insuranceCard.findUnique({
    where: { id: cardId, profileId },
  });
}

export async function createInsuranceCard(
  userId: string,
  profileId: string,
  input: Omit<CreateInsuranceCardInput, "profileId">
) {
  await assertProfileAccess(userId, profileId, "WRITE");
  const card = await prisma.insuranceCard.create({
    data: { ...input, profileId },
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
  const card = await prisma.insuranceCard.update({
    where: { id: cardId, profileId },
    data: input,
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
