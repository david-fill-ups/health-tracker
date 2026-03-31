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
const optStr255 = z.string().max(255).nullish();
const optStr500 = z.string().max(500).nullish();
const optPhone = z.string().max(30).nullish();
const optDate = z.coerce.date().optional();
const id = z.string().min(1);
const optNpi = z.string().regex(/^\d{10}$/, "NPI must be 10 digits").nullish();
const optCredential = z.string().max(50).nullish();

// ── Enums ──────────────────────────────────────────────────────────────────────

export const SexEnum = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);
export const VisitTypeEnum = z.enum([
  "ROUTINE", "LAB", "SPECIALIST", "URGENT", "TELEHEALTH", "PROCEDURE", "OTHER",
]);
export const VisitStatusEnum = z.enum(["PENDING", "SCHEDULED", "COMPLETED", "CANCELLED"]);
export const ConditionStatusEnum = z.enum(["ACTIVE", "RESOLVED", "MONITORING", "BENIGN"]);
export const FACILITY_TYPE_SUGGESTIONS = [
  "Clinic", "Hospital", "Lab", "Pharmacy", "Supplier", "Urgent Care",
  "Dental", "Imaging", "Therapy", "Virtual", "Other",
] as const;
export const PermissionEnum = z.enum(["READ_ONLY", "WRITE", "OWNER"]);

// ── Profile ────────────────────────────────────────────────────────────────────

export const CreateProfileSchema = z.object({
  name: name255,
  birthDate: z.coerce.date(),
  sex: SexEnum,
  state: z.string().max(2).optional(),
  heightIn: z.number().int().min(12).max(108).optional(),
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

export const VaccinationSourceEnum = z.enum(["ADMINISTERED", "NATURAL", "DECLINED"]);

export const CreateVaccinationSchema = z.object({
  profileId: id,
  name: name255,
  date: z.coerce.date(),
  source: VaccinationSourceEnum.optional(),
  facilityId: z.string().min(1).optional(),
  lotNumber: optStr255,
  notes: z.string().max(1000).optional(),
});

export const UpdateVaccinationSchema = z.object({
  name: name255.optional(),
  date: z.coerce.date().optional(),
  source: VaccinationSourceEnum.optional(),
  facilityId: z.string().min(1).nullable().optional(),
  lotNumber: z.string().max(255).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const RenameVaccinationGroupSchema = z.object({
  profileId: id,
  oldName: name255,
  newName: name255,
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

export const UpdateVisitSchema = CreateVisitSchema.omit({ profileId: true }).partial().extend({
  doctorId: z.string().min(1).nullish(),
  facilityId: z.string().min(1).nullish(),
  locationId: z.string().min(1).nullish(),
  reason: z.string().max(500).nullish(),
  specialty: z.string().max(255).nullish(),
  notes: z.string().max(5000).nullish(),
  documentUrl: z.string().url().max(500).nullish(),
});

// ── Medication ─────────────────────────────────────────────────────────────────

export const MedicationTypeEnum = z.enum([
  "ORAL",
  "INJECTABLE",
  "TOPICAL",
  "INHALER",
  "SUPPLEMENT",
  "DEVICE",
  "OTHER",
]);

export const MEDICATION_TYPE_LABELS: Record<z.infer<typeof MedicationTypeEnum>, string> = {
  ORAL: "Oral (Pill / Tablet)",
  INJECTABLE: "Injectable",
  TOPICAL: "Topical (Cream / Patch)",
  INHALER: "Inhaler",
  SUPPLEMENT: "Supplement",
  DEVICE: "Device / Equipment",
  OTHER: "Other",
};

export const CreateMedicationSchema = z.object({
  profileId: id,
  name: name255,
  medicationType: MedicationTypeEnum.optional(),
  dosage: optStr255,
  frequency: z.string().max(255).optional(),
  prescribingDoctorId: z.string().min(1).nullish(),
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

export const UpdateMedicationLogSchema = CreateMedicationLogSchema.omit({ profileId: true }).partial();

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
  type: z.string().min(1).max(100),
  npiNumber: optNpi,
  npiLastSynced: z.coerce.date().nullish(),
  rating: z.number().min(0).max(5).optional(),
  websiteUrl: optStr500,
  portalUrl: optStr500,
  phone: optPhone,
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

export const UpdateFacilitySchema = CreateFacilitySchema.partial();

// ── Doctor ─────────────────────────────────────────────────────────────────────

export const CreateDoctorSchema = z.object({
  name: name255,
  specialty: optStr255,
  facilityId: z.string().min(1).optional(),
  npiNumber: optNpi,
  credential: optCredential,
  photo: optStr500,
  npiLastSynced: z.coerce.date().nullish(),
  rating: z.number().min(0).max(5).optional(),
  websiteUrl: optStr500,
  portalUrl: optStr500,
  phone: optPhone,
  notes: z.string().max(2000).optional(),
  active: z.boolean().optional(),
});

export const UpdateDoctorSchema = CreateDoctorSchema.partial();

// ── NPI Search ─────────────────────────────────────────────────────────────────

export const NpiSearchSchema = z.object({
  q: z.string().min(2).max(100),
  type: z.enum(["individual", "organization"]).optional(),
  state: z.string().max(2).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

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

// ── Family Member ────────────────────────────────────────────────────────────

export const FamilyRelationshipEnum = z.enum([
  // Legacy (existing records)
  "PARENT", "SIBLING",
  // Current — gendered
  "FATHER", "MOTHER", "BROTHER", "SISTER", "HALF_BROTHER", "HALF_SISTER",
  "GRANDFATHER", "GRANDMOTHER", "AUNT", "UNCLE", "SON", "DAUGHTER",
]);

export const FamilySideEnum = z.enum(["MATERNAL", "PATERNAL"]);

export const CreateFamilyMemberSchema = z.object({
  profileId: id,
  name: name255,
  relationship: FamilyRelationshipEnum,
  side: FamilySideEnum.optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateFamilyMemberSchema = CreateFamilyMemberSchema.omit({ profileId: true }).partial();

export const CreateFamilyConditionSchema = z.object({
  profileId: id,
  name: name255,
  notes: z.string().max(5000).optional(),
});

export const UpdateFamilyConditionSchema = CreateFamilyConditionSchema.omit({ profileId: true }).partial();

// ── Profile Relationship ─────────────────────────────────────────────────────

export const ProfileRelationshipTypeEnum = z.enum([
  // Legacy (backward compat)
  "PARENT", "CHILD", "SIBLING", "HALF_SIBLING",
  "GRANDPARENT", "GRANDCHILD", "AUNT_UNCLE", "NIECE_NEPHEW",
  "STEP_PARENT", "STEP_CHILD", "IN_LAW",
  // Current
  "SPOUSE",
  "MOTHER", "FATHER",
  "DAUGHTER", "SON",
  "SISTER", "BROTHER", "HALF_SISTER", "HALF_BROTHER",
  "MATERNAL_GRANDMOTHER", "MATERNAL_GRANDFATHER", "PATERNAL_GRANDMOTHER", "PATERNAL_GRANDFATHER",
  "GRANDDAUGHTER", "GRANDSON",
  "MATERNAL_AUNT", "MATERNAL_UNCLE", "PATERNAL_AUNT", "PATERNAL_UNCLE",
  "NIECE", "NEPHEW",
  "COUSIN",
  "STEP_MOTHER", "STEP_FATHER", "STEP_DAUGHTER", "STEP_SON", "STEP_SISTER", "STEP_BROTHER",
  "MOTHER_IN_LAW", "FATHER_IN_LAW", "DAUGHTER_IN_LAW", "SON_IN_LAW", "SISTER_IN_LAW", "BROTHER_IN_LAW",
  "OTHER",
]);

export const CreateProfileRelationshipSchema = z.object({
  profileId: id,
  linkedProfileId: id,
  relationship: ProfileRelationshipTypeEnum,
  biological: z.boolean().optional(),
});

export const UpdateProfileRelationshipSchema = z.object({
  profileId: id,
  relationship: ProfileRelationshipTypeEnum.optional(),
  biological: z.boolean().optional(),
});

// ── Travel ──────────────────────────────────────────────────────────────────────

export const TravelCheckSchema = z.object({
  profileId: id,
  destination: z.string().min(1).max(200),
});
