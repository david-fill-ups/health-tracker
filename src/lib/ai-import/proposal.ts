import { randomUUID } from "crypto";
import { normalizePersonName } from "@/lib/health-import/deduplicate";
import { getAllCanonicals } from "@/lib/cdc";
import type {
  WebExtractedEntities,
  ProposalItem,
  ImportProposal,
  EntityType,
} from "./types";

// ── Helpers ────────────────────────────────────────────────────────────────

function ci(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function isoDatePart(d: string | null | undefined): string | null {
  if (!d) return null;
  return d.slice(0, 10);
}

/** Similarity between two strings (0–1). Simple token overlap. */
function nameSimilarity(a: string, b: string): number {
  const tokA = new Set(ci(a).split(/\s+/).filter((t) => t.length > 2));
  const tokB = new Set(ci(b).split(/\s+/).filter((t) => t.length > 2));
  if (tokA.size === 0 || tokB.size === 0) return 0;
  let overlap = 0;
  for (const t of tokA) if (tokB.has(t)) overlap++;
  return overlap / Math.max(tokA.size, tokB.size);
}

function make(
  action: ProposalItem["action"],
  entityType: EntityType,
  label: string,
  extra: Partial<ProposalItem>
): ProposalItem {
  return { id: randomUUID(), action, entityType, status: "pending", label, ...extra };
}

// ── Prisma interface ───────────────────────────────────────────────────────

export type ProposalPrisma = {
  facility: {
    findMany: (args: {
      where: { profileId: string };
      select: { id: true; name: true; phone: true; npiNumber: true; websiteUrl: true; notes: true };
    }) => Promise<Array<{ id: string; name: string; phone: string | null; npiNumber: string | null; websiteUrl: string | null; notes: string | null }>>;
  };
  doctor: {
    findMany: (args: {
      where: { profileId: string };
      select: { id: true; name: true; phone: true; npiNumber: true; specialty: true; credential: true; notes: true };
    }) => Promise<Array<{ id: string; name: string; phone: string | null; npiNumber: string | null; specialty: string | null; credential: string | null; notes: string | null }>>;
  };
  visit: {
    findMany: (args: {
      where: { profileId: string };
      select: { id: true; date: true; dueMonth: true; reason: true; notes: true; doctor: { select: { name: true } }; facility: { select: { name: true } } };
    }) => Promise<Array<{ id: string; date: Date | null; dueMonth: string | null; reason: string | null; notes: string | null; doctor: { name: string } | null; facility: { name: string } | null }>>;
  };
  medication: {
    findMany: (args: {
      where: { profileId: string };
      select: { id: true; name: true; dosage: true; frequency: true; startDate: true; active: true; instructions: true };
    }) => Promise<Array<{ id: string; name: string; dosage: string | null; frequency: string | null; startDate: Date | null; active: boolean; instructions: string | null }>>;
  };
  condition: {
    findMany: (args: {
      where: { profileId: string };
      select: { id: true; name: true; status: true; notes: true; diagnosisDate: true };
    }) => Promise<Array<{ id: string; name: string; status: string; notes: string | null; diagnosisDate: Date | null }>>;
  };
  allergy: {
    findMany: (args: {
      where: { profileId: string };
      select: { id: true; allergen: true; category: true; notes: true };
    }) => Promise<Array<{ id: string; allergen: string; category: string | null; notes: string | null }>>;
  };
  dose: {
    findMany: (args: {
      where: { profileId: string };
      select: { date: true; vaccinations: { select: { vaccination: { select: { name: true } } } } };
    }) => Promise<Array<{ date: Date; vaccinations: Array<{ vaccination: { name: string } }> }>>;
  };
  healthMetric: {
    findMany: (args: {
      where: { profileId: string };
      select: { metricType: true; measuredAt: true };
    }) => Promise<Array<{ metricType: string; measuredAt: Date }>>;
  };
};

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Compare extracted entities against live DB data and produce a proposal.
 *
 * Returns ProposalItems for:
 * - CREATE: no match found
 * - UPDATE: matched record with differing fields
 * - MERGE_CANDIDATE: fuzzy name match (different spelling, credentials, etc.)
 *
 * Exact duplicates are counted in skippedCount and omitted from items.
 */
export async function generateImportProposal(
  extracted: WebExtractedEntities,
  profileId: string,
  prisma: ProposalPrisma,
  visitId?: string
): Promise<ImportProposal> {
  const items: ProposalItem[] = [];
  let skippedCount = 0;

  // Load all existing data in parallel
  const [
    existingFacilities,
    existingDoctors,
    existingVisits,
    existingMedications,
    existingConditions,
    existingAllergies,
    existingDoses,
    existingMetrics,
  ] = await Promise.all([
    prisma.facility.findMany({
      where: { profileId },
      select: { id: true, name: true, phone: true, npiNumber: true, websiteUrl: true, notes: true },
    }),
    prisma.doctor.findMany({
      where: { profileId },
      select: { id: true, name: true, phone: true, npiNumber: true, specialty: true, credential: true, notes: true },
    }),
    prisma.visit.findMany({
      where: { profileId },
      select: { id: true, date: true, dueMonth: true, reason: true, notes: true, doctor: { select: { name: true } }, facility: { select: { name: true } } },
    }),
    prisma.medication.findMany({
      where: { profileId },
      select: { id: true, name: true, dosage: true, frequency: true, startDate: true, active: true, instructions: true },
    }),
    prisma.condition.findMany({
      where: { profileId },
      select: { id: true, name: true, status: true, notes: true, diagnosisDate: true },
    }),
    prisma.allergy.findMany({
      where: { profileId },
      select: { id: true, allergen: true, category: true, notes: true },
    }),
    prisma.dose.findMany({
      where: { profileId },
      select: { date: true, vaccinations: { select: { vaccination: { select: { name: true } } } } },
    }),
    prisma.healthMetric.findMany({
      where: { profileId },
      select: { metricType: true, measuredAt: true },
    }),
  ]);

  // ── Facilities ─────────────────────────────────────────────────────────
  for (const f of extracted.facilities) {
    const exactMatch = existingFacilities.find((e) => ci(e.name) === ci(f.name));

    if (exactMatch) {
      // Check if there are new fields to add
      const changes: Record<string, unknown> = {};
      const changedFields: string[] = [];
      if (f.phone && !exactMatch.phone) { changes.phone = f.phone; changedFields.push("phone"); }
      if (f.websiteUrl && !exactMatch.websiteUrl) { changes.websiteUrl = f.websiteUrl; changedFields.push("websiteUrl"); }
      if (f.npiNumber && !exactMatch.npiNumber) { changes.npiNumber = f.npiNumber; changedFields.push("npiNumber"); }

      if (changedFields.length > 0) {
        items.push(make("update", "facility", exactMatch.name, {
          entityId: exactMatch.id,
          entityLabel: exactMatch.name,
          currentData: { phone: exactMatch.phone, websiteUrl: exactMatch.websiteUrl, npiNumber: exactMatch.npiNumber },
          proposedChanges: changes,
          changedFields,
        }));
      } else {
        skippedCount++;
      }
      continue;
    }

    // Fuzzy match: significant token overlap
    const fuzzy = existingFacilities.find((e) => nameSimilarity(e.name, f.name) >= 0.6);
    if (fuzzy) {
      items.push(make("merge_candidate", "facility", f.name, {
        existingId: fuzzy.id,
        existingName: fuzzy.name,
        extractedName: f.name,
        recommendation: `Keep existing name: "${fuzzy.name}"`,
        data: { name: f.name, type: f.type, phone: f.phone, notes: f.notes, websiteUrl: f.websiteUrl, npiNumber: f.npiNumber },
      }));
      continue;
    }

    items.push(make("create", "facility", f.name, {
      data: { name: f.name, type: f.type ?? "Clinic", phone: f.phone, address: f.address, websiteUrl: f.websiteUrl, npiNumber: f.npiNumber, notes: f.notes },
    }));
  }

  // ── Doctors ────────────────────────────────────────────────────────────
  for (const d of extracted.doctors) {
    const normExtracted = normalizePersonName(d.name);

    const exactMatch = existingDoctors.find(
      (e) => ci(e.name) === ci(d.name) || normalizePersonName(e.name) === normExtracted
    );

    if (exactMatch) {
      const changes: Record<string, unknown> = {};
      const changedFields: string[] = [];
      if (d.phone && !exactMatch.phone) { changes.phone = d.phone; changedFields.push("phone"); }
      if (d.npiNumber && !exactMatch.npiNumber) { changes.npiNumber = d.npiNumber; changedFields.push("npiNumber"); }
      if (d.specialty && !exactMatch.specialty) { changes.specialty = d.specialty; changedFields.push("specialty"); }
      if (d.credential && !exactMatch.credential) { changes.credential = d.credential; changedFields.push("credential"); }

      if (changedFields.length > 0) {
        items.push(make("update", "doctor", exactMatch.name, {
          entityId: exactMatch.id,
          entityLabel: exactMatch.name,
          currentData: { phone: exactMatch.phone, npiNumber: exactMatch.npiNumber, specialty: exactMatch.specialty, credential: exactMatch.credential },
          proposedChanges: changes,
          changedFields,
        }));
      } else {
        skippedCount++;
      }
      continue;
    }

    // Fuzzy: normalized token overlap
    const fuzzy = existingDoctors.find((e) => {
      const normExisting = normalizePersonName(e.name);
      return nameSimilarity(normExisting, normExtracted) >= 0.67;
    });

    if (fuzzy) {
      items.push(make("merge_candidate", "doctor", d.name, {
        existingId: fuzzy.id,
        existingName: fuzzy.name,
        extractedName: d.name,
        recommendation: `Keep existing name: "${fuzzy.name}"`,
        data: { name: d.name, specialty: d.specialty, credential: d.credential, phone: d.phone, npiNumber: d.npiNumber, notes: d.notes },
      }));
      continue;
    }

    items.push(make("create", "doctor", d.name, {
      data: { name: d.name, specialty: d.specialty, credential: d.credential, facilityName: d.facilityName, phone: d.phone, npiNumber: d.npiNumber, notes: d.notes },
    }));
  }

  // ── Visits ─────────────────────────────────────────────────────────────
  for (const v of extracted.visits) {
    // If opened from a specific visit page, link to that visit
    if (visitId && v.notes) {
      const targetVisit = existingVisits.find((e) => e.id === visitId);
      if (targetVisit && v.date && targetVisit.date) {
        const visitDateStr = new Date(targetVisit.date).toISOString().slice(0, 10);
        if (visitDateStr === v.date || !v.date) {
          // Update this specific visit's notes
          const changes: Record<string, unknown> = {};
          const changedFields: string[] = [];
          if (v.notes && v.notes !== targetVisit.notes) { changes.notes = v.notes; changedFields.push("notes"); }
          if (v.reason && !targetVisit.reason) { changes.reason = v.reason; changedFields.push("reason"); }

          if (changedFields.length > 0) {
            items.push(make("update", "visit", v.date ?? "Visit", {
              entityId: visitId,
              entityLabel: targetVisit.date ? new Date(targetVisit.date).toLocaleDateString() : "Visit",
              currentData: { notes: targetVisit.notes, reason: targetVisit.reason },
              proposedChanges: changes,
              changedFields,
            }));
          } else {
            skippedCount++;
          }
          continue;
        }
      }
    }

    // Try to match by date + doctor/facility
    const visitDateStr = v.date;
    if (visitDateStr) {
      const matchByDate = existingVisits.find((e) => {
        const eDate = e.date ? new Date(e.date).toISOString().slice(0, 10) : null;
        if (eDate !== visitDateStr) return false;
        if (v.doctorName && e.doctor) return ci(e.doctor.name).includes(ci(v.doctorName.split(" ").pop() ?? ""));
        if (v.facilityName && e.facility) return nameSimilarity(e.facility.name, v.facilityName) >= 0.5;
        return true; // date match is enough if no other context
      });

      if (matchByDate) {
        const changes: Record<string, unknown> = {};
        const changedFields: string[] = [];
        if (v.notes && v.notes !== matchByDate.notes) { changes.notes = v.notes; changedFields.push("notes"); }
        if (v.reason && !matchByDate.reason) { changes.reason = v.reason; changedFields.push("reason"); }

        if (changedFields.length > 0) {
          items.push(make("update", "visit", visitDateStr, {
            entityId: matchByDate.id,
            entityLabel: matchByDate.date ? new Date(matchByDate.date).toLocaleDateString() : visitDateStr,
            currentData: { notes: matchByDate.notes, reason: matchByDate.reason },
            proposedChanges: changes,
            changedFields,
          }));
        } else {
          skippedCount++;
        }
        continue;
      }
    }

    // New visit
    const label = v.date ?? "Visit";
    items.push(make("create", "visit", label, {
      data: {
        date: v.date,
        type: v.type ?? "ROUTINE",
        reason: v.reason,
        specialty: v.specialty,
        facilityName: v.facilityName,
        doctorName: v.doctorName,
        notes: v.notes,
      },
    }));
  }

  // ── Medications ────────────────────────────────────────────────────────
  for (const m of extracted.medications) {
    const sameNameSameDate = existingMedications.find((e) => {
      const ciMatch = ci(e.name) === ci(m.name);
      if (!ciMatch) return false;
      const eDate = e.startDate ? new Date(e.startDate).toISOString().slice(0, 10) : null;
      const mDate = isoDatePart(m.startDate);
      // Match if both dates are missing or both match
      return !eDate || !mDate || eDate === mDate;
    });

    if (sameNameSameDate) {
      const changes: Record<string, unknown> = {};
      const changedFields: string[] = [];

      if (m.dosage && m.dosage !== sameNameSameDate.dosage) {
        changes.dosage = m.dosage;
        changes._previousDosage = sameNameSameDate.dosage;
        changedFields.push("dosage");
      }
      if (m.frequency && m.frequency !== sameNameSameDate.frequency) {
        changes.frequency = m.frequency;
        changedFields.push("frequency");
      }
      if (m.active !== undefined && m.active !== sameNameSameDate.active) {
        changes.active = m.active;
        changedFields.push("active");
      }
      if (m.instructions && !sameNameSameDate.instructions) {
        changes.instructions = m.instructions;
        changedFields.push("instructions");
      }

      if (changedFields.length > 0) {
        const dosageLabel = m.dosage ? ` ${m.dosage}` : "";
        items.push(make("update", "medication", `${sameNameSameDate.name}${dosageLabel}`, {
          entityId: sameNameSameDate.id,
          entityLabel: sameNameSameDate.name,
          currentData: {
            dosage: sameNameSameDate.dosage,
            frequency: sameNameSameDate.frequency,
            active: sameNameSameDate.active,
            instructions: sameNameSameDate.instructions,
          },
          proposedChanges: changes,
          changedFields,
        }));
      } else {
        skippedCount++;
      }
      continue;
    }

    const dosageLabel = m.dosage ? ` ${m.dosage}` : "";
    items.push(make("create", "medication", `${m.name}${dosageLabel}`, {
      data: {
        name: m.name,
        type: m.type,
        dosage: m.dosage,
        frequency: m.frequency,
        startDate: m.startDate,
        endDate: m.endDate,
        prescriberName: m.prescriberName,
        active: m.active ?? true,
        instructions: m.instructions,
      },
    }));
  }

  // ── Conditions ─────────────────────────────────────────────────────────
  for (const c of extracted.conditions) {
    const exactMatch = existingConditions.find((e) => ci(e.name) === ci(c.name));

    if (exactMatch) {
      const changes: Record<string, unknown> = {};
      const changedFields: string[] = [];
      if (c.status && c.status !== exactMatch.status) { changes.status = c.status; changedFields.push("status"); }
      if (c.notes && !exactMatch.notes) { changes.notes = c.notes; changedFields.push("notes"); }
      if (c.diagnosisDate && !exactMatch.diagnosisDate) { changes.diagnosisDate = c.diagnosisDate; changedFields.push("diagnosisDate"); }

      if (changedFields.length > 0) {
        items.push(make("update", "condition", exactMatch.name, {
          entityId: exactMatch.id,
          entityLabel: exactMatch.name,
          currentData: { status: exactMatch.status, notes: exactMatch.notes, diagnosisDate: exactMatch.diagnosisDate?.toISOString().slice(0, 10) },
          proposedChanges: changes,
          changedFields,
        }));
      } else {
        skippedCount++;
      }
      continue;
    }

    items.push(make("create", "condition", c.name, {
      data: { name: c.name, diagnosisDate: c.diagnosisDate, status: c.status ?? "ACTIVE", notes: c.notes },
    }));
  }

  // ── Allergies ──────────────────────────────────────────────────────────
  for (const a of extracted.allergies) {
    const exactMatch = existingAllergies.find((e) => ci(e.allergen) === ci(a.allergen));

    if (exactMatch) {
      const changes: Record<string, unknown> = {};
      const changedFields: string[] = [];
      if (a.category && !exactMatch.category) { changes.category = a.category; changedFields.push("category"); }
      if (a.notes && !exactMatch.notes) { changes.notes = a.notes; changedFields.push("notes"); }

      if (changedFields.length > 0) {
        items.push(make("update", "allergy", exactMatch.allergen, {
          entityId: exactMatch.id,
          entityLabel: exactMatch.allergen,
          currentData: { category: exactMatch.category, notes: exactMatch.notes },
          proposedChanges: changes,
          changedFields,
        }));
      } else {
        skippedCount++;
      }
      continue;
    }

    items.push(make("create", "allergy", a.allergen, {
      data: { allergen: a.allergen, category: a.category, diagnosisDate: a.diagnosisDate, notes: a.notes },
    }));
  }

  // ── Vaccinations ───────────────────────────────────────────────────────
  for (const v of extracted.vaccinations) {
    const extractedDate = isoDatePart(v.date) ?? "";
    const extractedCanonicals = getAllCanonicals(v.name);
    const isDup = existingDoses.some((e) => {
      const existingDate = new Date(e.date).toISOString().slice(0, 10);
      if (existingDate !== extractedDate) return false;
      // Check all vaccination names linked to this existing dose
      for (const dv of e.vaccinations) {
        const existingName = dv.vaccination.name;
        if (ci(existingName) === ci(v.name)) return true;
        // Alias-aware: if both names cover the same CDC vaccine, treat as duplicate
        const existingCanonicals = getAllCanonicals(existingName);
        for (const c of extractedCanonicals) {
          if (existingCanonicals.has(c)) return true;
        }
      }
      return false;
    });

    if (isDup) {
      skippedCount++;
      continue;
    }

    items.push(make("create", "vaccination", `${v.name} (${v.date})`, {
      data: { name: v.name, date: v.date, facilityName: v.facilityName, lotNumber: v.lotNumber, notes: v.notes },
    }));
  }

  // ── Health Metrics ─────────────────────────────────────────────────────
  const metricEntries = existingMetrics.map((m) => ({
    type: m.metricType,
    ts: new Date(m.measuredAt).getTime(),
  }));

  for (const m of extracted.healthMetrics) {
    const ts = new Date(m.measuredAt).getTime();
    if (isNaN(ts)) continue;

    const isDup = metricEntries.some(
      (e) => e.type === m.metricType && Math.abs(e.ts - ts) <= 60_000
    );
    if (isDup) {
      skippedCount++;
      continue;
    }

    items.push(make("create", "health_metric", `${m.metricType}: ${m.value} ${m.unit}`, {
      data: { metricType: m.metricType, value: m.value, unit: m.unit, measuredAt: m.measuredAt, notes: m.notes },
    }));
  }

  return { items, skippedCount };
}
