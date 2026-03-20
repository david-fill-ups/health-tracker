import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertProfileAccess, hasProfileAccess, PermissionError } from "@/lib/permissions";

// Mock Prisma so tests don't need a real DB
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profileAccess: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.profileAccess.findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assertProfileAccess", () => {
  it("throws 401 when no access record exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(assertProfileAccess("user-1", "profile-1")).rejects.toThrow(PermissionError);
    await expect(assertProfileAccess("user-1", "profile-1")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("allows READ_ONLY when required is READ_ONLY (default)", async () => {
    mockFindUnique.mockResolvedValue({ permission: "READ_ONLY" });
    await expect(assertProfileAccess("user-1", "profile-1")).resolves.toBeUndefined();
  });

  it("allows WRITE when required is READ_ONLY", async () => {
    mockFindUnique.mockResolvedValue({ permission: "WRITE" });
    await expect(assertProfileAccess("user-1", "profile-1", "READ_ONLY")).resolves.toBeUndefined();
  });

  it("allows OWNER when required is WRITE", async () => {
    mockFindUnique.mockResolvedValue({ permission: "OWNER" });
    await expect(assertProfileAccess("user-1", "profile-1", "WRITE")).resolves.toBeUndefined();
  });

  it("throws 403 when READ_ONLY tries to access WRITE endpoint", async () => {
    mockFindUnique.mockResolvedValue({ permission: "READ_ONLY" });
    await expect(assertProfileAccess("user-1", "profile-1", "WRITE")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("throws 403 when WRITE tries to access OWNER endpoint", async () => {
    mockFindUnique.mockResolvedValue({ permission: "WRITE" });
    await expect(assertProfileAccess("user-1", "profile-1", "OWNER")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("throws 403 when READ_ONLY tries to access OWNER endpoint", async () => {
    mockFindUnique.mockResolvedValue({ permission: "READ_ONLY" });
    await expect(assertProfileAccess("user-1", "profile-1", "OWNER")).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("allows OWNER when required is OWNER", async () => {
    mockFindUnique.mockResolvedValue({ permission: "OWNER" });
    await expect(assertProfileAccess("user-1", "profile-1", "OWNER")).resolves.toBeUndefined();
  });
});

describe("hasProfileAccess", () => {
  it("returns false when no access record", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await hasProfileAccess("user-1", "profile-1")).toBe(false);
  });

  it("returns true when permission is sufficient", async () => {
    mockFindUnique.mockResolvedValue({ permission: "OWNER" });
    expect(await hasProfileAccess("user-1", "profile-1", "WRITE")).toBe(true);
  });

  it("returns false when permission is insufficient", async () => {
    mockFindUnique.mockResolvedValue({ permission: "READ_ONLY" });
    expect(await hasProfileAccess("user-1", "profile-1", "OWNER")).toBe(false);
  });
});
