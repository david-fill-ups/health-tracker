/**
 * API route tests for /api/visits and /api/visits/[id].
 *
 * Strategy: mock `@/auth` to control session, mock `@/server/visits` to
 * control business logic, then call route handlers directly and assert on
 * the returned NextResponse.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionError } from "@/lib/permissions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Prevent prisma.ts from throwing when DATABASE_URL is absent at import time
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/server/visits", () => ({
  getVisitsForProfile: vi.fn(),
  createVisit: vi.fn(),
  getVisitById: vi.fn(),
  updateVisit: vi.fn(),
  deleteVisit: vi.fn(),
}));

import { auth } from "@/auth";
import {
  getVisitsForProfile,
  createVisit,
  getVisitById,
  updateVisit,
  deleteVisit,
} from "@/server/visits";

// Import route handlers AFTER mocks are in place
import { GET as listGET, POST } from "@/app/api/visits/route";
import { GET as detailGET, PUT, DELETE } from "@/app/api/visits/[id]/route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetVisitsForProfile = getVisitsForProfile as ReturnType<typeof vi.fn>;
const mockCreateVisit = createVisit as ReturnType<typeof vi.fn>;
const mockGetVisitById = getVisitById as ReturnType<typeof vi.fn>;
const mockUpdateVisit = updateVisit as ReturnType<typeof vi.fn>;
const mockDeleteVisit = deleteVisit as ReturnType<typeof vi.fn>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): Request {
  return new Request(url, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

const PROFILE_ID = "profile-1";
const VISIT_ID = "visit-1";
const BASE_URL = "http://localhost:3000";

const fakeVisit = {
  id: VISIT_ID,
  profileId: PROFILE_ID,
  type: "ROUTINE",
  status: "COMPLETED",
  date: "2025-01-15T00:00:00.000Z",
};

const authedSession = { user: { id: "user-1" } };

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/visits ────────────────────────────────────────────────────────────

describe("GET /api/visits", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = makeRequest(`${BASE_URL}/api/visits?profileId=${PROFILE_ID}`);
    const res = await listGET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when profileId is missing", async () => {
    mockAuth.mockResolvedValue(authedSession);

    const req = makeRequest(`${BASE_URL}/api/visits`);
    const res = await listGET(req);

    expect(res.status).toBe(400);
  });

  it("returns 200 with visits array", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockGetVisitsForProfile.mockResolvedValue([fakeVisit]);

    const req = makeRequest(`${BASE_URL}/api/visits?profileId=${PROFILE_ID}`);
    const res = await listGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([fakeVisit]);
  });

  it("returns 403 when user lacks profile access", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockGetVisitsForProfile.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    const req = makeRequest(`${BASE_URL}/api/visits?profileId=${PROFILE_ID}`);
    const res = await listGET(req);

    expect(res.status).toBe(403);
  });
});

// ── POST /api/visits ───────────────────────────────────────────────────────────

describe("POST /api/visits", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = makeRequest(`${BASE_URL}/api/visits`, {
      method: "POST",
      body: { profileId: PROFILE_ID, type: "ROUTINE", status: "COMPLETED" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when body fails validation", async () => {
    mockAuth.mockResolvedValue(authedSession);

    const req = makeRequest(`${BASE_URL}/api/visits`, {
      method: "POST",
      body: { profileId: PROFILE_ID, type: "NOT_A_VALID_TYPE" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 201 with the created visit", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockCreateVisit.mockResolvedValue(fakeVisit);

    const req = makeRequest(`${BASE_URL}/api/visits`, {
      method: "POST",
      body: { profileId: PROFILE_ID, type: "ROUTINE", status: "COMPLETED" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe(VISIT_ID);
  });

  it("returns 403 when user lacks OWNER permission", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockCreateVisit.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    const req = makeRequest(`${BASE_URL}/api/visits`, {
      method: "POST",
      body: { profileId: PROFILE_ID, type: "ROUTINE", status: "COMPLETED" },
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });
});

// ── GET /api/visits/[id] ───────────────────────────────────────────────────────

describe("GET /api/visits/[id]", () => {
  const params = Promise.resolve({ id: VISIT_ID });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = makeRequest(`${BASE_URL}/api/visits/${VISIT_ID}?profileId=${PROFILE_ID}`);
    const res = await detailGET(req, { params });

    expect(res.status).toBe(401);
  });

  it("returns 404 when visit is not found", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockGetVisitById.mockResolvedValue(null);

    const req = makeRequest(`${BASE_URL}/api/visits/${VISIT_ID}?profileId=${PROFILE_ID}`);
    const res = await detailGET(req, { params });

    expect(res.status).toBe(404);
  });

  it("returns 200 with the visit", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockGetVisitById.mockResolvedValue(fakeVisit);

    const req = makeRequest(`${BASE_URL}/api/visits/${VISIT_ID}?profileId=${PROFILE_ID}`);
    const res = await detailGET(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(VISIT_ID);
  });
});

// ── PUT /api/visits/[id] ───────────────────────────────────────────────────────

describe("PUT /api/visits/[id]", () => {
  const params = Promise.resolve({ id: VISIT_ID });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = makeRequest(`${BASE_URL}/api/visits/${VISIT_ID}?profileId=${PROFILE_ID}`, {
      method: "PUT",
      body: { status: "CANCELLED" },
    });
    const res = await PUT(req, { params });

    expect(res.status).toBe(401);
  });

  it("returns 200 with the updated visit", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockUpdateVisit.mockResolvedValue({ ...fakeVisit, status: "CANCELLED" });

    const req = makeRequest(`${BASE_URL}/api/visits/${VISIT_ID}?profileId=${PROFILE_ID}`, {
      method: "PUT",
      body: { status: "CANCELLED" },
    });
    const res = await PUT(req, { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("CANCELLED");
  });
});

// ── DELETE /api/visits/[id] ────────────────────────────────────────────────────

describe("DELETE /api/visits/[id]", () => {
  const params = Promise.resolve({ id: VISIT_ID });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = makeRequest(
      `${BASE_URL}/api/visits/${VISIT_ID}?profileId=${PROFILE_ID}`,
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });

    expect(res.status).toBe(401);
  });

  it("returns 204 on successful delete", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockDeleteVisit.mockResolvedValue(undefined);

    const req = makeRequest(
      `${BASE_URL}/api/visits/${VISIT_ID}?profileId=${PROFILE_ID}`,
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });

    expect(res.status).toBe(204);
  });

  it("returns 403 when user lacks OWNER permission", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockDeleteVisit.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    const req = makeRequest(
      `${BASE_URL}/api/visits/${VISIT_ID}?profileId=${PROFILE_ID}`,
      { method: "DELETE" }
    );
    const res = await DELETE(req, { params });

    expect(res.status).toBe(403);
  });
});
