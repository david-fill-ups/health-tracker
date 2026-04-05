import { describe, it, expect } from "vitest";
import {
  CreateProfileSchema,
  CreateVaccinationSchema,
  UpdateVaccinationSchema,
  CreateDoseSchema,
  UpdateDoseSchema,
  CreateVisitSchema,
  ProfileAccessSchema,
  UpdateProfileAccessSchema,
  UpdateProfileSchema,
  UpdateVisitSchema,
  UpdateMedicationSchema,
  UpdateConditionSchema,
  UpdateFacilitySchema,
  CreateDoctorSchema,
  UpdateDoctorSchema,
  UpdateLocationSchema,
  PermissionEnum,
  SexEnum,
  CreateAllergySchema,
  UpdateAllergySchema,
  CreatePortalSchema,
  UpdatePortalSchema,
  CreateHealthMetricSchema,
  UpdateHealthMetricSchema,
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
  };

  it("accepts valid input", () => {
    const result = CreateVaccinationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing profileId", () => {
    const result = CreateVaccinationSchema.safeParse({ name: "Flu" });
    expect(result.success).toBe(false);
  });

  it("rejects empty profileId", () => {
    const result = CreateVaccinationSchema.safeParse({ ...valid, profileId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = CreateVaccinationSchema.safeParse({ profileId: "p1" });
    expect(result.success).toBe(false);
  });

  it("accepts optional aliases and notes", () => {
    const result = CreateVaccinationSchema.safeParse({
      ...valid,
      aliases: ["Influenza"],
      notes: "Annual",
    });
    expect(result.success).toBe(true);
  });
});

// ── CreateDoseSchema ──────────────────────────────────────────────────────────

describe("CreateDoseSchema", () => {
  const valid = {
    profileId: "profile-123",
    vaccineName: "Flu",
    date: "2025-10-01",
  };

  it("accepts valid input", () => {
    const result = CreateDoseSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.date).toBeInstanceOf(Date);
  });

  it("rejects missing profileId", () => {
    expect(CreateDoseSchema.safeParse({ vaccineName: "Flu", date: "2025-10-01" }).success).toBe(false);
  });

  it("rejects missing vaccineName", () => {
    expect(CreateDoseSchema.safeParse({ profileId: "p1", date: "2025-10-01" }).success).toBe(false);
  });

  it("rejects missing date", () => {
    expect(CreateDoseSchema.safeParse({ profileId: "p1", vaccineName: "Flu" }).success).toBe(false);
  });

  it("rejects invalid date string", () => {
    expect(CreateDoseSchema.safeParse({ ...valid, date: "not-a-date" }).success).toBe(false);
  });

  it("accepts optional lotNumber and notes", () => {
    const result = CreateDoseSchema.safeParse({ ...valid, lotNumber: "LOT123", notes: "Left arm" });
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

// ── Update schemas (partial) ──────────────────────────────────────────────────

describe("UpdateProfileSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only name", () => {
    expect(UpdateProfileSchema.safeParse({ name: "Bob" }).success).toBe(true);
  });

  it("coerces birthDate in partial update", () => {
    const r = UpdateProfileSchema.safeParse({ birthDate: "1985-06-20" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.birthDate).toBeInstanceOf(Date);
  });

  it("rejects invalid sex in partial update", () => {
    expect(UpdateProfileSchema.safeParse({ sex: "INVALID" }).success).toBe(false);
  });

  it("rejects empty name in partial update", () => {
    expect(UpdateProfileSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects state longer than 2 chars in partial update", () => {
    expect(UpdateProfileSchema.safeParse({ state: "CAL" }).success).toBe(false);
  });
});

describe("UpdateVaccinationSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateVaccinationSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only name", () => {
    expect(UpdateVaccinationSchema.safeParse({ name: "MMR" }).success).toBe(true);
  });

  it("accepts aliases array", () => {
    expect(UpdateVaccinationSchema.safeParse({ aliases: ["MMR-II"] }).success).toBe(true);
  });

  it("accepts null notes (clearing a field)", () => {
    expect(UpdateVaccinationSchema.safeParse({ notes: null }).success).toBe(true);
  });
});

describe("UpdateDoseSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateDoseSchema.safeParse({}).success).toBe(true);
  });

  it("coerces date in partial update", () => {
    const r = UpdateDoseSchema.safeParse({ date: "2024-09-01" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.date).toBeInstanceOf(Date);
  });

  it("rejects invalid date string", () => {
    expect(UpdateDoseSchema.safeParse({ date: "not-a-date" }).success).toBe(false);
  });

  it("accepts null lotNumber (clearing a field)", () => {
    expect(UpdateDoseSchema.safeParse({ lotNumber: null }).success).toBe(true);
  });
});

describe("UpdateVisitSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateVisitSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only status", () => {
    expect(UpdateVisitSchema.safeParse({ status: "COMPLETED" }).success).toBe(true);
  });

  it("rejects invalid status value", () => {
    expect(UpdateVisitSchema.safeParse({ status: "UNKNOWN" }).success).toBe(false);
  });

  it("rejects invalid dueMonth format", () => {
    expect(UpdateVisitSchema.safeParse({ dueMonth: "2026-3" }).success).toBe(false);
  });

  it("accepts valid dueMonth YYYY-MM", () => {
    expect(UpdateVisitSchema.safeParse({ dueMonth: "2026-06" }).success).toBe(true);
  });
});

// ── CreateVisitSchema — reason + specialty ────────────────────────────────────

describe("CreateVisitSchema reason and specialty", () => {
  const base = { profileId: "profile-123" };

  it("accepts reason field", () => {
    expect(CreateVisitSchema.safeParse({ ...base, reason: "Annual physical" }).success).toBe(true);
  });

  it("accepts specialty field", () => {
    expect(CreateVisitSchema.safeParse({ ...base, specialty: "Dental" }).success).toBe(true);
  });

  it("accepts both reason and specialty together", () => {
    expect(
      CreateVisitSchema.safeParse({ ...base, reason: "Tooth extraction", specialty: "Dental" }).success
    ).toBe(true);
  });

  it("omitting reason and specialty is valid", () => {
    expect(CreateVisitSchema.safeParse(base).success).toBe(true);
  });

  it("rejects reason exceeding 500 chars", () => {
    expect(
      CreateVisitSchema.safeParse({ ...base, reason: "x".repeat(501) }).success
    ).toBe(false);
  });

  it("accepts reason at exactly 500 chars", () => {
    expect(
      CreateVisitSchema.safeParse({ ...base, reason: "x".repeat(500) }).success
    ).toBe(true);
  });

  it("rejects specialty exceeding 255 chars", () => {
    expect(
      CreateVisitSchema.safeParse({ ...base, specialty: "x".repeat(256) }).success
    ).toBe(false);
  });

  it("accepts specialty at exactly 255 chars", () => {
    expect(
      CreateVisitSchema.safeParse({ ...base, specialty: "x".repeat(255) }).success
    ).toBe(true);
  });
});

describe("UpdateVisitSchema reason and specialty", () => {
  it("accepts partial update with only reason", () => {
    expect(UpdateVisitSchema.safeParse({ reason: "Follow-up" }).success).toBe(true);
  });

  it("accepts partial update with only specialty", () => {
    expect(UpdateVisitSchema.safeParse({ specialty: "PCP" }).success).toBe(true);
  });

  it("rejects reason exceeding 500 chars", () => {
    expect(UpdateVisitSchema.safeParse({ reason: "x".repeat(501) }).success).toBe(false);
  });

  it("rejects specialty exceeding 255 chars", () => {
    expect(UpdateVisitSchema.safeParse({ specialty: "x".repeat(256) }).success).toBe(false);
  });
});

describe("UpdateMedicationSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateMedicationSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only active flag", () => {
    expect(UpdateMedicationSchema.safeParse({ active: false }).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(UpdateMedicationSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("UpdateConditionSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateConditionSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only status", () => {
    expect(UpdateConditionSchema.safeParse({ status: "RESOLVED" }).success).toBe(true);
  });

  it("rejects invalid status value", () => {
    expect(UpdateConditionSchema.safeParse({ status: "CURED" }).success).toBe(false);
  });
});

describe("UpdateFacilitySchema", () => {
  it("accepts empty object", () => {
    expect(UpdateFacilitySchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only name", () => {
    expect(UpdateFacilitySchema.safeParse({ name: "City Clinic" }).success).toBe(true);
  });

  it("accepts any non-empty type string", () => {
    expect(UpdateFacilitySchema.safeParse({ type: "GYM" }).success).toBe(true);
  });

  it("rejects empty type string", () => {
    expect(UpdateFacilitySchema.safeParse({ type: "" }).success).toBe(false);
  });
});

describe("UpdateDoctorSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateDoctorSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only specialty", () => {
    expect(UpdateDoctorSchema.safeParse({ specialty: "Cardiology" }).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(UpdateDoctorSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

// ── CreateDoctorSchema / UpdateDoctorSchema — notes field ────────────────────

describe("CreateDoctorSchema notes", () => {
  const base = { name: "Dr. Smith" };

  it("accepts notes field", () => {
    expect(CreateDoctorSchema.safeParse({ ...base, notes: "Retired as of 2025" }).success).toBe(true);
  });

  it("omitting notes is valid", () => {
    expect(CreateDoctorSchema.safeParse(base).success).toBe(true);
  });

  it("rejects notes exceeding 2000 chars", () => {
    expect(CreateDoctorSchema.safeParse({ ...base, notes: "x".repeat(2001) }).success).toBe(false);
  });

  it("accepts notes at exactly 2000 chars", () => {
    expect(CreateDoctorSchema.safeParse({ ...base, notes: "x".repeat(2000) }).success).toBe(true);
  });
});

describe("UpdateDoctorSchema notes", () => {
  it("accepts partial update with only notes", () => {
    expect(UpdateDoctorSchema.safeParse({ notes: "Retired" }).success).toBe(true);
  });

  it("rejects notes exceeding 2000 chars", () => {
    expect(UpdateDoctorSchema.safeParse({ notes: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("UpdateLocationSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateLocationSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only city", () => {
    expect(UpdateLocationSchema.safeParse({ city: "Denver" }).success).toBe(true);
  });

  it("rejects state longer than 2 chars", () => {
    expect(UpdateLocationSchema.safeParse({ state: "COL" }).success).toBe(false);
  });

  it("accepts valid 2-char state", () => {
    expect(UpdateLocationSchema.safeParse({ state: "CO" }).success).toBe(true);
  });
});

// ── CreateAllergySchema ───────────────────────────────────────────────────────

describe("CreateAllergySchema", () => {
  const valid = { profileId: "p1", allergen: "Birch pollen" };

  it("accepts minimal valid input", () => {
    expect(CreateAllergySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = CreateAllergySchema.safeParse({
      ...valid,
      category: "Tree",
      diagnosisDate: "2024-03-01",
      whealSize: 8.5,
      notes: "Confirmed via skin prick test",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.diagnosisDate).toBeInstanceOf(Date);
  });

  it("rejects missing allergen", () => {
    expect(CreateAllergySchema.safeParse({ profileId: "p1" }).success).toBe(false);
  });

  it("rejects empty allergen", () => {
    expect(CreateAllergySchema.safeParse({ ...valid, allergen: "" }).success).toBe(false);
  });

  it("rejects negative whealSize", () => {
    expect(CreateAllergySchema.safeParse({ ...valid, whealSize: -1 }).success).toBe(false);
  });

  it("accepts whealSize of 0", () => {
    expect(CreateAllergySchema.safeParse({ ...valid, whealSize: 0 }).success).toBe(true);
  });
});

describe("UpdateAllergySchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(UpdateAllergySchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only allergen", () => {
    expect(UpdateAllergySchema.safeParse({ allergen: "Dust mite" }).success).toBe(true);
  });

  it("rejects empty allergen", () => {
    expect(UpdateAllergySchema.safeParse({ allergen: "" }).success).toBe(false);
  });
});

// ── CreatePortalSchema ────────────────────────────────────────────────────────

describe("CreatePortalSchema", () => {
  const valid = { profileId: "p1", name: "MyChart", url: "https://mychart.example.com" };

  it("accepts minimal valid input", () => {
    expect(CreatePortalSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional organization and notes", () => {
    expect(
      CreatePortalSchema.safeParse({ ...valid, organization: "Big Health", notes: "Login via SSO" }).success
    ).toBe(true);
  });

  it("rejects missing name", () => {
    expect(
      CreatePortalSchema.safeParse({ profileId: "p1", url: "https://example.com" }).success
    ).toBe(false);
  });

  it("rejects invalid URL", () => {
    expect(CreatePortalSchema.safeParse({ ...valid, url: "not-a-url" }).success).toBe(false);
  });

  it("rejects empty profileId", () => {
    expect(CreatePortalSchema.safeParse({ ...valid, profileId: "" }).success).toBe(false);
  });
});

describe("UpdatePortalSchema", () => {
  it("accepts empty object", () => {
    expect(UpdatePortalSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only name", () => {
    expect(UpdatePortalSchema.safeParse({ name: "Updated Portal" }).success).toBe(true);
  });

  it("rejects invalid URL in partial update", () => {
    expect(UpdatePortalSchema.safeParse({ url: "bad-url" }).success).toBe(false);
  });
});

// ── CreateHealthMetricSchema ──────────────────────────────────────────────────

describe("CreateHealthMetricSchema", () => {
  const valid = {
    profileId: "p1",
    metricType: "Weight",
    value: 82.5,
    unit: "kg",
    measuredAt: "2026-03-18T08:00:00.000Z",
  };

  it("accepts valid input", () => {
    const result = CreateHealthMetricSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.measuredAt).toBeInstanceOf(Date);
  });

  it("accepts optional notes", () => {
    expect(
      CreateHealthMetricSchema.safeParse({ ...valid, notes: "Fasted measurement" }).success
    ).toBe(true);
  });

  it("rejects missing metricType", () => {
    const { metricType: _, ...rest } = valid;
    expect(CreateHealthMetricSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty metricType", () => {
    expect(CreateHealthMetricSchema.safeParse({ ...valid, metricType: "" }).success).toBe(false);
  });

  it("rejects missing unit", () => {
    const { unit: _, ...rest } = valid;
    expect(CreateHealthMetricSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid measuredAt string", () => {
    expect(
      CreateHealthMetricSchema.safeParse({ ...valid, measuredAt: "not-a-date" }).success
    ).toBe(false);
  });

  it("accepts negative value (e.g. temperature delta)", () => {
    expect(CreateHealthMetricSchema.safeParse({ ...valid, value: -1.5 }).success).toBe(true);
  });
});

describe("UpdateHealthMetricSchema", () => {
  it("accepts empty object", () => {
    expect(UpdateHealthMetricSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only value", () => {
    expect(UpdateHealthMetricSchema.safeParse({ value: 80 }).success).toBe(true);
  });

  it("rejects empty metricType in partial update", () => {
    expect(UpdateHealthMetricSchema.safeParse({ metricType: "" }).success).toBe(false);
  });
});

// ── Date coercion ─────────────────────────────────────────────────────────────

describe("z.coerce.date() behaviour", () => {
  it("CreateProfileSchema birthDate accepts ISO string", () => {
    const r = CreateProfileSchema.safeParse({ name: "X", birthDate: "2000-01-01T00:00:00Z", sex: "MALE" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.birthDate).toBeInstanceOf(Date);
  });

  it("CreateDoseSchema date accepts ISO string", () => {
    const r = CreateDoseSchema.safeParse({ profileId: "p1", vaccineName: "Flu", date: "2025-10-01T00:00:00.000Z" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.date).toBeInstanceOf(Date);
  });

  it("rejects non-date strings", () => {
    const r = CreateDoseSchema.safeParse({ profileId: "p1", vaccineName: "Flu", date: "yesterday" });
    expect(r.success).toBe(false);
  });
});
