/**
 * OpenAPI 3.1 spec builder.
 *
 * Request body schemas are generated directly from the Zod validation schemas
 * in lib/validation.ts using z.toJSONSchema() — so they update automatically
 * whenever the validation rules change.
 */

import { z } from "zod";
import {
  CreateProfileSchema,
  UpdateProfileSchema,
  CreateVisitSchema,
  UpdateVisitSchema,
  CreateMedicationSchema,
  UpdateMedicationSchema,
  CreateMedicationLogSchema,
  CreateDoseSchema,
  CreateVaccinationSchema,
  UpdateVaccinationSchema,
  UpdateDoseSchema,
  CreateConditionSchema,
  UpdateConditionSchema,
  CreateFacilitySchema,
  UpdateFacilitySchema,
  CreateDoctorSchema,
  UpdateDoctorSchema,
  CreateLocationSchema,
  UpdateLocationSchema,
  ProfileAccessSchema,
  UpdateProfileAccessSchema,
  CreateAllergySchema,
  UpdateAllergySchema,
  CreatePortalSchema,
  UpdatePortalSchema,
  CreateHealthMetricSchema,
  UpdateHealthMetricSchema,
  CreateFamilyMemberSchema,
  UpdateFamilyMemberSchema,
  CreateFamilyConditionSchema,
  UpdateFamilyConditionSchema,
  CreateProfileRelationshipSchema,
  UpdateProfileRelationshipSchema,
} from "./validation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

/** Convert a Zod schema to JSON Schema using Zod v4's built-in utility.
 * `unrepresentable: "any"` silences the error for z.coerce.date() and other
 * types that have no JSON Schema equivalent — they render as {} (any). */
function s(zodSchema: z.ZodType): AnyObj {
  return z.toJSONSchema(zodSchema, { unrepresentable: "any" }) as AnyObj;
}

function strPathParam(name: string, description: string) {
  return {
    name,
    in: "path" as const,
    required: true,
    description,
    schema: { type: "string" },
  };
}

function queryParam(name: string, description: string, required = false) {
  return {
    name,
    in: "query" as const,
    required,
    description,
    schema: { type: "string" },
  };
}

function jsonBody(zodSchema: z.ZodType) {
  return {
    required: true,
    content: {
      "application/json": { schema: s(zodSchema) },
    },
  };
}

function resp(description: string) {
  return { description };
}

export function buildOpenApiSpec(): AnyObj {
  return {
    openapi: "3.1.0",
    info: {
      title: "Health Tracker API",
      version: "1.0.0",
      description:
        "Internal REST API for Health Tracker. All endpoints require an authenticated session unless noted.",
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "Profiles", description: "Health profiles (family members, dependents, etc.)" },
      { name: "Profile Sharing", description: "Grant and revoke profile access to other users" },
      { name: "Visits", description: "Doctor visits and appointments" },
      { name: "Medications", description: "Medications and dose logs" },
      { name: "Vaccinations", description: "Vaccination records and CDC recommendations" },
      { name: "Conditions", description: "Medical conditions and diagnoses" },
      { name: "Doctors", description: "Healthcare providers" },
      { name: "Facilities", description: "Clinics, hospitals, labs, and pharmacies" },
      { name: "Locations", description: "Physical locations attached to facilities" },
      { name: "Allergies", description: "Allergy records (allergen, category, wheal size)" },
      { name: "Portals", description: "Patient and resupply portal catalog" },
      { name: "Health Metrics", description: "Standalone health measurements (weight, blood sugar, etc.)" },
      { name: "Family History", description: "Family member medical history (manual entries and profile links)" },
      { name: "Import / Export", description: "JSON data portability for health profiles" },
      { name: "Calendar", description: "iCal feed for upcoming visits" },
      { name: "Account", description: "Account management" },
      { name: "NPI Lookup", description: "Search the US National Provider Identifier (NPI) Registry to auto-fill doctor and facility records" },
    ],
    paths: {
      // ─── Profiles ─────────────────────────────────────────────────────────────

      "/api/profiles": {
        get: {
          operationId: "listProfiles",
          summary: "List profiles",
          description: "Returns all health profiles the authenticated user has access to (owned or shared).",
          tags: ["Profiles"],
          responses: {
            "200": resp("Array of profiles with access role"),
            "401": resp("Unauthorized"),
          },
        },
        post: {
          operationId: "createProfile",
          summary: "Create profile",
          description: "Creates a new health profile owned by the current user.",
          tags: ["Profiles"],
          requestBody: jsonBody(CreateProfileSchema),
          responses: {
            "201": resp("Created profile"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
          },
        },
      },

      "/api/profiles/{id}": {
        parameters: [strPathParam("id", "Profile ID")],
        get: {
          operationId: "getProfile",
          summary: "Get profile",
          description: "Returns a single profile with its access list. Requires at least READ_ONLY access.",
          tags: ["Profiles"],
          responses: {
            "200": resp("Profile with access list"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — insufficient access"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateProfile",
          summary: "Update profile",
          description: "Updates profile fields. Requires WRITE access.",
          tags: ["Profiles"],
          requestBody: jsonBody(UpdateProfileSchema),
          responses: {
            "200": resp("Updated profile"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — insufficient access"),
          },
        },
        delete: {
          operationId: "deleteProfile",
          summary: "Delete profile",
          description: "Permanently deletes a profile and all its health data. Requires OWNER access.",
          tags: ["Profiles"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — owner only"),
          },
        },
      },

      // ─── Profile Sharing ──────────────────────────────────────────────────────

      "/api/profiles/{id}/access": {
        parameters: [strPathParam("id", "Profile ID")],
        get: {
          operationId: "listProfileAccess",
          summary: "List profile access",
          description: "Returns all users with access to this profile. Requires OWNER access.",
          tags: ["Profile Sharing"],
          responses: {
            "200": resp("Array of access entries with user info and permission level"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — owner only"),
          },
        },
        post: {
          operationId: "addProfileAccess",
          summary: "Grant access",
          description: "Grants a user access to this profile by email. Requires OWNER access.",
          tags: ["Profile Sharing"],
          requestBody: jsonBody(ProfileAccessSchema),
          responses: {
            "201": resp("Created access entry"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — owner only"),
            "404": resp("User with that email not found"),
          },
        },
      },

      "/api/profiles/{id}/access/{userId}": {
        parameters: [
          strPathParam("id", "Profile ID"),
          strPathParam("userId", "User ID to revoke"),
        ],
        delete: {
          operationId: "removeProfileAccess",
          summary: "Revoke access",
          description: "Revokes a user's access to this profile. Requires OWNER access.",
          tags: ["Profile Sharing"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — owner only"),
          },
        },
        put: {
          operationId: "updateProfileAccess",
          summary: "Update permission level",
          description: "Changes the permission level for a user on this profile. Requires OWNER access.",
          tags: ["Profile Sharing"],
          requestBody: jsonBody(UpdateProfileAccessSchema),
          responses: {
            "200": resp("Updated access entry"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — owner only"),
          },
        },
      },

      // ─── Visits ───────────────────────────────────────────────────────────────

      "/api/visits": {
        get: {
          operationId: "listVisits",
          summary: "List visits",
          description: "Returns all visits for a profile. Requires at least READ_ONLY access.",
          tags: ["Visits"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of visits with doctor, facility, and location"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — insufficient access"),
          },
        },
        post: {
          operationId: "createVisit",
          summary: "Create visit",
          description: "Records a new visit for a profile. Requires WRITE access.",
          tags: ["Visits"],
          requestBody: jsonBody(CreateVisitSchema),
          responses: {
            "201": resp("Created visit"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — insufficient access"),
          },
        },
      },

      "/api/visits/{id}": {
        parameters: [strPathParam("id", "Visit ID")],
        get: {
          operationId: "getVisit",
          summary: "Get visit",
          description: "Returns a single visit. Requires at least READ_ONLY access to the profile.",
          tags: ["Visits"],
          responses: {
            "200": resp("Visit with doctor, facility, and location"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateVisit",
          summary: "Update visit",
          description: "Updates a visit. Requires WRITE access to the profile.",
          tags: ["Visits"],
          requestBody: jsonBody(UpdateVisitSchema),
          responses: {
            "200": resp("Updated visit"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteVisit",
          summary: "Delete visit",
          description: "Permanently deletes a visit. Requires WRITE access to the profile.",
          tags: ["Visits"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Medications ──────────────────────────────────────────────────────────

      "/api/medications": {
        get: {
          operationId: "listMedications",
          summary: "List medications",
          description: "Returns all medications for a profile, including the last 10 dose logs. Requires at least READ_ONLY access.",
          tags: ["Medications"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of medications with recent logs"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createMedication",
          summary: "Create medication",
          description: "Adds a medication to a profile. Requires WRITE access.",
          tags: ["Medications"],
          requestBody: jsonBody(CreateMedicationSchema),
          responses: {
            "201": resp("Created medication"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/medications/{id}": {
        parameters: [strPathParam("id", "Medication ID")],
        get: {
          operationId: "getMedication",
          summary: "Get medication",
          description: "Returns a single medication with its dose logs.",
          tags: ["Medications"],
          responses: {
            "200": resp("Medication with logs"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateMedication",
          summary: "Update medication",
          description: "Updates a medication. Requires WRITE access.",
          tags: ["Medications"],
          requestBody: jsonBody(UpdateMedicationSchema),
          responses: {
            "200": resp("Updated medication"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteMedication",
          summary: "Delete medication",
          description: "Permanently deletes a medication and all its logs. Requires WRITE access.",
          tags: ["Medications"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/medications/{id}/logs": {
        parameters: [strPathParam("id", "Medication ID")],
        get: {
          operationId: "listMedicationLogs",
          summary: "List dose logs",
          description: "Returns all dose logs for a medication. Requires at least READ_ONLY access.",
          tags: ["Medications"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of dose log entries"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createMedicationLog",
          summary: "Log a dose",
          description: "Records a dose administration for this medication. Requires WRITE access.",
          tags: ["Medications"],
          requestBody: jsonBody(CreateMedicationLogSchema),
          responses: {
            "201": resp("Created dose log entry"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Vaccinations ─────────────────────────────────────────────────────────

      "/api/vaccinations": {
        get: {
          operationId: "listVaccinations",
          summary: "List vaccinations",
          description: "Returns all vaccination records for a profile. Requires at least READ_ONLY access.",
          tags: ["Vaccinations"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of vaccination records"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createDose",
          summary: "Record a dose",
          description: "Records a vaccination dose for a profile. Creates the parent Vaccination record if it does not exist. Requires WRITE access.",
          tags: ["Vaccinations"],
          requestBody: jsonBody(CreateDoseSchema),
          responses: {
            "201": resp("Created dose record"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/vaccinations/{id}": {
        parameters: [strPathParam("id", "Vaccination ID")],
        get: {
          operationId: "getVaccination",
          summary: "Get vaccination",
          description: "Returns a single vaccination (parent) record with all doses.",
          tags: ["Vaccinations"],
          responses: {
            "200": resp("Vaccination record with doses"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateVaccination",
          summary: "Update vaccination",
          description: "Updates a vaccination parent record (name, aliases, notes). Requires WRITE access.",
          tags: ["Vaccinations"],
          requestBody: jsonBody(UpdateVaccinationSchema),
          responses: {
            "200": resp("Updated vaccination record"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteVaccination",
          summary: "Delete vaccination",
          description: "Permanently deletes a vaccination record. Requires WRITE access.",
          tags: ["Vaccinations"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/vaccinations/doses/{id}": {
        parameters: [strPathParam("id", "Dose ID")],
        get: {
          operationId: "getDose",
          summary: "Get dose",
          description: "Returns a single dose record.",
          tags: ["Vaccinations"],
          responses: {
            "200": resp("Dose record"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateDose",
          summary: "Update dose",
          description: "Updates a dose record. Requires WRITE access.",
          tags: ["Vaccinations"],
          requestBody: jsonBody(UpdateDoseSchema),
          responses: {
            "200": resp("Updated dose record"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteDose",
          summary: "Delete dose",
          description: "Permanently deletes a dose record. Requires WRITE access.",
          tags: ["Vaccinations"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/vaccinations/recommendations": {
        get: {
          operationId: "getVaccinationRecommendations",
          summary: "Get CDC recommendations",
          description: "Returns CDC vaccination schedule recommendations filtered by state and age.",
          tags: ["Vaccinations"],
          parameters: [
            queryParam("state", "Two-letter state code (e.g. CA)"),
            queryParam("age", "Age in years for age-specific recommendations"),
          ],
          responses: {
            "200": resp("Array of CDC vaccination schedule entries"),
            "401": resp("Unauthorized"),
          },
        },
      },

      // ─── Conditions ───────────────────────────────────────────────────────────

      "/api/conditions": {
        get: {
          operationId: "listConditions",
          summary: "List conditions",
          description: "Returns all medical conditions for a profile. Requires at least READ_ONLY access.",
          tags: ["Conditions"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of conditions"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createCondition",
          summary: "Record condition",
          description: "Adds a medical condition to a profile. Requires WRITE access.",
          tags: ["Conditions"],
          requestBody: jsonBody(CreateConditionSchema),
          responses: {
            "201": resp("Created condition"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/conditions/{id}": {
        parameters: [strPathParam("id", "Condition ID")],
        get: {
          operationId: "getCondition",
          summary: "Get condition",
          description: "Returns a single medical condition.",
          tags: ["Conditions"],
          responses: {
            "200": resp("Condition"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateCondition",
          summary: "Update condition",
          description: "Updates a medical condition. Requires WRITE access.",
          tags: ["Conditions"],
          requestBody: jsonBody(UpdateConditionSchema),
          responses: {
            "200": resp("Updated condition"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteCondition",
          summary: "Delete condition",
          description: "Permanently deletes a condition. Requires WRITE access.",
          tags: ["Conditions"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Doctors ──────────────────────────────────────────────────────────────

      "/api/doctors": {
        get: {
          operationId: "listDoctors",
          summary: "List doctors",
          description: "Returns all healthcare providers for a profile. Requires at least READ_ONLY access.",
          tags: ["Doctors"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of doctor records"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createDoctor",
          summary: "Add doctor",
          description: "Adds a healthcare provider to a profile. Requires WRITE access.",
          tags: ["Doctors"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          requestBody: jsonBody(CreateDoctorSchema),
          responses: {
            "201": resp("Created doctor record"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/doctors/{id}": {
        parameters: [strPathParam("id", "Doctor ID")],
        get: {
          operationId: "getDoctor",
          summary: "Get doctor",
          description: "Returns a single doctor record.",
          tags: ["Doctors"],
          responses: {
            "200": resp("Doctor record"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateDoctor",
          summary: "Update doctor",
          description: "Updates a doctor record. Requires WRITE access.",
          tags: ["Doctors"],
          requestBody: jsonBody(UpdateDoctorSchema),
          responses: {
            "200": resp("Updated doctor record"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteDoctor",
          summary: "Delete doctor",
          description: "Permanently deletes a doctor record. Requires WRITE access.",
          tags: ["Doctors"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Facilities ───────────────────────────────────────────────────────────

      "/api/facilities": {
        get: {
          operationId: "listFacilities",
          summary: "List facilities",
          description: "Returns all facilities for a profile (clinics, hospitals, labs, pharmacies). Requires at least READ_ONLY access.",
          tags: ["Facilities"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of facilities with their locations"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createFacility",
          summary: "Add facility",
          description: "Adds a facility to a profile. Requires WRITE access.",
          tags: ["Facilities"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          requestBody: jsonBody(CreateFacilitySchema),
          responses: {
            "201": resp("Created facility"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/facilities/{id}": {
        parameters: [strPathParam("id", "Facility ID")],
        get: {
          operationId: "getFacility",
          summary: "Get facility",
          description: "Returns a single facility with its locations.",
          tags: ["Facilities"],
          responses: {
            "200": resp("Facility with locations"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateFacility",
          summary: "Update facility",
          description: "Updates a facility. Requires WRITE access.",
          tags: ["Facilities"],
          requestBody: jsonBody(UpdateFacilitySchema),
          responses: {
            "200": resp("Updated facility"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteFacility",
          summary: "Delete facility",
          description: "Permanently deletes a facility and its locations. Requires WRITE access.",
          tags: ["Facilities"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Locations ────────────────────────────────────────────────────────────

      "/api/locations": {
        get: {
          operationId: "listLocations",
          summary: "List locations",
          description: "Returns all locations for a facility.",
          tags: ["Locations"],
          parameters: [queryParam("facilityId", "Facility ID", true)],
          responses: {
            "200": resp("Array of locations"),
            "400": resp("Missing facilityId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createLocation",
          summary: "Add location",
          description: "Adds a physical location to a facility. Requires WRITE access to the profile.",
          tags: ["Locations"],
          parameters: [queryParam("facilityId", "Facility ID", true)],
          requestBody: jsonBody(CreateLocationSchema),
          responses: {
            "201": resp("Created location"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/locations/{id}": {
        parameters: [strPathParam("id", "Location ID")],
        get: {
          operationId: "getLocation",
          summary: "Get location",
          description: "Returns a single location.",
          tags: ["Locations"],
          responses: {
            "200": resp("Location"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateLocation",
          summary: "Update location",
          description: "Updates a location. Requires WRITE access.",
          tags: ["Locations"],
          requestBody: jsonBody(UpdateLocationSchema),
          responses: {
            "200": resp("Updated location"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteLocation",
          summary: "Delete location",
          description: "Permanently deletes a location. Requires WRITE access.",
          tags: ["Locations"],
          responses: {
            "200": resp("{ ok: true }"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Allergies ────────────────────────────────────────────────────────────

      "/api/allergies": {
        get: {
          operationId: "listAllergies",
          summary: "List allergies",
          description: "Returns all allergy records for a profile, ordered alphabetically by allergen. Requires at least READ_ONLY access.",
          tags: ["Allergies"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of allergy records"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createAllergy",
          summary: "Record allergy",
          description: "Adds an allergy record to a profile. Requires OWNER access.",
          tags: ["Allergies"],
          requestBody: jsonBody(CreateAllergySchema),
          responses: {
            "201": resp("Created allergy"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/allergies/{id}": {
        parameters: [strPathParam("id", "Allergy ID")],
        get: {
          operationId: "getAllergy",
          summary: "Get allergy",
          description: "Returns a single allergy record.",
          tags: ["Allergies"],
          responses: {
            "200": resp("Allergy record"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateAllergy",
          summary: "Update allergy",
          description: "Updates an allergy record. Requires OWNER access.",
          tags: ["Allergies"],
          requestBody: jsonBody(UpdateAllergySchema),
          responses: {
            "200": resp("Updated allergy"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteAllergy",
          summary: "Delete allergy",
          description: "Permanently deletes an allergy record. Requires OWNER access.",
          tags: ["Allergies"],
          responses: {
            "204": resp("No content"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Portals ──────────────────────────────────────────────────────────────

      "/api/portals": {
        get: {
          operationId: "listPortals",
          summary: "List portals",
          description: "Returns all patient portal entries for a profile, ordered by name. Includes optional linked facility. Requires at least READ_ONLY access.",
          tags: ["Portals"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of portal records with optional facility"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createPortal",
          summary: "Add portal",
          description: "Adds a patient portal entry to a profile. Requires OWNER access.",
          tags: ["Portals"],
          requestBody: jsonBody(CreatePortalSchema),
          responses: {
            "201": resp("Created portal"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/portals/{id}": {
        parameters: [strPathParam("id", "Portal ID")],
        get: {
          operationId: "getPortal",
          summary: "Get portal",
          description: "Returns a single portal record with linked facility.",
          tags: ["Portals"],
          responses: {
            "200": resp("Portal record"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updatePortal",
          summary: "Update portal",
          description: "Updates a portal entry. Requires OWNER access.",
          tags: ["Portals"],
          requestBody: jsonBody(UpdatePortalSchema),
          responses: {
            "200": resp("Updated portal"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deletePortal",
          summary: "Delete portal",
          description: "Permanently deletes a portal entry. Requires OWNER access.",
          tags: ["Portals"],
          responses: {
            "204": resp("No content"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Health Metrics ───────────────────────────────────────────────────────

      "/api/health-metrics": {
        get: {
          operationId: "listHealthMetrics",
          summary: "List health metrics",
          description: "Returns health metric entries for a profile, ordered by measuredAt descending. Supports optional metricType filter. Requires at least READ_ONLY access.",
          tags: ["Health Metrics"],
          parameters: [
            queryParam("profileId", "Profile ID", true),
            queryParam("metricType", "Filter by metric type (e.g. Weight, Heart Rate)"),
          ],
          responses: {
            "200": resp("Array of health metric entries"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createHealthMetric",
          summary: "Log health metric",
          description: "Records a health metric measurement. Requires OWNER access.",
          tags: ["Health Metrics"],
          requestBody: jsonBody(CreateHealthMetricSchema),
          responses: {
            "201": resp("Created health metric"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/health-metrics/{id}": {
        parameters: [strPathParam("id", "Health Metric ID")],
        get: {
          operationId: "getHealthMetric",
          summary: "Get health metric",
          description: "Returns a single health metric entry.",
          tags: ["Health Metrics"],
          responses: {
            "200": resp("Health metric entry"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateHealthMetric",
          summary: "Update health metric",
          description: "Updates a health metric entry. Requires OWNER access.",
          tags: ["Health Metrics"],
          requestBody: jsonBody(UpdateHealthMetricSchema),
          responses: {
            "200": resp("Updated health metric"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteHealthMetric",
          summary: "Delete health metric",
          description: "Permanently deletes a health metric entry. Requires OWNER access.",
          tags: ["Health Metrics"],
          responses: {
            "204": resp("No content"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Family History ───────────────────────────────────────────────────────

      "/api/family-members": {
        get: {
          operationId: "listFamilyMembers",
          summary: "List family members",
          description: "Returns all manual family member entries (with embedded conditions) for a profile, ordered by relationship then name. Requires READ_ONLY access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of family members, each with a conditions array"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createFamilyMember",
          summary: "Add family member",
          description: "Adds a manual family member entry to a profile. Requires OWNER access.",
          tags: ["Family History"],
          requestBody: jsonBody(CreateFamilyMemberSchema),
          responses: {
            "201": resp("Created family member"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/family-members/{id}": {
        parameters: [strPathParam("id", "Family Member ID")],
        get: {
          operationId: "getFamilyMember",
          summary: "Get family member",
          description: "Returns a single family member with their embedded conditions. Requires READ_ONLY access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Family member with conditions array"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
        put: {
          operationId: "updateFamilyMember",
          summary: "Update family member",
          description: "Updates a family member's name, relationship, or notes. Requires OWNER access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          requestBody: jsonBody(UpdateFamilyMemberSchema),
          responses: {
            "200": resp("Updated family member"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteFamilyMember",
          summary: "Delete family member",
          description: "Permanently deletes a family member and all their conditions (cascade). Requires OWNER access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "204": resp("No content"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/family-members/{id}/conditions": {
        parameters: [strPathParam("id", "Family Member ID")],
        post: {
          operationId: "addFamilyCondition",
          summary: "Add condition to family member",
          description: "Adds a medical condition to a manual family member entry. Requires OWNER access.",
          tags: ["Family History"],
          requestBody: jsonBody(CreateFamilyConditionSchema),
          responses: {
            "201": resp("Created family condition"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/family-members/{id}/conditions/{conditionId}": {
        parameters: [
          strPathParam("id", "Family Member ID"),
          strPathParam("conditionId", "Family Condition ID"),
        ],
        put: {
          operationId: "updateFamilyCondition",
          summary: "Update family condition",
          description: "Updates a family member condition name or notes. Requires OWNER access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          requestBody: jsonBody(UpdateFamilyConditionSchema),
          responses: {
            "200": resp("Updated family condition"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteFamilyCondition",
          summary: "Delete family condition",
          description: "Permanently deletes a condition from a family member. Requires OWNER access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "204": resp("No content"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      "/api/profile-relationships": {
        get: {
          operationId: "listProfileRelationships",
          summary: "List profile relationships",
          description:
            "Returns all profile links for the given profile. Biological relationships include the linked profile's conditions if accessible. Requires READ_ONLY access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "200": resp("Array of profile relationships with linked profile info and conditions"),
            "400": resp("Missing profileId"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        post: {
          operationId: "createProfileRelationship",
          summary: "Link a profile",
          description:
            "Links another profile as a family member. The linked profile must be accessible to the current user. Requires OWNER access on the source profile.",
          tags: ["Family History"],
          requestBody: jsonBody(CreateProfileRelationshipSchema),
          responses: {
            "201": resp("Created profile relationship"),
            "400": resp("Validation error or self-link attempt"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — no access to source or linked profile"),
          },
        },
      },

      "/api/profile-relationships/{id}": {
        parameters: [strPathParam("id", "Profile Relationship ID")],
        put: {
          operationId: "updateProfileRelationship",
          summary: "Update profile relationship",
          description: "Updates the relationship type or biological flag for a profile link. Requires OWNER access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          requestBody: jsonBody(UpdateProfileRelationshipSchema),
          responses: {
            "200": resp("Updated profile relationship"),
            "400": resp("Validation error"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
        delete: {
          operationId: "deleteProfileRelationship",
          summary: "Unlink a profile",
          description: "Removes a profile link. Does not affect either profile's data. Requires OWNER access.",
          tags: ["Family History"],
          parameters: [queryParam("profileId", "Profile ID", true)],
          responses: {
            "204": resp("No content"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
          },
        },
      },

      // ─── Import / Export ──────────────────────────────────────────────────────

      "/api/profiles/{id}/export": {
        parameters: [strPathParam("id", "Profile ID")],
        get: {
          operationId: "exportProfile",
          summary: "Export profile data",
          description:
            "Downloads a complete JSON export of the profile including all visits, medications, conditions, vaccinations, doctors, and facilities. Requires at least READ_ONLY access.",
          tags: ["Import / Export"],
          responses: {
            "200": {
              description: "JSON file download with full profile data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      version: { type: "string" },
                      exportedAt: { type: "string", format: "date-time" },
                      profile: { type: "object" },
                      visits: { type: "array" },
                      medications: { type: "array" },
                      conditions: { type: "array" },
                      vaccinations: { type: "array" },
                      doctors: { type: "array" },
                      facilities: { type: "array" },
                      allergies: { type: "array" },
                      portals: { type: "array" },
                      healthMetrics: { type: "array" },
                    },
                  },
                },
              },
            },
            "401": resp("Unauthorized"),
            "403": resp("Forbidden"),
            "404": resp("Not found"),
          },
        },
      },

      "/api/profiles/{id}/import": {
        parameters: [strPathParam("id", "Profile ID")],
        post: {
          operationId: "importProfile",
          summary: "Import profile data",
          description:
            "Imports health data from a previously exported JSON file. Merges data into the profile. Requires WRITE access.",
          tags: ["Import / Export"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "JSON export file produced by GET /api/profiles/{id}/export",
                },
              },
            },
          },
          responses: {
            "200": resp("Import summary with counts of created records"),
            "400": resp("Invalid or unrecognized import format"),
            "401": resp("Unauthorized"),
            "403": resp("Forbidden — WRITE access required"),
          },
        },
      },

      // ─── Calendar ─────────────────────────────────────────────────────────────

      "/api/calendar/{profileId}": {
        parameters: [strPathParam("profileId", "Profile ID")],
        get: {
          operationId: "getCalendarFeed",
          summary: "iCal calendar feed",
          description:
            "Returns an iCal (.ics) feed of upcoming visits for a profile. This is a public endpoint protected by a per-profile token passed as the `token` query parameter. The token is visible to OWNER-level users on the profile page.",
          tags: ["Calendar"],
          parameters: [queryParam("token", "Profile calendar token", true)],
          responses: {
            "200": {
              description: "iCal feed",
              content: { "text/calendar": { schema: { type: "string" } } },
            },
            "401": resp("Missing or invalid token"),
            "404": resp("Profile not found"),
          },
        },
      },

      // ─── NPI Lookup ───────────────────────────────────────────────────────────

      "/api/npi": {
        get: {
          operationId: "npiSearch",
          summary: "Search NPI Registry",
          description:
            "Server-side proxy to the US National Provider Identifier (NPI) Registry. Returns shaped provider or organization records for auto-filling doctor and facility forms. No API key required — the NPI Registry is public, but this endpoint requires an authenticated session.",
          tags: ["NPI Lookup"],
          parameters: [
            queryParam("q", "Name search query (last name, 'Last, First', or organization name)", true),
            {
              name: "type",
              in: "query" as const,
              required: false,
              description: "Provider type: 'individual' (NPI-1) or 'organization' (NPI-2). Defaults to organization if omitted.",
              schema: { type: "string", enum: ["individual", "organization"] },
            },
            queryParam("state", "Optional 2-character US state filter (e.g. MA, CA)"),
            {
              name: "limit",
              in: "query" as const,
              required: false,
              description: "Max results to return (1–20, default 10).",
              schema: { type: "integer", minimum: 1, maximum: 20, default: 10 },
            },
          ],
          responses: {
            "200": {
              description: "Array of shaped NPI results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      results: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            npiNumber: { type: "string", description: "10-digit NPI number" },
                            type: { type: "string", enum: ["individual", "organization"] },
                            name: { type: "string" },
                            specialty: { type: "string" },
                            phone: { type: "string" },
                            address: {
                              type: "object",
                              nullable: true,
                              properties: {
                                address1: { type: "string" },
                                address2: { type: "string" },
                                city: { type: "string" },
                                state: { type: "string" },
                                zip: { type: "string" },
                              },
                            },
                            firstName: { type: "string", description: "Individual providers only" },
                            lastName: { type: "string", description: "Individual providers only" },
                            credential: { type: "string", description: "Individual providers only (e.g. MD, DO, NP)" },
                          },
                        },
                      },
                      total: { type: "integer", description: "Total results from NPI registry" },
                    },
                  },
                },
              },
            },
            "400": resp("Invalid query parameters"),
            "401": resp("Unauthorized"),
            "502": resp("NPI registry unavailable or unreachable"),
          },
        },
      },

      // ─── Account ──────────────────────────────────────────────────────────────

      "/api/account": {
        get: {
          operationId: "getAccount",
          summary: "Get account summary",
          description: "Returns the current user's owned profiles and profiles shared with them.",
          tags: ["Account"],
          responses: {
            "200": resp("{ ownedProfiles: Profile[], sharedProfiles: Profile[] }"),
            "401": resp("Unauthorized"),
          },
        },
        delete: {
          operationId: "deleteAccount",
          summary: "Delete account",
          description:
            "Permanently deletes the user's account and all owned profiles and health data. This action is irreversible.",
          tags: ["Account"],
          responses: {
            "204": resp("Account deleted — no content"),
            "401": resp("Unauthorized"),
          },
        },
      },
    },
  };
}
