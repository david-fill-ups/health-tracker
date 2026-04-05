import { EMPTY_COUNTS } from "./types";
import type { ExtractedEntities, ImportCounts } from "./types";
import { resolveCanonicalVaccineName } from "@/lib/cdc";

function ci(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function normalizePersonName(s: string | null | undefined): string {
  let n = ci(s);
  n = n.replace(/^dr\.?\s+/, "");
  n = n.replace(/,?\s+(md|m\.d\.|do|d\.o\.|np|pa|dds|od|dc|pt|arnp|lcsw|pharmd|phd|rn|crna|fnp|dnp|ms|msn|aprn|bsn)\.?$/, "");
  return n.trim();
}

/**
 * Minimal Prisma-like interface needed for write operations.
 * Accepts the real PrismaClient or a transaction proxy (tx).
 */
export type WritePrisma = {
  facility: {
    findMany: (args: {
      where: { profileId: string };
      select: { id: true; name: true };
    }) => Promise<Array<{ id: string; name: string }>>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  doctor: {
    findMany: (args: {
      where: { profileId: string };
      select: { id: true; name: true };
    }) => Promise<Array<{ id: string; name: string }>>;
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  condition: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  medication: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  allergy: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  vaccination: {
    upsert: (args: {
      where: { profileId_name: { profileId: string; name: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  dose: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  healthMetric: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  };
};

/**
 * Write new (already-deduplicated) entities to the database.
 *
 * Order matters:
 * 1. Facilities first (doctors + vaccinations reference them)
 * 2. Doctors next (medications reference prescribers)
 * 3. Everything else
 *
 * FK references use name-based lookup so a prescriber or facility that
 * already existed in the DB (and was skipped by dedup) can still be linked.
 */
export async function writeNewEntities(
  entities: ExtractedEntities,
  profileId: string,
  prisma: WritePrisma
): Promise<ImportCounts> {
  const counts: ImportCounts = { ...EMPTY_COUNTS };

  // ── Pre-populate name→id maps from existing DB records ──
  // This ensures FK references work even when the target was skipped (already existed)
  const [existingFacilities, existingDoctors] = await Promise.all([
    prisma.facility.findMany({
      where: { profileId },
      select: { id: true, name: true },
    }),
    prisma.doctor.findMany({
      where: { profileId },
      select: { id: true, name: true },
    }),
  ]);

  const facilityIdByName = new Map<string, string>(
    existingFacilities.map((f) => [ci(f.name), f.id])
  );
  const doctorIdByName = new Map<string, string>();
  for (const d of existingDoctors) {
    doctorIdByName.set(ci(d.name), d.id);
    doctorIdByName.set(normalizePersonName(d.name), d.id);
  }

  // ── 1. Facilities ──
  for (const f of entities.facilities) {
    const notes = [f.notes, f.address ? `Address: ${f.address}` : null]
      .filter(Boolean)
      .join("\n");

    const created = await prisma.facility.create({
      data: {
        profileId,
        name: f.name,
        type: f.type ?? "Clinic",
        phone: f.phone ?? undefined,
        notes: notes || undefined,
        active: true,
      },
    });
    facilityIdByName.set(ci(f.name), created.id);
    counts.facilities++;
  }

  // ── 2. Doctors ──
  for (const d of entities.doctors) {
    const facilityId = d.facilityName
      ? facilityIdByName.get(ci(d.facilityName))
      : undefined;

    const created = await prisma.doctor.create({
      data: {
        profileId,
        name: d.name,
        specialty: d.specialty ?? undefined,
        credential: d.credential ?? undefined,
        facilityId: facilityId ?? undefined,
        phone: d.phone ?? undefined,
        notes: d.notes ?? undefined,
        active: true,
      },
    });
    doctorIdByName.set(ci(d.name), created.id);
    doctorIdByName.set(normalizePersonName(d.name), created.id);
    counts.doctors++;
  }

  // ── 3. Conditions ──
  for (const c of entities.conditions) {
    await prisma.condition.create({
      data: {
        profileId,
        name: c.name,
        diagnosisDate: c.diagnosisDate ? new Date(c.diagnosisDate) : undefined,
        status: c.status ?? "ACTIVE",
        notes: c.notes ?? undefined,
      },
    });
    counts.conditions++;
  }

  // ── 4. Medications ──
  for (const m of entities.medications) {
    const prescribingDoctorId = m.prescriberName
      ? (doctorIdByName.get(ci(m.prescriberName)) ?? doctorIdByName.get(normalizePersonName(m.prescriberName)))
      : undefined;

    await prisma.medication.create({
      data: {
        profileId,
        name: m.name,
        medicationType: m.type ?? "ORAL",
        dosage: m.dosage ?? undefined,
        frequency: m.frequency ?? undefined,
        prescribingDoctorId: prescribingDoctorId ?? undefined,
        startDate: m.startDate ? new Date(m.startDate) : undefined,
        endDate: m.endDate ? new Date(m.endDate) : undefined,
        instructions: m.instructions ?? undefined,
        active: m.active ?? true,
      },
    });
    counts.medications++;
  }

  // ── 5. Allergies ──
  for (const a of entities.allergies) {
    await prisma.allergy.create({
      data: {
        profileId,
        allergen: a.allergen,
        category: a.category ?? undefined,
        diagnosisDate: a.diagnosisDate ? new Date(a.diagnosisDate) : undefined,
        notes: a.notes ?? undefined,
      },
    });
    counts.allergies++;
  }

  // ── 6. Vaccinations ──
  for (const v of entities.vaccinations) {
    const facilityId = v.facilityName
      ? facilityIdByName.get(ci(v.facilityName))
      : undefined;

    const { canonical, isAlias } = resolveCanonicalVaccineName(v.name);
    const aliasesToAdd = isAlias ? [v.name] : [];

    const vaccination = await prisma.vaccination.upsert({
      where: { profileId_name: { profileId, name: canonical } },
      create: { profileId, name: canonical, aliases: aliasesToAdd },
      update: aliasesToAdd.length ? { aliases: { push: aliasesToAdd[0] } } : {},
    });

    await prisma.dose.create({
      data: {
        vaccinationId: vaccination.id,
        profileId,
        date: new Date(v.date),
        source: "ADMINISTERED",
        facilityId: facilityId ?? undefined,
        lotNumber: v.lotNumber ?? undefined,
        notes: v.notes ?? undefined,
      },
    });
    counts.vaccinations++;
  }

  // ── 7. Health Metrics ──
  for (const m of entities.healthMetrics) {
    await prisma.healthMetric.create({
      data: {
        profileId,
        metricType: m.metricType,
        value: m.value,
        unit: m.unit,
        measuredAt: new Date(m.measuredAt),
        notes: m.notes ?? undefined,
      },
    });
    counts.healthMetrics++;
  }

  return counts;
}
