/**
 * Shared TypeScript types and Zod schemas.
 * API route-specific Zod schemas live in their respective route files.
 * This file exports types that are shared across client and server code.
 */

import type {
  User,
  Profile,
  Facility,
  Location,
  Doctor,
  Visit,
  Medication,
  MedicationLog,
  Condition,
  Vaccination,
  ProfilePermission,
  FacilityType,
  VisitType,
  VisitStatus,
  ConditionStatus,
  Sex,
} from "@/generated/prisma";

// Re-export Prisma types for convenience
export type {
  User,
  Profile,
  Facility,
  Location,
  Doctor,
  Visit,
  Medication,
  MedicationLog,
  Condition,
  Vaccination,
  ProfilePermission,
  FacilityType,
  VisitType,
  VisitStatus,
  ConditionStatus,
  Sex,
};

// ─── Enriched relation types ──────────────────────────────────────────────────

export type ProfileWithAccess = Profile & {
  access: { permission: ProfilePermission }[];
};

export type VisitWithRelations = Visit & {
  doctor: Doctor | null;
  facility: Facility | null;
  location: Location | null;
};

export type MedicationWithLogs = Medication & {
  logs: MedicationLog[];
  prescribingDoctor: Doctor | null;
};

export type FacilityWithLocations = Facility & {
  locations: Location[];
  doctors: Doctor[];
};

// ─── API response envelope ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Session user augmentation ────────────────────────────────────────────────
// Augments next-auth session user to include the DB user ID

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
