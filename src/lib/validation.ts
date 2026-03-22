import { z } from "zod";
import { NextResponse } from "next/server";

// ── Parse helper ───────────────────────────────────────────────────────────────
// Call at the top of any mutating route handler. Returns parsed data on success
// or a ready-to-return 400 NextResponse on failure.

type ParseOk<T> = { ok: true; data: T };
type ParseFail = { ok: false; response: NextResponse };
export type ParseResult<T> = ParseOk<T> | ParseFail;

export function parseBody<T>(schema: z.ZodType<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request", details: result.error.flatten().fieldErrors },
        { status: 400 }
      ),
    };
  }
  return { ok: true, data: result.data };
}

// ── Shared primitives ──────────────────────────────────────────────────────────

const name255 = z.string().min(1, "Required").max(255);
const optStr255 = z.string().max(255).optional();
const optStr500 = z.string().max(500).optional();
const optPhone = z.string().max(30).optional();
const optDate = z.coerce.date().optional();
const id = z.string().min(1);

// ── Enums ──────────────────────────────────────────────────────────────────────

export const SexEnum = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);
export const VisitTypeEnum = z.enum([
  "ROUTINE", "LAB", "SPECIALIST", "URGENT", "TELEHEALTH", "PROCEDURE", "OTHER",
]);
export const VisitStatusEnum = z.enum(["PENDING", "SCHEDULED", "COMPLETED", "CANCELLED"]);
export const ConditionStatusEnum = z.enum(["ACTIVE", "RESOLVED", "MONITORING"]);
export const FacilityTypeEnum = z.enum([
  "CLINIC", "HOSPITAL", "LAB", "PHARMACY", "SUPPLIER", "URGENT_CARE", "OTHER",
]);
export const PermissionEnum = z.enum(["READ_ONLY", "WRITE", "OWNER"]);

// ── Profile ────────────────────────────────────────────────────────────────────

export const CreateProfileSchema = z.object({
  name: name255,
  birthDate: z.coerce.date(),
  sex: SexEnum,
  state: z.string().max(2).optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateProfileSchema = CreateProfileSchema.partial();

// ── Onboarding ─────────────────────────────────────────────────────────────────

export const OnboardingSchema = z.object({
  name: name255,
  birthDate: z.coerce.date(),
  sex: SexEnum,
  state: z.string().max(2).optional(),
});

// ── Vaccination ────────────────────────────────────────────────────────────────

export const CreateVaccinationSchema = z.object({
  profileId: id,
  name: name255,
  date: z.coerce.date(),
  facilityId: z.string().min(1).optional(),
  lotNumber: optStr255,
  notes: z.string().max(1000).optional(),
});

export const UpdateVaccinationSchema = z.object({
  name: name255.optional(),
  date: z.coerce.date().optional(),
  facilityId: z.string().min(1).nullable().optional(),
  lotNumber: z.string().max(255).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// ── Visit ──────────────────────────────────────────────────────────────────────

export const COMMON_VISIT_SPECIALTIES = [
  "PCP", "Urology", "Dental", "Optometry", "Radiology", "Urgent Care",
  "Orthopedic Surgery", "MRI", "Physical Therapy", "Sleep Specialist",
  "Endocrinology", "Gastroenterology", "Otolaryngology", "Nuclear Medicine",
  "Chiropractic", "Allergist", "Fertility", "Psychotherapist",
  "Telehealth", "Emergency Dept", "Blood Donation", "Workplace",
] as const;

export const CreateVisitSchema = z.object({
  profileId: id,
  doctorId: z.string().min(1).optional(),
  facilityId: z.string().min(1).optional(),
  locationId: z.string().min(1).optional(),
  date: optDate,
  dueMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  type: VisitTypeEnum.optional(),
  reason: z.string().max(500).optional(),
  specialty: z.string().max(255).optional(),
  notes: z.string().max(5000).optional(),
  documentUrl: z.string().url().max(500).optional(),
  status: VisitStatusEnum.optional(),
});

export const UpdateVisitSchema = CreateVisitSchema.omit({ profileId: true }).partial();

// ── Medication ─────────────────────────────────────────────────────────────────

export const CreateMedicationSchema = z.object({
  profileId: id,
  name: name255,
  dosage: optStr255,
  frequency: z.string().max(255).optional(),
  prescribingDoctorId: z.string().min(1).optional(),
  startDate: optDate,
  endDate: optDate,
  instructions: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

export const UpdateMedicationSchema = CreateMedicationSchema.omit({ profileId: true }).partial();

// ── Medication Log ─────────────────────────────────────────────────────────────

export const CreateMedicationLogSchema = z.object({
  profileId: id,
  date: z.coerce.date(),
  dosage: z.number().positive().optional(),
  unit: optStr255,
  injectionSite: optStr255,
  weight: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

// ── Condition ──────────────────────────────────────────────────────────────────

export const CreateConditionSchema = z.object({
  profileId: id,
  name: name255,
  diagnosisDate: optDate,
  status: ConditionStatusEnum.optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateConditionSchema = CreateConditionSchema.omit({ profileId: true }).partial();

// ── Facility ───────────────────────────────────────────────────────────────────

export const CreateFacilitySchema = z.object({
  name: name255,
  type: FacilityTypeEnum,
  websiteUrl: optStr500,
  portalUrl: optStr500,
  phone: optPhone,
  active: z.boolean().optional(),
});

export const UpdateFacilitySchema = CreateFacilitySchema.partial();

// ── Doctor ─────────────────────────────────────────────────────────────────────

export const CreateDoctorSchema = z.object({
  name: name255,
  specialty: optStr255,
  facilityId: z.string().min(1).optional(),
  websiteUrl: optStr500,
  portalUrl: optStr500,
  phone: optPhone,
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

export const UpdateDoctorSchema = CreateDoctorSchema.partial();

// ── Location ───────────────────────────────────────────────────────────────────

export const CreateLocationSchema = z.object({
  name: name255,
  address1: optStr255,
  address2: optStr255,
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zip: z.string().max(10).optional(),
  phone: optPhone,
  active: z.boolean().optional(),
});

export const UpdateLocationSchema = CreateLocationSchema.partial();

// ── Profile Access (sharing) ───────────────────────────────────────────────────

export const ProfileAccessSchema = z.object({
  email: z.string().email().max(255),
  permission: PermissionEnum,
});

export const UpdateProfileAccessSchema = z.object({
  permission: PermissionEnum,
});

// ── Allergy ────────────────────────────────────────────────────────────────────

export const CreateAllergySchema = z.object({
  profileId: id,
  allergen: name255,
  category: optStr255,
  diagnosisDate: optDate,
  whealSize: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateAllergySchema = CreateAllergySchema.omit({ profileId: true }).partial();

// ── Portal ─────────────────────────────────────────────────────────────────────

export const CreatePortalSchema = z.object({
  profileId: id,
  name: name255,
  organization: optStr255,
  url: z.string().url().max(500),
  facilityId: z.string().min(1).optional(),
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

export const UpdatePortalSchema = CreatePortalSchema.omit({ profileId: true }).partial();

// ── Health Metric ──────────────────────────────────────────────────────────────

export const COMMON_METRIC_TYPES = [
  "Weight",
  "Blood Pressure Systolic",
  "Blood Pressure Diastolic",
  "Blood Sugar (Fasting)",
  "Blood Sugar (Post-meal)",
  "Heart Rate",
  "Blood Oxygen (SpO2)",
] as const;

export const CreateHealthMetricSchema = z.object({
  profileId: id,
  metricType: z.string().min(1).max(100),
  value: z.number(),
  unit: z.string().min(1).max(50),
  measuredAt: z.coerce.date(),
  notes: z.string().max(1000).optional(),
});

export const UpdateHealthMetricSchema = CreateHealthMetricSchema.omit({ profileId: true }).partial();
