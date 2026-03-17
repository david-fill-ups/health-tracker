import { describe, it, expect } from "vitest";
import {
  CreateProfileSchema,
  CreateVaccinationSchema,
  CreateVisitSchema,
  ProfileAccessSchema,
  UpdateProfileAccessSchema,
  PermissionEnum,
  SexEnum,
} from "@/lib/validation";

// ── CreateProfileSchema ───────────────────────────────────────────────────────

describe("CreateProfileSchema", () => {
  const valid = { name: "Jane", birthDate: "1990-05-15", sex: "FEMALE" };

  it("accepts valid input", () => {
    const result = CreateProfileSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.birthDate).toBeInstanceOf(Date);
      expect(result.data.sex).toBe("FEMALE");
    }
  });

  it("coerces birthDate ISO string to Date", () => {
    const result = CreateProfileSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.birthDate).toBeInstanceOf(Date);
  });

  it("rejects missing name", () => {
    const result = CreateProfileSchema.safeParse({ birthDate: "1990-05-15", sex: "MALE" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = CreateProfileSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 255 chars", () => {
    const result = CreateProfileSchema.safeParse({ ...valid, name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sex value", () => {
    const result = CreateProfileSchema.safeParse({ ...valid, sex: "UNKNOWN" });
    expect(result.success).toBe(false);
  });

  it("rejects non-date birthDate string", () => {
    const result = CreateProfileSchema.safeParse({ ...valid, birthDate: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields: state and notes", () => {
    const result = CreateProfileSchema.safeParse({ ...valid, state: "CA", notes: "Healthy" });
    expect(result.success).toBe(true);
  });

  it("rejects state longer than 2 chars", () => {
    const result = CreateProfileSchema.safeParse({ ...valid, state: "CAL" });
    expect(result.success).toBe(false);
  });
});

// ── CreateVaccinationSchema ───────────────────────────────────────────────────

describe("CreateVaccinationSchema", () => {
  const valid = {
    profileId: "profile-123",
    name: "Flu",
    date: "2025-10-01",
  };

  it("accepts valid input", () => {
    const result = CreateVaccinationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.date).toBeInstanceOf(Date);
  });

  it("rejects missing profileId", () => {
    const result = CreateVaccinationSchema.safeParse({ name: "Flu", date: "2025-10-01" });
    expect(result.success).toBe(false);
  });

  it("rejects empty profileId", () => {
    const result = CreateVaccinationSchema.safeParse({ ...valid, profileId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = CreateVaccinationSchema.safeParse({ profileId: "p1", date: "2025-10-01" });
    expect(result.success).toBe(false);
  });

  it("rejects missing date", () => {
    const result = CreateVaccinationSchema.safeParse({ profileId: "p1", name: "Flu" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date string", () => {
    const result = CreateVaccinationSchema.safeParse({ ...valid, date: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("accepts optional lotNumber and notes", () => {
    const result = CreateVaccinationSchema.safeParse({
      ...valid,
      lotNumber: "LOT123",
      notes: "Left arm",
    });
    expect(result.success).toBe(true);
  });
});

// ── CreateVisitSchema — dueMonth regex ───────────────────────────────────────

describe("CreateVisitSchema dueMonth", () => {
  const base = { profileId: "profile-123" };

  it("accepts valid dueMonth format YYYY-MM", () => {
    const result = CreateVisitSchema.safeParse({ ...base, dueMonth: "2026-03" });
    expect(result.success).toBe(true);
  });

  it("accepts dueMonth with leading zero month", () => {
    const result = CreateVisitSchema.safeParse({ ...base, dueMonth: "2026-01" });
    expect(result.success).toBe(true);
  });

  it("rejects dueMonth without leading zero (YYYY-M)", () => {
    const result = CreateVisitSchema.safeParse({ ...base, dueMonth: "2026-3" });
    expect(result.success).toBe(false);
  });

  it("rejects dueMonth as 'March 2026'", () => {
    const result = CreateVisitSchema.safeParse({ ...base, dueMonth: "March 2026" });
    expect(result.success).toBe(false);
  });

  it("rejects dueMonth as full date string", () => {
    const result = CreateVisitSchema.safeParse({ ...base, dueMonth: "2026-03-15" });
    expect(result.success).toBe(false);
  });

  it("omitting dueMonth is valid", () => {
    const result = CreateVisitSchema.safeParse(base);
    expect(result.success).toBe(true);
  });
});

// ── ProfileAccessSchema ───────────────────────────────────────────────────────

describe("ProfileAccessSchema", () => {
  const valid = { email: "friend@example.com", permission: "READ_ONLY" };

  it("accepts valid input", () => {
    const result = ProfileAccessSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts WRITE permission", () => {
    const result = ProfileAccessSchema.safeParse({ ...valid, permission: "WRITE" });
    expect(result.success).toBe(true);
  });

  it("rejects bad email", () => {
    const result = ProfileAccessSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid permission value", () => {
    const result = ProfileAccessSchema.safeParse({ ...valid, permission: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = ProfileAccessSchema.safeParse({ permission: "READ_ONLY" });
    expect(result.success).toBe(false);
  });

  it("rejects missing permission", () => {
    const result = ProfileAccessSchema.safeParse({ email: "a@b.com" });
    expect(result.success).toBe(false);
  });
});

// ── UpdateProfileAccessSchema ─────────────────────────────────────────────────

describe("UpdateProfileAccessSchema", () => {
  it("accepts valid permission", () => {
    const result = UpdateProfileAccessSchema.safeParse({ permission: "WRITE" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid permission", () => {
    const result = UpdateProfileAccessSchema.safeParse({ permission: "SUPERUSER" });
    expect(result.success).toBe(false);
  });
});

// ── Enum schemas ──────────────────────────────────────────────────────────────

describe("SexEnum", () => {
  it("accepts all valid values", () => {
    for (const v of ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]) {
      expect(SexEnum.safeParse(v).success).toBe(true);
    }
  });

  it("rejects unknown value", () => {
    expect(SexEnum.safeParse("NONBINARY").success).toBe(false);
  });
});

describe("PermissionEnum", () => {
  it("accepts all valid values", () => {
    for (const v of ["OWNER", "WRITE", "READ_ONLY"]) {
      expect(PermissionEnum.safeParse(v).success).toBe(true);
    }
  });

  it("rejects unknown value", () => {
    expect(PermissionEnum.safeParse("EDIT").success).toBe(false);
  });
});

// ── Date coercion ─────────────────────────────────────────────────────────────

describe("z.coerce.date() behaviour", () => {
  it("CreateProfileSchema birthDate accepts ISO string", () => {
    const r = CreateProfileSchema.safeParse({ name: "X", birthDate: "2000-01-01T00:00:00Z", sex: "MALE" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.birthDate).toBeInstanceOf(Date);
  });

  it("CreateVaccinationSchema date accepts ISO string", () => {
    const r = CreateVaccinationSchema.safeParse({ profileId: "p1", name: "Flu", date: "2025-10-01T00:00:00.000Z" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.date).toBeInstanceOf(Date);
  });

  it("rejects non-date strings", () => {
    const r = CreateVaccinationSchema.safeParse({ profileId: "p1", name: "Flu", date: "yesterday" });
    expect(r.success).toBe(false);
  });
});
