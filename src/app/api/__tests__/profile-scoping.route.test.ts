/**
 * Tests that all detail-route GET handlers enforce the profileId query param
 * and return 404 when the requested resource belongs to a different profile.
 *
 * Strategy: mock `@/auth` (session) and the underlying data sources
 * (prisma / server functions), then call route handlers directly and assert
 * on the returned NextResponse status codes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Prevent prisma.ts from throwing when DATABASE_URL is absent at import time
vi.mock("@/lib/prisma", () => ({
  prisma: {
    doctor: { findFirst: vi.fn() },
    facility: { findFirst: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/server/vaccinations", () => ({
  getVaccinationById: vi.fn(),
  getDoseById: vi.fn(),
  // Stubs for other exports consumed by the route files
  createVaccinationRecord: vi.fn(),
  updateVaccinationRecord: vi.fn(),
  deleteVaccinationRecord: vi.fn(),
  createDose: vi.fn(),
  updateDose: vi.fn(),
  deleteDose: vi.fn(),
  getVaccinationsForProfile: vi.fn(),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────────

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getVaccinationById, getDoseById } from "@/server/vaccinations";

import { GET as doctorDetailGET } from "@/app/api/doctors/[id]/route";
import { GET as facilityDetailGET } from "@/app/api/facilities/[id]/route";
import { GET as vaccinationDetailGET } from "@/app/api/vaccinations/[id]/route";
import { GET as doseDetailGET } from "@/app/api/vaccinations/doses/[id]/route";

// ── Type-cast mocks ────────────────────────────────────────────────────────────

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockDoctorFindFirst = prisma.doctor.findFirst as ReturnType<typeof vi.fn>;
const mockFacilityFindFirst = prisma.facility.findFirst as ReturnType<typeof vi.fn>;
const mockGetVaccinationById = getVaccinationById as ReturnType<typeof vi.fn>;
const mockGetDoseById = getDoseById as ReturnType<typeof vi.fn>;

// ── Constants & helpers ────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:3000";
const PROFILE_ID = "profile-1";
const OTHER_PROFILE_ID = "profile-2";
const DOCTOR_ID = "doctor-1";
const FACILITY_ID = "facility-1";
const VACCINATION_ID = "vaccination-1";
const DOSE_ID = "dose-1";

const authedSession = { user: { id: "user-1" } };

/** NextRequest works for both plain-Request and NextRequest route handlers. */
function req(path: string): NextRequest {
  return new NextRequest(`${BASE_URL}${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(authedSession);
});

// ── GET /api/doctors/[id] ─────────────────────────────────────────────────────

describe("GET /api/doctors/[id]", () => {
  const params = Promise.resolve({ id: DOCTOR_ID });

  const fakeDoctor = {
    id: DOCTOR_ID,
    profileId: PROFILE_ID,
    name: "Dr. Smith",
    visits: [],
    _count: { visits: 0 },
    facility: null,
  };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await doctorDetailGET(
      req(`/api/doctors/${DOCTOR_ID}?profileId=${PROFILE_ID}`),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when profileId query param is missing", async () => {
    const res = await doctorDetailGET(
      req(`/api/doctors/${DOCTOR_ID}`),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when doctor belongs to a different profile", async () => {
    // findFirst returns null because the WHERE clause filters by profileId
    mockDoctorFindFirst.mockResolvedValue(null);

    const res = await doctorDetailGET(
      req(`/api/doctors/${DOCTOR_ID}?profileId=${OTHER_PROFILE_ID}`),
      { params }
    );

    expect(res.status).toBe(404);
    expect(mockDoctorFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ profileId: OTHER_PROFILE_ID }),
      })
    );
  });

  it("returns 200 with doctor data when profileId matches", async () => {
    mockDoctorFindFirst.mockResolvedValue(fakeDoctor);

    const res = await doctorDetailGET(
      req(`/api/doctors/${DOCTOR_ID}?profileId=${PROFILE_ID}`),
      { params }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(DOCTOR_ID);
    expect(mockDoctorFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: DOCTOR_ID, profileId: PROFILE_ID }),
      })
    );
  });
});

// ── GET /api/facilities/[id] ──────────────────────────────────────────────────

describe("GET /api/facilities/[id]", () => {
  const params = Promise.resolve({ id: FACILITY_ID });

  const fakeFacility = {
    id: FACILITY_ID,
    profileId: PROFILE_ID,
    name: "City Clinic",
    visits: [],
    doctors: [],
    locations: [],
    _count: { visits: 0 },
  };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await facilityDetailGET(
      req(`/api/facilities/${FACILITY_ID}?profileId=${PROFILE_ID}`),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when profileId query param is missing", async () => {
    const res = await facilityDetailGET(
      req(`/api/facilities/${FACILITY_ID}`),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when facility belongs to a different profile", async () => {
    mockFacilityFindFirst.mockResolvedValue(null);

    const res = await facilityDetailGET(
      req(`/api/facilities/${FACILITY_ID}?profileId=${OTHER_PROFILE_ID}`),
      { params }
    );

    expect(res.status).toBe(404);
    expect(mockFacilityFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ profileId: OTHER_PROFILE_ID }),
      })
    );
  });

  it("returns 200 with facility data when profileId matches", async () => {
    mockFacilityFindFirst.mockResolvedValue(fakeFacility);

    const res = await facilityDetailGET(
      req(`/api/facilities/${FACILITY_ID}?profileId=${PROFILE_ID}`),
      { params }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(FACILITY_ID);
    expect(mockFacilityFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: FACILITY_ID, profileId: PROFILE_ID }),
      })
    );
  });
});

// ── GET /api/vaccinations/[id] ────────────────────────────────────────────────

describe("GET /api/vaccinations/[id]", () => {
  const params = Promise.resolve({ id: VACCINATION_ID });

  const fakeVaccination = {
    id: VACCINATION_ID,
    profileId: PROFILE_ID,
    name: "Flu Shot",
    doses: [],
  };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await vaccinationDetailGET(
      req(`/api/vaccinations/${VACCINATION_ID}?profileId=${PROFILE_ID}`),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when profileId query param is missing", async () => {
    const res = await vaccinationDetailGET(
      req(`/api/vaccinations/${VACCINATION_ID}`),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when vaccination belongs to a different profile", async () => {
    // Server function returns the vaccination (user has access to its profile),
    // but the profileId doesn't match the active profile — route returns 404.
    mockGetVaccinationById.mockResolvedValue({ ...fakeVaccination, profileId: PROFILE_ID });

    const res = await vaccinationDetailGET(
      req(`/api/vaccinations/${VACCINATION_ID}?profileId=${OTHER_PROFILE_ID}`),
      { params }
    );

    expect(res.status).toBe(404);
  });

  it("returns 200 with vaccination data when profileId matches", async () => {
    mockGetVaccinationById.mockResolvedValue(fakeVaccination);

    const res = await vaccinationDetailGET(
      req(`/api/vaccinations/${VACCINATION_ID}?profileId=${PROFILE_ID}`),
      { params }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(VACCINATION_ID);
  });
});

// ── GET /api/vaccinations/doses/[id] ─────────────────────────────────────────

describe("GET /api/vaccinations/doses/[id]", () => {
  const params = Promise.resolve({ id: DOSE_ID });

  const fakeDose = {
    id: DOSE_ID,
    profileId: PROFILE_ID,
    date: "2024-10-01",
    vaccination: null,
  };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await doseDetailGET(
      req(`/api/vaccinations/doses/${DOSE_ID}?profileId=${PROFILE_ID}`),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when profileId query param is missing", async () => {
    const res = await doseDetailGET(
      req(`/api/vaccinations/doses/${DOSE_ID}`),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when dose belongs to a different profile", async () => {
    // getDoseById succeeds (user has access) but profileId doesn't match active profile
    mockGetDoseById.mockResolvedValue({ ...fakeDose, profileId: PROFILE_ID });

    const res = await doseDetailGET(
      req(`/api/vaccinations/doses/${DOSE_ID}?profileId=${OTHER_PROFILE_ID}`),
      { params }
    );

    expect(res.status).toBe(404);
  });

  it("returns 200 with dose data when profileId matches", async () => {
    mockGetDoseById.mockResolvedValue(fakeDose);

    const res = await doseDetailGET(
      req(`/api/vaccinations/doses/${DOSE_ID}?profileId=${PROFILE_ID}`),
      { params }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(DOSE_ID);
  });
});
