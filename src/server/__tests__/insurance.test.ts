import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionError } from "@/lib/permissions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    insuranceCard: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/permissions", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...original, assertProfileAccess: vi.fn() };
});

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  getInsuranceCardsForProfile,
  getInsuranceCardById,
  createInsuranceCard,
  updateInsuranceCard,
  deleteInsuranceCard,
} from "@/server/insurance";

const mockAssertProfileAccess = assertProfileAccess as ReturnType<typeof vi.fn>;
const mockLogAudit = logAudit as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.insuranceCard.findMany as ReturnType<typeof vi.fn>;
const mockFindFirst = prisma.insuranceCard.findFirst as ReturnType<typeof vi.fn>;
const mockCreate = prisma.insuranceCard.create as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.insuranceCard.update as ReturnType<typeof vi.fn>;
const mockDelete = prisma.insuranceCard.delete as ReturnType<typeof vi.fn>;

const USER_ID = "user-1";
const PROFILE_ID = "profile-1";
const CARD_ID = "card-1";

const fakeCard = {
  id: CARD_ID,
  profileId: PROFILE_ID,
  type: "HEALTH",
  status: "ACTIVE",
  insurerName: "Blue Cross",
  planName: "Gold PPO",
  policyHolder: "Jane Doe",
  memberId: "MEM123",
  groupNumber: "GRP456",
  rxBIN: null,
  rxPCN: null,
  rxGroup: null,
  phone: null,
  website: null,
  cardLastFour: null,
  cardNetwork: null,
  effectiveDate: null,
  expirationDate: null,
  frontImageData: null,
  backImageData: null,
  notes: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAssertProfileAccess.mockResolvedValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
});

// ── getInsuranceCardsForProfile ────────────────────────────────────────────────

describe("getInsuranceCardsForProfile", () => {
  it("returns cards with hasFrontImage / hasBackImage instead of raw blobs", async () => {
    const cardWithImages = {
      ...fakeCard,
      frontImageData: "data:image/jpeg;base64,abc",
      backImageData: null,
      profile: { id: PROFILE_ID, name: "Test Profile" },
      members: [],
    };
    mockFindMany.mockResolvedValue([cardWithImages]);

    const result = await getInsuranceCardsForProfile(USER_ID, PROFILE_ID);

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("frontImageData");
    expect(result[0]).not.toHaveProperty("backImageData");
    expect(result[0].hasFrontImage).toBe(true);
    expect(result[0].hasBackImage).toBe(false);
  });

  it("propagates PermissionError when caller lacks access", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("UNAUTHORIZED", 401));

    await expect(getInsuranceCardsForProfile(USER_ID, PROFILE_ID)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

// ── getInsuranceCardById ───────────────────────────────────────────────────────

describe("getInsuranceCardById", () => {
  it("returns the full card record including image data", async () => {
    const cardWithMembers = { ...fakeCard, members: [] };
    mockFindFirst.mockResolvedValue(cardWithMembers);

    const result = await getInsuranceCardById(USER_ID, PROFILE_ID, CARD_ID);

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID);
    expect(mockFindFirst).toHaveBeenCalled();
    expect(result).toMatchObject({ id: CARD_ID, profileId: PROFILE_ID });
    expect(result).toHaveProperty("memberProfileIds");
  });

  it("returns null when card does not exist", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getInsuranceCardById(USER_ID, PROFILE_ID, CARD_ID);

    expect(result).toBeNull();
  });
});

// ── createInsuranceCard ────────────────────────────────────────────────────────

describe("createInsuranceCard", () => {
  it("creates card and calls logAudit", async () => {
    mockCreate.mockResolvedValue(fakeCard);

    const result = await createInsuranceCard(USER_ID, PROFILE_ID, {
      type: "HEALTH",
      insurerName: "Blue Cross",
      memberId: "MEM123",
    });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ profileId: PROFILE_ID, insurerName: "Blue Cross" }),
    });
    expect(mockLogAudit).toHaveBeenCalledWith(
      USER_ID,
      PROFILE_ID,
      "CREATE_INSURANCE_CARD",
      "InsuranceCard",
      CARD_ID,
      expect.objectContaining({ type: "HEALTH", insurerName: "Blue Cross" })
    );
    expect(result).toEqual(fakeCard);
  });

  it("throws 403 when caller lacks WRITE permission", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    await expect(
      createInsuranceCard(USER_ID, PROFILE_ID, { type: "HEALTH" })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ── updateInsuranceCard ────────────────────────────────────────────────────────

describe("updateInsuranceCard", () => {
  it("updates card and calls logAudit", async () => {
    const updated = { ...fakeCard, status: "INACTIVE" };
    mockUpdate.mockResolvedValue(updated);

    const result = await updateInsuranceCard(USER_ID, PROFILE_ID, CARD_ID, {
      status: "INACTIVE",
    });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: CARD_ID, profileId: PROFILE_ID },
      data: { status: "INACTIVE" },
    });
    expect(mockLogAudit).toHaveBeenCalledWith(
      USER_ID,
      PROFILE_ID,
      "UPDATE_INSURANCE_CARD",
      "InsuranceCard",
      CARD_ID
    );
    expect(result).toEqual(updated);
  });

  it("throws 403 when caller lacks WRITE permission", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    await expect(
      updateInsuranceCard(USER_ID, PROFILE_ID, CARD_ID, { status: "EXPIRED" })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ── deleteInsuranceCard ────────────────────────────────────────────────────────

describe("deleteInsuranceCard", () => {
  it("logs audit then deletes card", async () => {
    mockDelete.mockResolvedValue(fakeCard);

    await deleteInsuranceCard(USER_ID, PROFILE_ID, CARD_ID);

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockLogAudit).toHaveBeenCalledWith(
      USER_ID,
      PROFILE_ID,
      "DELETE_INSURANCE_CARD",
      "InsuranceCard",
      CARD_ID
    );
    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: CARD_ID, profileId: PROFILE_ID },
    });
  });

  it("throws 401 when caller is not authenticated", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("UNAUTHORIZED", 401));

    await expect(deleteInsuranceCard(USER_ID, PROFILE_ID, CARD_ID)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
