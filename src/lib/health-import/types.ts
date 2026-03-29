// Shared types for the health document import pipeline.
// Used by both the bulk CLI script and future per-visit API routes.

export interface ExtractedFacility {
  name: string;
  type?: string; // Clinic | Hospital | Lab | Pharmacy | Urgent Care | Dental | Imaging | Supplier | Other
  phone?: string;
  address?: string; // free-form; stored in notes since Facility has no address fields
  notes?: string;
}

export interface ExtractedDoctor {
  name: string;
  specialty?: string;
  credential?: string; // MD, DO, NP, PA, DDS, OD, DC, PT, etc.
  facilityName?: string; // resolved to facilityId during write
  phone?: string;
  notes?: string;
}

export interface ExtractedMedication {
  name: string;
  type?: string; // ORAL | INJECTABLE | TOPICAL | INHALER | SUPPLEMENT | DEVICE | OTHER
  dosage?: string;
  frequency?: string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  prescriberName?: string; // resolved to prescribingDoctorId during write
  active?: boolean;
  instructions?: string;
  notes?: string;
}

export interface ExtractedCondition {
  name: string;
  diagnosisDate?: string; // YYYY-MM-DD
  status?: string; // ACTIVE | RESOLVED | MONITORING | BENIGN
  notes?: string;
}

export interface ExtractedAllergy {
  allergen: string;
  category?: string; // Environmental | Food | Drug | Insect | Other
  diagnosisDate?: string; // YYYY-MM-DD
  notes?: string;
}

export interface ExtractedVaccination {
  name: string;
  date: string; // YYYY-MM-DD
  facilityName?: string; // resolved to facilityId during write
  lotNumber?: string;
  notes?: string;
}

export interface ExtractedHealthMetric {
  metricType: string; // weight | blood_pressure_systolic | blood_pressure_diastolic | blood_sugar_fasting | blood_sugar_postmeal | heart_rate | blood_oxygen
  value: number;
  unit: string;
  measuredAt: string; // YYYY-MM-DDTHH:mm:ss
  notes?: string;
}

export interface ExtractedEntities {
  facilities: ExtractedFacility[];
  doctors: ExtractedDoctor[];
  medications: ExtractedMedication[];
  conditions: ExtractedCondition[];
  allergies: ExtractedAllergy[];
  vaccinations: ExtractedVaccination[];
  healthMetrics: ExtractedHealthMetric[];
}

export interface ImportCounts {
  facilities: number;
  doctors: number;
  medications: number;
  conditions: number;
  allergies: number;
  vaccinations: number;
  healthMetrics: number;
}

export const EMPTY_COUNTS: ImportCounts = {
  facilities: 0,
  doctors: 0,
  medications: 0,
  conditions: 0,
  allergies: 0,
  vaccinations: 0,
  healthMetrics: 0,
};

export const EMPTY_ENTITIES: ExtractedEntities = {
  facilities: [],
  doctors: [],
  medications: [],
  conditions: [],
  allergies: [],
  vaccinations: [],
  healthMetrics: [],
};

export interface FolderResult {
  folderName: string;
  visitDate: string | null;
  extracted: ExtractedEntities;
  newEntities: ExtractedEntities; // after dedup
  skipped: ImportCounts;
  fileCount: number;
  processedFiles: string[];
  error?: string;
}

/** Progress state persisted between runs so the script can resume. */
export interface ImportProgress {
  profileId: string;
  processedFolders: Record<string, FolderResult>;
  startedAt: string;
  lastUpdatedAt: string;
}
