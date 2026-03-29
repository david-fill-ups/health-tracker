import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionError } from "@/lib/permissions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    visit: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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
  getVisitsForProfile,
  getVisitById,
  createVisit,
  updateVisit,
  deleteVisit,
} from "@/server/visits";

const mockAssertProfileAccess = assertProfileAccess as ReturnType<typeof vi.fn>;
const mockLogAudit = logAudit as ReturnType<typeof vi.fn>;
const mockVisitFindMany = prisma.visit.findMany as ReturnType<typeof vi.fn>;
const mockVisitFindUnique = prisma.visit.findUnique as ReturnType<typeof vi.fn>;
const mockVisitCreate = prisma.visit.create as ReturnType<typeof vi.fn>;
const mockVisitUpdate = prisma.visit.update as ReturnType<typeof vi.fn>;
const mockVisitDelete = prisma.visit.delete as ReturnType<typeof vi.fn>;

const USER_ID = "user-1";
const PROFILE_ID = "profile-1";
const VISIT_ID = "visit-1";

const fakeVisit = {
  id: VISIT_ID,
  profileId: PROFILE_ID,
  type: "ROUTINE",
  status: "COMPLETED",
  date: new Date("2025-01-15"),
  doctor: null,
  facility: null,
  location: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAssertProfileAccess.mockResolvedValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
});

// ── getVisitsForProfile ────────────────────────────────────────────────────────

describe("getVisitsForProfile", () => {
  it("calls assertProfileAccess and returns visits", async () => {
    mockVisitFindMany.mockResolvedValue([fakeVisit]);

    const result = await getVisitsForProfile(USER_ID, PROFILE_ID);

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID);
    expect(result).toEqual([fakeVisit]);
  });

  it("propagates PermissionError from assertProfileAccess", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("UNAUTHORIZED", 401));

    await expect(getVisitsForProfile(USER_ID, PROFILE_ID)).rejects.toThrow(PermissionError);
  });
});

// ── getVisitById ───────────────────────────────────────────────────────────────

describe("getVisitById", () => {
  it("returns the visit when found", async () => {
    mockVisitFindUnique.mockResolvedValue(fakeVisit);

    const result = await getVisitById(USER_ID, PROFILE_ID, VISIT_ID);

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID);
    expect(result).toEqual(fakeVisit);
  });

  it("returns null when visit does not exist", async () => {
    mockVisitFindUnique.mockResolvedValue(null);

    const result = await getVisitById(USER_ID, PROFILE_ID, VISIT_ID);
    expect(result).toBeNull();
  });
});

// ── createVisit ────────────────────────────────────────────────────────────────

describe("createVisit", () => {
  it("creates visit, calls logAudit, and returns the created record", async () => {
    mockVisitCreate.mockResolvedValue(fakeVisit);

    const result = await createVisit(USER_ID, PROFILE_ID, {
      type: "ROUTINE",
      status: "COMPLETED",
    });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockVisitCreate).toHaveBeenCalledOnce();
    expect(mockLogAudit).toHaveBeenCalledWith(
      USER_ID,
      PROFILE_ID,
      "CREATE_VISIT",
      "Visit",
      VISIT_ID,
      expect.any(Object)
    );
    expect(result).toEqual(fakeVisit);
  });

  it("requires OWNER permission (propagates 403 for non-owner)", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    await expect(
      createVisit(USER_ID, PROFILE_ID, { type: "ROUTINE" })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── updateVisit ────────────────────────────────────────────────────────────────

describe("updateVisit", () => {
  it("updates visit, calls logAudit, and returns updated record", async () => {
    const updated = { ...fakeVisit, status: "CANCELLED" };
    mockVisitUpdate.mockResolvedValue(updated);

    const result = await updateVisit(USER_ID, PROFILE_ID, VISIT_ID, { status: "CANCELLED" });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockVisitUpdate).toHaveBeenCalledOnce();
    expect(mockLogAudit).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "UPDATE_VISIT", "Visit", VISIT_ID);
    expect(result.status).toBe("CANCELLED");
  });
});

// ── deleteVisit ────────────────────────────────────────────────────────────────

describe("deleteVisit", () => {
  it("calls logAudit before deleting", async () => {
    mockVisitDelete.mockResolvedValue(fakeVisit);

    await deleteVisit(USER_ID, PROFILE_ID, VISIT_ID);

    expect(mockLogAudit).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "DELETE_VISIT", "Visit", VISIT_ID);
    expect(mockVisitDelete).toHaveBeenCalledWith({
      where: { id: VISIT_ID, profileId: PROFILE_ID },
    });
  });

  it("requires OWNER permission", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    await expect(deleteVisit(USER_ID, PROFILE_ID, VISIT_ID)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockVisitDelete).not.toHaveBeenCalled();
  });
});
