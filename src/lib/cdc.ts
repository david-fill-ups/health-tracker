import cdcData from "../../data/cdc-schedule.json";

export interface CdcAgeGroup {
  label: string;
  minAgeMonths: number;
  maxAgeMonths: number | null;
  frequency: "annual" | "booster" | "series" | "once";
  intervalMonths: number | null;
  doses: number | null;
  notes: string;
}

export interface CdcVaccineSchedule {
  vaccine: string;
  aliases: string[];
  description?: string;
  notScheduled?: boolean;
  ageGroups: CdcAgeGroup[];
}

export interface CdcSchedule {
  lastUpdated: string;
  schedules: CdcVaccineSchedule[];
}

export type VaccinationStatus = "up_to_date" | "due" | "overdue" | "not_applicable" | "completed" | "exempt" | "not_scheduled";

export interface VaccinationRecommendation {
  vaccine: string;
  aliases: string[];
  status: VaccinationStatus;
  lastDoseDate: Date | null;
  nextDueDate: Date | null;
  notes: string;
}

// Module-level cache — loaded once per server instance
const schedule = cdcData as CdcSchedule;

export function getCdcSchedule(): CdcSchedule {
  return schedule;
}

export function getCdcLastUpdated(): string {
  return schedule.lastUpdated;
}

export function vaccineToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getVaccineBySlug(slug: string): CdcVaccineSchedule | null {
  return schedule.schedules.find((v) => vaccineToSlug(v.vaccine) === slug) ?? null;
}

/**
 * Resolves a raw vaccine name (e.g. from AI import) to the canonical CDC name.
 * Returns the canonical name and whether the raw name was an alias.
 */
export function resolveCanonicalVaccineName(rawName: string): { canonical: string; isAlias: boolean } {
  const lower = rawName.toLowerCase();
  for (const entry of schedule.schedules) {
    const all = [entry.vaccine, ...entry.aliases].map((n) => n.toLowerCase());
    if (all.includes(lower)) {
      return { canonical: entry.vaccine, isAlias: entry.vaccine.toLowerCase() !== lower };
    }
  }
  return { canonical: rawName, isAlias: false };
}

/**
 * Returns ALL canonical CDC vaccine names that match rawName (by name or alias).
 * Combination vaccines like "DTaP-Hib-IPV-HepB" map to multiple canonicals
 * (DTaP, Hib, Hepatitis B, Polio). Non-combo vaccines return a single-entry set.
 */
export function getAllCanonicals(rawName: string): Set<string> {
  const lower = rawName.toLowerCase();
  const result = new Set<string>();
  for (const entry of schedule.schedules) {
    const all = [entry.vaccine, ...entry.aliases].map((n) => n.toLowerCase());
    if (all.includes(lower)) result.add(entry.vaccine);
  }
  return result;
}

/**
 * Determines vaccination status for a single vaccine entry
 * given the profile's age in months and their recorded vaccinations.
 */
export function getVaccinationStatus(
  vaccine: CdcVaccineSchedule,
  profileAgeMonths: number,
  vaccinationDates: Date[]
): VaccinationRecommendation {
  const sortedDates = [...vaccinationDates].sort((a, b) => b.getTime() - a.getTime());
  const lastDose = sortedDates[0] ?? null;

  if (vaccine.notScheduled) {
    return {
      vaccine: vaccine.vaccine,
      aliases: vaccine.aliases,
      status: "not_scheduled",
      lastDoseDate: lastDose,
      nextDueDate: null,
      notes: "No longer on the CDC recommended immunization schedule",
    };
  }

  // Find the age group that applies to this profile
  const ageGroup = vaccine.ageGroups.find((ag) => {
    const meetsMin = profileAgeMonths >= ag.minAgeMonths;
    const meetsMax = ag.maxAgeMonths === null || profileAgeMonths <= ag.maxAgeMonths;
    return meetsMin && meetsMax;
  });

  if (!ageGroup) {
    if (lastDose) {
      return {
        vaccine: vaccine.vaccine,
        aliases: vaccine.aliases,
        status: "completed",
        lastDoseDate: lastDose,
        nextDueDate: null,
        notes: "Completed — no further doses needed",
      };
    }
    return {
      vaccine: vaccine.vaccine,
      aliases: vaccine.aliases,
      status: "not_applicable",
      lastDoseDate: null,
      nextDueDate: null,
      notes: "Not recommended for this age group",
    };
  }
  const now = new Date();

  if (ageGroup.frequency === "annual" || ageGroup.frequency === "booster") {
    const intervalMs = (ageGroup.intervalMonths ?? 12) * 30 * 24 * 60 * 60 * 1000;

    if (!lastDose) {
      return {
        vaccine: vaccine.vaccine,
        aliases: vaccine.aliases,
        status: "overdue",
        lastDoseDate: null,
        nextDueDate: null,
        notes: ageGroup.notes,
      };
    }

    const nextDue = new Date(lastDose.getTime() + intervalMs);
    const isOverdue = now > nextDue;
    const isDueSoon = !isOverdue && nextDue.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000;

    return {
      vaccine: vaccine.vaccine,
      aliases: vaccine.aliases,
      status: isOverdue ? "overdue" : isDueSoon ? "due" : "up_to_date",
      lastDoseDate: lastDose,
      nextDueDate: nextDue,
      notes: ageGroup.notes,
    };
  }

  if (ageGroup.frequency === "series") {
    const requiredDoses = ageGroup.doses ?? 1;
    if (vaccinationDates.length >= requiredDoses) {
      return {
        vaccine: vaccine.vaccine,
        aliases: vaccine.aliases,
        status: "up_to_date",
        lastDoseDate: lastDose,
        nextDueDate: null,
        notes: ageGroup.notes,
      };
    }
    return {
      vaccine: vaccine.vaccine,
      aliases: vaccine.aliases,
      status: vaccinationDates.length === 0 ? "overdue" : "due",
      lastDoseDate: lastDose,
      nextDueDate: vaccinationDates.length === 0 ? null : now,
      notes: `${vaccinationDates.length}/${requiredDoses} doses completed. ${ageGroup.notes}`,
    };
  }

  // "once"
  if (lastDose) {
    return {
      vaccine: vaccine.vaccine,
      aliases: vaccine.aliases,
      status: "up_to_date",
      lastDoseDate: lastDose,
      nextDueDate: null,
      notes: ageGroup.notes,
    };
  }

  return {
    vaccine: vaccine.vaccine,
    aliases: vaccine.aliases,
    status: "overdue",
    lastDoseDate: null,
    nextDueDate: null,
    notes: ageGroup.notes,
  };
}

/**
 * Generates full vaccination recommendations for a profile.
 *
 * @param birthDate - Profile's full date of birth
 * @param vaccinationsByName - Map of vaccine name (lowercased) → array of dose dates
 */
export function generateRecommendations(
  birthDate: Date,
  vaccinationsByName: Map<string, Date[]>
): VaccinationRecommendation[] {
  const now = new Date();
  const ageMonths =
    (now.getFullYear() - birthDate.getFullYear()) * 12 +
    (now.getMonth() - birthDate.getMonth());

  return schedule.schedules.map((vaccineSchedule) => {
    // Check all name variants (vaccine + aliases)
    const allNames = [vaccineSchedule.vaccine, ...vaccineSchedule.aliases].map((n) =>
      n.toLowerCase()
    );

    const dates: Date[] = allNames.flatMap((name) => vaccinationsByName.get(name) ?? []);

    return getVaccinationStatus(vaccineSchedule, ageMonths, dates);
  });
}
