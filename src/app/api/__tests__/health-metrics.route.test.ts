/**
 * API route tests for /api/health-metrics.
 * Covers: auth check, profileId validation, permission enforcement, success paths.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionError } from "@/lib/permissions";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Prevent prisma.ts from throwing when DATABASE_URL is absent at import time
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/server/health-metrics", () => ({
  getHealthMetricsForProfile: vi.fn(),
  createHealthMetric: vi.fn(),
}));

import { auth } from "@/auth";
import {
  getHealthMetricsForProfile,
  createHealthMetric,
} from "@/server/health-metrics";

import { GET, POST } from "@/app/api/health-metrics/route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetMetrics = getHealthMetricsForProfile as ReturnType<typeof vi.fn>;
const mockCreateMetric = createHealthMetric as ReturnType<typeof vi.fn>;

const PROFILE_ID = "profile-1";
const BASE_URL = "http://localhost:3000";
const authedSession = { user: { id: "user-1" } };

const fakeMetric = {
  id: "metric-1",
  profileId: PROFILE_ID,
  metricType: "Weight",
  value: 75.5,
  unit: "kg",
  measuredAt: "2025-03-01T08:00:00.000Z",
};

function makeRequest(url: string, options: { method?: string; body?: unknown } = {}): Request {
  return new Request(url, {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/health-metrics ────────────────────────────────────────────────────

describe("GET /api/health-metrics", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeRequest(`${BASE_URL}/api/health-metrics?profileId=${PROFILE_ID}`));

    expect(res.status).toBe(401);
  });

  it("returns 400 when profileId is missing", async () => {
    mockAuth.mockResolvedValue(authedSession);

    const res = await GET(makeRequest(`${BASE_URL}/api/health-metrics`));

    expect(res.status).toBe(400);
  });

  it("returns 200 with metrics array", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockGetMetrics.mockResolvedValue([fakeMetric]);

    const res = await GET(
      makeRequest(`${BASE_URL}/api/health-metrics?profileId=${PROFILE_ID}`)
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([fakeMetric]);
    expect(mockGetMetrics).toHaveBeenCalledWith("user-1", PROFILE_ID, undefined);
  });

  it("passes metricType filter to server function", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockGetMetrics.mockResolvedValue([fakeMetric]);

    const res = await GET(
      makeRequest(`${BASE_URL}/api/health-metrics?profileId=${PROFILE_ID}&metricType=Weight`)
    );

    expect(res.status).toBe(200);
    expect(mockGetMetrics).toHaveBeenCalledWith("user-1", PROFILE_ID, "Weight");
  });

  it("returns 403 when user lacks profile access", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockGetMetrics.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    const res = await GET(
      makeRequest(`${BASE_URL}/api/health-metrics?profileId=${PROFILE_ID}`)
    );

    expect(res.status).toBe(403);
  });
});

// ── POST /api/health-metrics ───────────────────────────────────────────────────

describe("POST /api/health-metrics", () => {
  const validBody = {
    profileId: PROFILE_ID,
    metricType: "Weight",
    value: 75.5,
    unit: "kg",
    measuredAt: "2025-03-01T08:00:00.000Z",
  };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      makeRequest(`${BASE_URL}/api/health-metrics`, { method: "POST", body: validBody })
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue(authedSession);

    const res = await POST(
      makeRequest(`${BASE_URL}/api/health-metrics`, {
        method: "POST",
        body: { profileId: PROFILE_ID }, // missing metricType, value, unit, measuredAt
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request");
    expect(body.details).toBeDefined();
  });

  it("returns 201 with the created metric", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockCreateMetric.mockResolvedValue(fakeMetric);

    const res = await POST(
      makeRequest(`${BASE_URL}/api/health-metrics`, { method: "POST", body: validBody })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("metric-1");
    expect(body.metricType).toBe("Weight");
  });

  it("returns 403 when user lacks OWNER permission", async () => {
    mockAuth.mockResolvedValue(authedSession);
    mockCreateMetric.mockRejectedValue(new PermissionError("FORBIDDEN", 403));

    const res = await POST(
      makeRequest(`${BASE_URL}/api/health-metrics`, { method: "POST", body: validBody })
    );

    expect(res.status).toBe(403);
  });
});
