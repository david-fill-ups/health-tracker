import { EMPTY_COUNTS } from "./types";
import type {
  ExtractedEntities,
  ImportCounts,
} from "./types";

function ci(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

/**
 * Normalize a person's name for fuzzy dedup.
 * Handles honorifics, credentials, comma-separated formats, middle initials, and First/Last ordering.
 *
 * Examples:
 *   "Proshat Nikou, MD"           → "nikou proshat"
 *   "Dr. Proshat, Nikou"          → "nikou proshat"   ← matches above
 *   "Dr. Gaynes-Kaplan, Lynne, MD"→ "gaynes-kaplan lynne"
 *   "Dr. Lynne A. Gaynes-Kaplan"  → "gaynes-kaplan lynne"  ← matches above
 */
export function normalizePersonName(s: string | null | undefined): string {
  let n = ci(s);
  // Strip leading honorifics
  n = n.replace(/^(dr\.?|mr\.?|mrs\.?|ms\.?|prof\.?)\s+/, "");
  // Strip trailing credentials (with or without preceding comma)
  n = n.replace(/,?\s*(md|m\.d\.|do|d\.o\.|np|pa|dds|od|dc|pt|arnp|lcsw|pharmd|phd|rn|crna|fnp|dnp|ms|msn|aprn|bsn|other)\.?\s*$/i, "");
  // Strip "Jr." / "Sr." suffixes
  n = n.replace(/,?\s+jr\.?$/, "").replace(/,?\s+sr\.?$/, "");
  // Replace any remaining commas with spaces (handles "Last, First" format)
  n = n.replace(/,/g, " ");
  // Normalize hyphens in names to spaces so "Gaynes-Kaplan" and "Gaynes Kaplan" match
  n = n.replace(/-/g, " ");
  // Collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  // Split tokens, remove single-character tokens / initials ("A" or "A.")
  const tokens = n.split(" ").filter((t) => t.length > 0 && !/^[a-z]\.?$/.test(t));
  // Sort so "First Last" and "Last, First" both normalize to the same key
  return tokens.sort().join(" ");
}

function isoDatePart(date: string | null | undefined): string | null {
  if (!date) return null;
  // Handles both "YYYY-MM-DD" and full ISO strings
  return date.slice(0, 10);
}

/**
 * Minimal Prisma-like interface needed for deduplication queries.
 * Accepts the real PrismaClient or a transaction proxy (tx).
 */
export type DeduplicatePrisma = {
  facility: {
    findMany: (args: {
      where: { profileId: string };
      select: { name: true };
    }) => Promise<Array<{ name: string }>>;
  };
  doctor: {
    findMany: (args: {
      where: { profileId: string };
      select: { name: true };
    }) => Promise<Array<{ name: string }>>;
  };
  condition: {
    findMany: (args: {
      where: { profileId: string };
      select: { name: true };
    }) => Promise<Array<{ name: string }>>;
  };
  medication: {
    findMany: (args: {
      where: { profileId: string };
      select: { name: true; startDate: true };
    }) => Promise<Array<{ name: string; startDate: Date | null }>>;
  };
  allergy: {
    findMany: (args: {
      where: { profileId: string };
      select: { allergen: true };
    }) => Promise<Array<{ allergen: string }>>;
  };
  vaccination: {
    findMany: (args: {
      where: { profileId: string };
      select: { name: true; date: true };
    }) => Promise<Array<{ name: string; date: Date }>>;
  };
  healthMetric: {
    findMany: (args: {
      where: { profileId: string };
      select: { metricType: true; measuredAt: true };
    }) => Promise<Array<{ metricType: string; measuredAt: Date }>>;
  };
};

export interface DeduplicationResult {
  newEntities: ExtractedEntities;
  skipped: ImportCounts;
}

/**
 * Compare extracted entities against the live database and return only
 * the entities not already present.
 *
 * Dedup rules mirror the import endpoint's skip_duplicates logic:
 * - Facilities/Doctors/Conditions/Allergies: case-insensitive name match
 * - Medications: name (case-insensitive) + startDate (same calendar day)
 * - Vaccinations: name (case-insensitive) + date (same calendar day)
 * - Health metrics: metricType + measuredAt within ±60 seconds
 */
export async function deduplicateEntities(
  extracted: ExtractedEntities,
  profileId: string,
  prisma: DeduplicatePrisma
): Promise<DeduplicationResult> {
  const skipped: ImportCounts = { ...EMPTY_COUNTS };

  // Load all existing data in parallel for efficient comparison
  const [
    existingFacilities,
    existingDoctors,
    existingConditions,
    existingMedications,
    existingAllergies,
    existingVaccinations,
    existingMetrics,
  ] = await Promise.all([
    prisma.facility.findMany({
      where: { profileId },
      select: { name: true },
    }),
    prisma.doctor.findMany({
      where: { profileId },
      select: { name: true },
    }),
    prisma.condition.findMany({
      where: { profileId },
      select: { name: true },
    }),
    prisma.medication.findMany({
      where: { profileId },
      select: { name: true, startDate: true },
    }),
    prisma.allergy.findMany({
      where: { profileId },
      select: { allergen: true },
    }),
    prisma.vaccination.findMany({
      where: { profileId },
      select: { name: true, date: true },
    }),
    prisma.healthMetric.findMany({
      where: { profileId },
      select: { metricType: true, measuredAt: true },
    }),
  ]);

  // Build lookup sets
  const facilityNames = new Set(existingFacilities.map((f) => ci(f.name)));
  const doctorNames = new Set(existingDoctors.flatMap((d) => [ci(d.name), normalizePersonName(d.name)]));
  const conditionNames = new Set(existingConditions.map((c) => ci(c.name)));
  const allergenNames = new Set(existingAllergies.map((a) => ci(a.allergen)));

  const medicationKeys = new Set(
    existingMedications.map(
      (m) =>
        `${ci(m.name)}|${m.startDate ? new Date(m.startDate).toISOString().slice(0, 10) : ""}`
    )
  );

  const vaccinationKeys = new Set(
    existingVaccinations.map(
      (v) => `${ci(v.name)}|${new Date(v.date).toISOString().slice(0, 10)}`
    )
  );

  const metricEntries = existingMetrics.map((m) => ({
    type: m.metricType,
    ts: new Date(m.measuredAt).getTime(),
  }));

  // Filter each entity type
  const newFacilities = extracted.facilities.filter((f) => {
    if (facilityNames.has(ci(f.name))) {
      skipped.facilities++;
      return false;
    }
    return true;
  });

  const newDoctors = extracted.doctors.filter((d) => {
    if (doctorNames.has(ci(d.name)) || doctorNames.has(normalizePersonName(d.name))) {
      skipped.doctors++;
      return false;
    }
    return true;
  });

  const newConditions = extracted.conditions.filter((c) => {
    if (conditionNames.has(ci(c.name))) {
      skipped.conditions++;
      return false;
    }
    return true;
  });

  const newMedications = extracted.medications.filter((m) => {
    const key = `${ci(m.name)}|${isoDatePart(m.startDate) ?? ""}`;
    if (medicationKeys.has(key)) {
      skipped.medications++;
      return false;
    }
    return true;
  });

  const newAllergies = extracted.allergies.filter((a) => {
    if (allergenNames.has(ci(a.allergen))) {
      skipped.allergies++;
      return false;
    }
    return true;
  });

  const newVaccinations = extracted.vaccinations.filter((v) => {
    const key = `${ci(v.name)}|${isoDatePart(v.date) ?? ""}`;
    if (vaccinationKeys.has(key)) {
      skipped.vaccinations++;
      return false;
    }
    return true;
  });

  const newHealthMetrics = extracted.healthMetrics.filter((m) => {
    const ts = new Date(m.measuredAt).getTime();
    if (isNaN(ts)) return false; // skip unparseable dates
    const isDup = metricEntries.some(
      (e) => e.type === m.metricType && Math.abs(e.ts - ts) <= 60_000
    );
    if (isDup) {
      skipped.healthMetrics++;
      return false;
    }
    return true;
  });

  return {
    newEntities: {
      facilities: newFacilities,
      doctors: newDoctors,
      medications: newMedications,
      conditions: newConditions,
      allergies: newAllergies,
      vaccinations: newVaccinations,
      healthMetrics: newHealthMetrics,
    },
    skipped,
  };
}
