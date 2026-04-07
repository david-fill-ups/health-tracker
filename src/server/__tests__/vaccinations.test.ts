/**
 * Server-level tests for vaccination and dose operations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionError } from "@/lib/permissions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vaccination: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
    },
    dose: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/permissions", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...original, assertProfileAccess: vi.fn() };
});

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

vi.mock("@/lib/cdc", () => ({
  getAllCanonicals: vi.fn(() => new Set<string>()),
  generateRecommendations: vi.fn(() => []),
  getCdcLastUpdated: vi.fn(() => "2025-01-01"),
}));

vi.mock("@/lib/travel", () => ({
  findDestination: vi.fn(),
  getTravelVaccineStatus: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { assertProfileAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import {
  createVaccinationRecord,
  updateVaccinationRecord,
  deleteVaccinationRecord,
  createDose,
  updateDose,
  deleteDose,
} from "@/server/vaccinations";

const mockAssertProfileAccess = assertProfileAccess as ReturnType<typeof vi.fn>;
const mockLogAudit = logAudit as ReturnType<typeof vi.fn>;
const mockVaccinationFindUnique = prisma.vaccination.findUnique as ReturnType<typeof vi.fn>;
const mockVaccinationCreate = prisma.vaccination.create as ReturnType<typeof vi.fn>;
const mockVaccinationUpdate = prisma.vaccination.update as ReturnType<typeof vi.fn>;
const mockVaccinationDelete = prisma.vaccination.delete as ReturnType<typeof vi.fn>;
const mockVaccinationUpsert = prisma.vaccination.upsert as ReturnType<typeof vi.fn>;
const mockDoseFindUnique = prisma.dose.findUnique as ReturnType<typeof vi.fn>;
const mockDoseCreate = prisma.dose.create as ReturnType<typeof vi.fn>;
const mockDoseUpdate = prisma.dose.update as ReturnType<typeof vi.fn>;
const mockDoseDelete = prisma.dose.delete as ReturnType<typeof vi.fn>;

const USER_ID = "user-1";
const PROFILE_ID = "profile-1";
const VAX_ID = "vax-1";
const DOSE_ID = "dose-1";

const fakeVaccination = {
  id: VAX_ID,
  profileId: PROFILE_ID,
  name: "Influenza",
  aliases: [],
  notes: null,
};

const fakeDose = {
  id: DOSE_ID,
  profileId: PROFILE_ID,
  date: new Date("2025-01-15"),
  source: "ADMINISTERED" as const,
  facilityId: null,
  lotNumber: null,
  notes: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAssertProfileAccess.mockResolvedValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
});

// ── createVaccinationRecord ────────────────────────────────────────────────────

describe("createVaccinationRecord", () => {
  it("creates and returns a vaccination record", async () => {
    mockVaccinationCreate.mockResolvedValue(fakeVaccination);

    const result = await createVaccinationRecord(USER_ID, PROFILE_ID, { name: "Influenza" });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockVaccinationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ profileId: PROFILE_ID, name: "Influenza" }) })
    );
    expect(mockLogAudit).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "CREATE_VACCINATION", "Vaccination", VAX_ID, expect.any(Object));
    expect(result).toEqual(fakeVaccination);
  });

  it("throws when assertProfileAccess rejects", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("Forbidden", 403));

    await expect(
      createVaccinationRecord(USER_ID, PROFILE_ID, { name: "Influenza" })
    ).rejects.toBeInstanceOf(PermissionError);
    expect(mockVaccinationCreate).not.toHaveBeenCalled();
  });
});

// ── updateVaccinationRecord ────────────────────────────────────────────────────

describe("updateVaccinationRecord", () => {
  it("updates and returns the vaccination record", async () => {
    mockVaccinationFindUnique.mockResolvedValue({ profileId: PROFILE_ID });
    mockVaccinationUpdate.mockResolvedValue({ ...fakeVaccination, name: "Flu Shot" });

    const result = await updateVaccinationRecord(USER_ID, VAX_ID, { name: "Flu Shot" });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockVaccinationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VAX_ID } })
    );
    expect(mockLogAudit).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "UPDATE_VACCINATION", "Vaccination", VAX_ID);
    expect(result.name).toBe("Flu Shot");
  });

  it("throws 'Vaccination not found' when record does not exist", async () => {
    mockVaccinationFindUnique.mockResolvedValue(null);

    await expect(
      updateVaccinationRecord(USER_ID, VAX_ID, { name: "Flu Shot" })
    ).rejects.toThrow("Vaccination not found");
    expect(mockVaccinationUpdate).not.toHaveBeenCalled();
  });
});

// ── deleteVaccinationRecord ────────────────────────────────────────────────────

describe("deleteVaccinationRecord", () => {
  it("deletes the vaccination record", async () => {
    mockVaccinationFindUnique.mockResolvedValue({ profileId: PROFILE_ID, name: "Influenza" });
    mockVaccinationDelete.mockResolvedValue(undefined);

    await deleteVaccinationRecord(USER_ID, VAX_ID);

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockLogAudit).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "DELETE_VACCINATION", "Vaccination", VAX_ID, expect.any(Object));
    expect(mockVaccinationDelete).toHaveBeenCalledWith({ where: { id: VAX_ID } });
  });

  it("throws 'Vaccination not found' when record does not exist", async () => {
    mockVaccinationFindUnique.mockResolvedValue(null);

    await expect(deleteVaccinationRecord(USER_ID, VAX_ID)).rejects.toThrow("Vaccination not found");
    expect(mockVaccinationDelete).not.toHaveBeenCalled();
  });
});

// ── createDose ─────────────────────────────────────────────────────────────────

describe("createDose", () => {
  it("upserts vaccination and creates dose", async () => {
    mockVaccinationUpsert.mockResolvedValue({ id: VAX_ID });
    mockDoseCreate.mockResolvedValue(fakeDose);

    const result = await createDose(USER_ID, PROFILE_ID, {
      vaccineName: "Influenza",
      date: new Date("2025-01-15"),
      source: "ADMINISTERED",
    });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockVaccinationUpsert).toHaveBeenCalled();
    expect(mockDoseCreate).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "CREATE_DOSE", "Dose", DOSE_ID, expect.any(Object));
    expect(result).toEqual(fakeDose);
  });

  it("throws when assertProfileAccess rejects", async () => {
    mockAssertProfileAccess.mockRejectedValue(new PermissionError("Forbidden", 403));

    await expect(
      createDose(USER_ID, PROFILE_ID, { vaccineName: "Influenza" })
    ).rejects.toBeInstanceOf(PermissionError);
    expect(mockDoseCreate).not.toHaveBeenCalled();
  });
});

// ── updateDose ─────────────────────────────────────────────────────────────────

describe("updateDose", () => {
  it("updates and returns the dose", async () => {
    mockDoseFindUnique.mockResolvedValue({ profileId: PROFILE_ID });
    mockDoseUpdate.mockResolvedValue({ ...fakeDose, notes: "Updated" });

    const result = await updateDose(USER_ID, DOSE_ID, { notes: "Updated" });

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockDoseUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DOSE_ID } })
    );
    expect(mockLogAudit).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "UPDATE_DOSE", "Dose", DOSE_ID);
    expect(result.notes).toBe("Updated");
  });

  it("throws 'Dose not found' when record does not exist", async () => {
    mockDoseFindUnique.mockResolvedValue(null);

    await expect(updateDose(USER_ID, DOSE_ID, { notes: "x" })).rejects.toThrow("Dose not found");
    expect(mockDoseUpdate).not.toHaveBeenCalled();
  });
});

// ── deleteDose ─────────────────────────────────────────────────────────────────

describe("deleteDose", () => {
  it("deletes the dose", async () => {
    mockDoseFindUnique.mockResolvedValue({ profileId: PROFILE_ID });
    mockDoseDelete.mockResolvedValue(undefined);

    await deleteDose(USER_ID, DOSE_ID);

    expect(mockAssertProfileAccess).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "WRITE");
    expect(mockLogAudit).toHaveBeenCalledWith(USER_ID, PROFILE_ID, "DELETE_DOSE", "Dose", DOSE_ID);
    expect(mockDoseDelete).toHaveBeenCalledWith({ where: { id: DOSE_ID } });
  });

  it("throws 'Dose not found' when record does not exist", async () => {
    mockDoseFindUnique.mockResolvedValue(null);

    await expect(deleteDose(USER_ID, DOSE_ID)).rejects.toThrow("Dose not found");
    expect(mockDoseDelete).not.toHaveBeenCalled();
  });
});
