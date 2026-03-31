// Types for the web-based AI document import pipeline.
// Distinct from the CLI pipeline in src/lib/health-import/ — this one
// supports a review/approval flow with CREATE / UPDATE / MERGE_CANDIDATE items.

export type EntityType =
  | "facility"
  | "location"
  | "doctor"
  | "visit"
  | "medication"
  | "condition"
  | "allergy"
  | "vaccination"
  | "health_metric";

export type ProposalAction = "create" | "update" | "merge_candidate";
export type ProposalStatus = "pending" | "approved" | "rejected";

export interface ProposalItem {
  id: string; // client-side stable key (UUID)
  action: ProposalAction;
  entityType: EntityType;
  status: ProposalStatus;
  label: string; // human-readable summary, e.g. "Levothyroxine 125mcg"

  // CREATE: the full object to be written
  data?: Record<string, unknown>;

  // UPDATE: patch fields on an existing record
  entityId?: string;
  entityLabel?: string; // display name of the existing record
  currentData?: Record<string, unknown>;
  proposedChanges?: Record<string, unknown>; // only the fields that differ
  changedFields?: string[]; // field names that changed

  // MERGE_CANDIDATE: extracted name is similar but not identical to an existing record
  existingId?: string;
  existingName?: string;
  extractedName?: string;
  recommendation?: string; // e.g. "Keep existing name: Rita Pabla, MD"
}

export interface ImportProposal {
  items: ProposalItem[];
  skippedCount: number; // exact duplicates silently omitted
  warnings?: string[]; // non-fatal issues (oversized file skipped, etc.)
}

export interface ApplyRequest {
  profileId: string;
  items: ProposalItem[]; // caller sends only the approved items
}

export type EntityCounts = Record<EntityType, number>;

export interface ApplyResult {
  created: EntityCounts;
  updated: EntityCounts;
  merged: EntityCounts;
}

// ── Extracted entity types for the web pipeline ────────────────────────────

export interface WebExtractedFacility {
  name: string;
  type?: string;
  phone?: string;
  address?: string;
  websiteUrl?: string;
  npiNumber?: string;
  notes?: string;
}

export interface WebExtractedDoctor {
  name: string;
  specialty?: string;
  credential?: string;
  facilityName?: string;
  phone?: string;
  npiNumber?: string;
  notes?: string;
}

export interface WebExtractedVisit {
  date?: string; // YYYY-MM-DD
  type?: string; // ROUTINE | LAB | SPECIALIST | URGENT | TELEHEALTH | PROCEDURE | OTHER
  reason?: string;
  specialty?: string;
  facilityName?: string;
  doctorName?: string;
  notes?: string;
}

export interface WebExtractedMedication {
  name: string;
  type?: string;
  dosage?: string;
  frequency?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  prescriberName?: string;
  active?: boolean;
  instructions?: string;
  notes?: string;
}

export interface WebExtractedCondition {
  name: string;
  diagnosisDate?: string;
  status?: string;
  notes?: string;
}

export interface WebExtractedAllergy {
  allergen: string;
  category?: string;
  diagnosisDate?: string;
  notes?: string;
}

export interface WebExtractedVaccination {
  name: string;
  date: string; // YYYY-MM-DD
  facilityName?: string;
  lotNumber?: string;
  notes?: string;
}

export interface WebExtractedHealthMetric {
  metricType: string;
  value: number;
  unit: string;
  measuredAt: string; // ISO datetime
  notes?: string;
}

export interface WebExtractedEntities {
  facilities: WebExtractedFacility[];
  doctors: WebExtractedDoctor[];
  visits: WebExtractedVisit[];
  medications: WebExtractedMedication[];
  conditions: WebExtractedCondition[];
  allergies: WebExtractedAllergy[];
  vaccinations: WebExtractedVaccination[];
  healthMetrics: WebExtractedHealthMetric[];
}

export const EMPTY_WEB_ENTITIES: WebExtractedEntities = {
  facilities: [],
  doctors: [],
  visits: [],
  medications: [],
  conditions: [],
  allergies: [],
  vaccinations: [],
  healthMetrics: [],
};

export interface WebUploadedFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}
