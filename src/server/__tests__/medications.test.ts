import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionError } from "@/lib/permissions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    medication: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    medicationLog: {
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
  getMedicationLogs,
  createMedicationLog,
  deleteMedicationLog,
} from "@/server/medications";

const mockAssertProfileAccess = assertProfileAccess as ReturnType<typeof vi.fn>;
const mockLogAudit = logAudit as ReturnType<typeof vi.fn>;
const mockMedicationFindUnique = prisma.medication.findUnique as ReturnType<typeof vi.fn>;
const mockLogFindMany = prisma.medicationLog.findMany as ReturnType<typeof vi.fn>;
const mockLogFindFirst = prisma.medicationLog.findFirst as ReturnType<typeof vi.fn>;
const mockLogCreate = prisma.medicationLog.create as ReturnType<typeof vi.fn>;
const mockLogDelete = prisma.medicationLog.delete as ReturnType<typeof vi.fn>;

const USER_ID = "user-1";
const PROFILE_ID = "profile-1";
const MED_ID = "med-1";
const LOG_ID = "log-1";

const fakeMedication = { id: MED_ID, profileId: PROFILE_ID, name: "Ozempic" };
const fakeLog = {
  id: LOG_ID,
  medicationId: MED_ID,
  date: new Date("2025-03-01"),
  dosage: 0.5,
  unit: "mg",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAssertProfileAccess.mockResolvedValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
});

// ── getMedicationLogs ──────────────────────────────────────────────────────────

describe("getMedicationLogs", () => {
  it("returns logs sorted descending by date", async () => {
    mockLogFindMany.mockResolvedValue([fakeLog]);

    const result = await getMedicationLogs(USER_ID, PROFILE_ID, MED_ID);

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID);
    expect(mockLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { medicationId: MED_ID, medication: { profileId: PROFILE_ID } },
        orderBy: { date: "desc" },
      })
    );
    expect(result).toEqual([fakeLog]);
  });

  it("propagates PermissionError when caller lacks READ access", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("UNAUTHORIZED", 401));

    await expect(getMedicationLogs(USER_ID, PROFILE_ID, MED_ID)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

// ── createMedicationLog ────────────────────────────────────────────────────────

describe("createMedicationLog", () => {
  it("creates log and calls logAudit", async () => {
    mockMedicationFindUnique.mockResolvedValue(fakeMedication);
    mockLogCreate.mockResolvedValue(fakeLog);

    const result = await createMedicationLog(USER_ID, PROFILE_ID, MED_ID, {
      date: new Date("2025-03-01"),
      dosage: 0.5,
      unit: "mg",
    });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "OWNER");
    expect(mockLogCreate).toHaveBeenCalledOnce();
    expect(mockLogAudit).toHaveBeenCalledWith(
      USER_ID,
      PROFILE_ID,
      "CREATE_MEDICATION_LOG",
      "MedicationLog",
      LOG_ID,
      expect.objectContaining({ medicationId: MED_ID })
    );
    expect(result).toEqual(fakeLog);
  });

  it("throws 403 when medication belongs to a different profile", async () => {
    mockMedicationFindUnique.mockResolvedValue(null); // not found for this profileId

    await expect(
      createMedicationLog(USER_ID, PROFILE_ID, MED_ID, { date: new Date() })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockLogCreate).not.toHaveBeenCalled();
  });

  it("throws 403 when caller lacks OWNER permission", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    await expect(
      createMedicationLog(USER_ID, PROFILE_ID, MED_ID, { date: new Date() })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── deleteMedicationLog ────────────────────────────────────────────────────────

describe("deleteMedicationLog", () => {
  it("deletes log and calls logAudit", async () => {
    mockLogFindFirst.mockResolvedValue(fakeLog);
    mockLogDelete.mockResolvedValue(fakeLog);

    await deleteMedicationLog(USER_ID, PROFILE_ID, MED_ID, LOG_ID);

    expect(mockLogAudit).toHaveBeenCalledWith(
      USER_ID,
      PROFILE_ID,
      "DELETE_MEDICATION_LOG",
      "MedicationLog",
      LOG_ID,
      expect.objectContaining({ medicationId: MED_ID })
    );
    expect(mockLogDelete).toHaveBeenCalledWith({ where: { id: LOG_ID } });
  });

  it("throws 403 when log does not exist for this medication/profile", async () => {
    mockLogFindFirst.mockResolvedValue(null);

    await expect(
      deleteMedicationLog(USER_ID, PROFILE_ID, MED_ID, LOG_ID)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mockLogDelete).not.toHaveBeenCalled();
  });
});
