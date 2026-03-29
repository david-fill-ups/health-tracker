import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertProfileAccess, PermissionError } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };
type ImportMode = "append" | "skip_duplicates" | "replace";

interface ImportCounts {
  facilities: number;
  locations: number;
  doctors: number;
  visits: number;
  medications: number;
  medicationLogs: number;
  conditions: number;
  vaccinations: number;
  allergies: number;
  portals: number;
  healthMetrics: number;
  familyMembers: number;
  familyConditions: number;
}

function isoDatePart(iso: string | null | undefined): string | null {
  return iso ? iso.slice(0, 10) : null;
}

function ci(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: profileId } = await params;
    const userId = session.user.id;

    await assertProfileAccess(userId, profileId, "OWNER");

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 1_000_000) {
      return NextResponse.json({ error: "Payload too large (max 1 MB)" }, { status: 413 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const mode: ImportMode = body.mode;
    if (!["append", "skip_duplicates", "replace"].includes(mode)) {
      return NextResponse.json({ error: "mode must be append, skip_duplicates, or replace" }, { status: 400 });
    }

    const data = body.data;
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "data field is required" }, { status: 400 });
    }

    const imported: ImportCounts = {
      facilities: 0, locations: 0, doctors: 0, visits: 0,
      medications: 0, medicationLogs: 0, conditions: 0, vaccinations: 0,
      allergies: 0, portals: 0, healthMetrics: 0,
      familyMembers: 0, familyConditions: 0,
    };
    const skipped: ImportCounts = {
      facilities: 0, locations: 0, doctors: 0, visits: 0,
      medications: 0, medicationLogs: 0, conditions: 0, vaccinations: 0,
      allergies: 0, portals: 0, healthMetrics: 0,
      familyMembers: 0, familyConditions: 0,
    };

    await prisma.$transaction(async (tx) => {
      // ── Replace mode: delete all existing records in reverse FK order ──
      if (mode === "replace") {
        await tx.healthMetric.deleteMany({ where: { profileId } });
        await tx.portal.deleteMany({ where: { profileId } });
        await tx.allergy.deleteMany({ where: { profileId } });
        await tx.medicationLog.deleteMany({ where: { medication: { profileId } } });
        await tx.vaccination.deleteMany({ where: { profileId } });
        await tx.visit.deleteMany({ where: { profileId } });
        await tx.medication.deleteMany({ where: { profileId } });
        await tx.condition.deleteMany({ where: { profileId } });
        await tx.doctor.deleteMany({ where: { profileId } });
        await tx.location.deleteMany({ where: { facility: { profileId } } });
        await tx.facility.deleteMany({ where: { profileId } });
        await tx.familyMember.deleteMany({ where: { profileId } }); // FamilyCondition deleted by cascade
      }

      // ID mapping: old export ID → newly created DB ID
      const idMap = new Map<string, string>();

      // ── Facilities + Locations ──
      for (const f of (data.facilities ?? [])) {
        let facilityId: string;

        if (mode === "skip_duplicates") {
          const existing = await tx.facility.findFirst({
            where: { profileId, name: { equals: f.name, mode: "insensitive" } },
            select: { id: true },
          });
          if (existing) {
            idMap.set(f.id, existing.id);
            skipped.facilities++;

            // Map existing locations by name for cross-ref resolution
            const existingLocs = await tx.location.findMany({
              where: { facilityId: existing.id },
              select: { id: true, name: true },
            });
            for (const l of (f.locations ?? [])) {
              const matchedLoc = existingLocs.find(
                (el) => ci(el.name) === ci(l.name)
              );
              if (matchedLoc) {
                idMap.set(l.id, matchedLoc.id);
                skipped.locations++;
              } else {
                const newLoc = await tx.location.create({
                  data: {
                    facilityId: existing.id,
                    name: l.name,
                    address1: l.address1 ?? undefined,
                    address2: l.address2 ?? undefined,
                    city: l.city ?? undefined,
                    state: l.state ?? undefined,
                    zip: l.zip ?? undefined,
                    phone: l.phone ?? undefined,
                    active: l.active ?? true,
                  },
                });
                idMap.set(l.id, newLoc.id);
                imported.locations++;
              }
            }
            continue;
          }
        }

        const newFacility = await tx.facility.create({
          data: {
            profileId,
            name: f.name,
            type: f.type,
            npiNumber: f.npiNumber ?? undefined,
            rating: f.rating != null ? Number(f.rating) : undefined,
            websiteUrl: f.websiteUrl ?? undefined,
            portalUrl: f.portalUrl ?? undefined,
            phone: f.phone ?? undefined,
            notes: f.notes ?? undefined,
            active: f.active ?? true,
          },
        });
        facilityId = newFacility.id;
        if (f.id) idMap.set(f.id, facilityId);
        imported.facilities++;

        for (const l of (f.locations ?? [])) {
          const newLoc = await tx.location.create({
            data: {
              facilityId,
              name: l.name,
              address1: l.address1 ?? undefined,
              address2: l.address2 ?? undefined,
              city: l.city ?? undefined,
              state: l.state ?? undefined,
              zip: l.zip ?? undefined,
              phone: l.phone ?? undefined,
              active: l.active ?? true,
            },
          });
          if (l.id) idMap.set(l.id, newLoc.id);
          imported.locations++;
        }
      }

      // ── Doctors ──
      for (const d of (data.doctors ?? [])) {
        if (mode === "skip_duplicates") {
          const existing = await tx.doctor.findFirst({
            where: { profileId, name: { equals: d.name, mode: "insensitive" } },
            select: { id: true },
          });
          if (existing) {
            if (d.id) idMap.set(d.id, existing.id);
            skipped.doctors++;
            continue;
          }
        }

        const newDoctor = await tx.doctor.create({
          data: {
            profileId,
            name: d.name,
            specialty: d.specialty ?? undefined,
            facilityId: d.facilityId ? (idMap.get(d.facilityId) ?? undefined) : undefined,
            npiNumber: d.npiNumber ?? undefined,
            credential: d.credential ?? undefined,
            photo: d.photo ?? undefined,
            rating: d.rating != null ? Number(d.rating) : undefined,
            websiteUrl: d.websiteUrl ?? undefined,
            portalUrl: d.portalUrl ?? undefined,
            phone: d.phone ?? undefined,
            notes: d.notes ?? undefined,
            active: d.active ?? true,
          },
        });
        if (d.id) idMap.set(d.id, newDoctor.id);
        imported.doctors++;
      }

      // ── Conditions ──
      for (const c of (data.conditions ?? [])) {
        if (mode === "skip_duplicates") {
          const existing = await tx.condition.findFirst({
            where: { profileId, name: { equals: c.name, mode: "insensitive" } },
            select: { id: true },
          });
          if (existing) {
            skipped.conditions++;
            continue;
          }
        }

        await tx.condition.create({
          data: {
            profileId,
            name: c.name,
            diagnosisDate: c.diagnosisDate ? new Date(c.diagnosisDate) : undefined,
            status: c.status ?? undefined,
            notes: c.notes ?? undefined,
          },
        });
        imported.conditions++;
      }

      // ── Visits ──
      for (const v of (data.visits ?? [])) {
        if (mode === "skip_duplicates" && v.date && v.type) {
          const datePart = isoDatePart(v.date);
          const existing = await tx.visit.findFirst({
            where: {
              profileId,
              type: v.type?.toUpperCase(),
              date: datePart
                ? { gte: new Date(`${datePart}T00:00:00.000Z`), lt: new Date(`${datePart}T23:59:59.999Z`) }
                : undefined,
            },
            select: { id: true },
          });
          if (existing) {
            skipped.visits++;
            continue;
          }
        }

        await tx.visit.create({
          data: {
            profileId,
            date: v.date ? new Date(v.date) : undefined,
            dueMonth: v.dueMonth ?? undefined,
            type: v.type ? v.type.toUpperCase() : undefined,
            status: v.status ?? undefined,
            reason: v.reason ?? undefined,
            specialty: v.specialty ?? undefined,
            notes: v.notes ?? undefined,
            documentUrl: v.documentUrl ?? undefined,
            doctorId: v.doctorId ? (idMap.get(v.doctorId) ?? undefined) : undefined,
            facilityId: v.facilityId ? (idMap.get(v.facilityId) ?? undefined) : undefined,
            locationId: v.locationId ? (idMap.get(v.locationId) ?? undefined) : undefined,
          },
        });
        imported.visits++;
      }

      // ── Medications + Logs ──
      for (const m of (data.medications ?? [])) {
        let medicationId: string;

        if (mode === "skip_duplicates") {
          const startDatePart = isoDatePart(m.startDate);
          const existing = await tx.medication.findFirst({
            where: {
              profileId,
              name: { equals: m.name, mode: "insensitive" },
              ...(startDatePart
                ? {
                    startDate: {
                      gte: new Date(`${startDatePart}T00:00:00.000Z`),
                      lt: new Date(`${startDatePart}T23:59:59.999Z`),
                    },
                  }
                : {}),
            },
            select: { id: true },
          });
          if (existing) {
            medicationId = existing.id;
            skipped.medications++;
            // Still try to import logs for existing medication
          } else {
            const newMed = await tx.medication.create({
              data: {
                profileId,
                name: m.name,
                medicationType: m.medicationType ?? undefined,
                dosage: m.dosage ?? undefined,
                frequency: m.frequency ?? undefined,
                prescribingDoctorId: m.prescribingDoctorId
                  ? (idMap.get(m.prescribingDoctorId) ?? undefined)
                  : undefined,
                startDate: m.startDate ? new Date(m.startDate) : undefined,
                endDate: m.endDate ? new Date(m.endDate) : undefined,
                instructions: m.instructions ?? undefined,
                active: m.active ?? true,
              },
            });
            medicationId = newMed.id;
            imported.medications++;
          }
        } else {
          const newMed = await tx.medication.create({
            data: {
              profileId,
              name: m.name,
              medicationType: m.medicationType ?? undefined,
              dosage: m.dosage ?? undefined,
              frequency: m.frequency ?? undefined,
              prescribingDoctorId: m.prescribingDoctorId
                ? (idMap.get(m.prescribingDoctorId) ?? undefined)
                : undefined,
              startDate: m.startDate ? new Date(m.startDate) : undefined,
              endDate: m.endDate ? new Date(m.endDate) : undefined,
              instructions: m.instructions ?? undefined,
              active: m.active ?? true,
            },
          });
          medicationId = newMed.id;
          imported.medications++;
        }

        for (const log of (m.logs ?? [])) {
          if (mode === "skip_duplicates") {
            const logDatePart = isoDatePart(log.date);
            if (logDatePart) {
              const existingLog = await tx.medicationLog.findFirst({
                where: {
                  medicationId,
                  date: {
                    gte: new Date(`${logDatePart}T00:00:00.000Z`),
                    lt: new Date(`${logDatePart}T23:59:59.999Z`),
                  },
                },
                select: { id: true },
              });
              if (existingLog) {
                skipped.medicationLogs++;
                continue;
              }
            }
          }

          await tx.medicationLog.create({
            data: {
              medicationId,
              date: new Date(log.date),
              dosage: log.dosage != null ? Number(log.dosage) : undefined,
              unit: log.unit ?? undefined,
              injectionSite: log.injectionSite ?? undefined,
              weight: log.weight != null ? Number(log.weight) : undefined,
              notes: log.notes ?? undefined,
            },
          });
          imported.medicationLogs++;
        }
      }

      // ── Vaccinations ──
      for (const v of (data.vaccinations ?? [])) {
        if (mode === "skip_duplicates") {
          const datePart = isoDatePart(v.date);
          const existing = await tx.vaccination.findFirst({
            where: {
              profileId,
              name: { equals: v.name, mode: "insensitive" },
              ...(datePart
                ? {
                    date: {
                      gte: new Date(`${datePart}T00:00:00.000Z`),
                      lt: new Date(`${datePart}T23:59:59.999Z`),
                    },
                  }
                : {}),
            },
            select: { id: true },
          });
          if (existing) {
            skipped.vaccinations++;
            continue;
          }
        }

        await tx.vaccination.create({
          data: {
            profileId,
            name: v.name,
            date: new Date(v.date),
            source: v.source ?? undefined,
            facilityId: v.facilityId ? (idMap.get(v.facilityId) ?? undefined) : undefined,
            lotNumber: v.lotNumber ?? undefined,
            notes: v.notes ?? undefined,
          },
        });
        imported.vaccinations++;
      }

      // ── Allergies ──
      for (const a of (data.allergies ?? [])) {
        if (mode === "skip_duplicates") {
          const existing = await tx.allergy.findFirst({
            where: { profileId, allergen: { equals: a.allergen, mode: "insensitive" } },
            select: { id: true },
          });
          if (existing) {
            skipped.allergies++;
            continue;
          }
        }

        await tx.allergy.create({
          data: {
            profileId,
            allergen: a.allergen,
            category: a.category ?? undefined,
            diagnosisDate: a.diagnosisDate ? new Date(a.diagnosisDate) : undefined,
            whealSize: a.whealSize ?? undefined,
            notes: a.notes ?? undefined,
          },
        });
        imported.allergies++;
      }

      // ── Portals ──
      for (const p of (data.portals ?? [])) {
        if (mode === "skip_duplicates") {
          const existing = await tx.portal.findFirst({
            where: { profileId, name: { equals: p.name, mode: "insensitive" } },
            select: { id: true },
          });
          if (existing) {
            skipped.portals++;
            continue;
          }
        }

        await tx.portal.create({
          data: {
            profileId,
            name: p.name,
            organization: p.organization ?? undefined,
            url: p.url,
            facilityId: p.facilityId ? (idMap.get(p.facilityId) ?? undefined) : undefined,
            notes: p.notes ?? undefined,
            active: p.active ?? true,
          },
        });
        imported.portals++;
      }

      // ── Health Metrics ──
      for (const m of (data.healthMetrics ?? [])) {
        if (mode === "skip_duplicates") {
          const measuredAtDate = new Date(m.measuredAt);
          const existing = await tx.healthMetric.findFirst({
            where: {
              profileId,
              metricType: m.metricType,
              measuredAt: {
                gte: new Date(measuredAtDate.getTime() - 60_000),
                lte: new Date(measuredAtDate.getTime() + 60_000),
              },
            },
            select: { id: true },
          });
          if (existing) {
            skipped.healthMetrics++;
            continue;
          }
        }

        await tx.healthMetric.create({
          data: {
            profileId,
            metricType: m.metricType,
            value: m.value,
            unit: m.unit,
            measuredAt: new Date(m.measuredAt),
            notes: m.notes ?? undefined,
          },
        });
        imported.healthMetrics++;
      }

      // ── Family Members + Conditions ──
      for (const m of (data.familyMembers ?? [])) {
        let memberId: string;

        if (mode === "skip_duplicates") {
          const existing = await tx.familyMember.findFirst({
            where: {
              profileId,
              name: { equals: m.name, mode: "insensitive" },
              relationship: m.relationship,
            },
            select: { id: true },
          });
          if (existing) {
            memberId = existing.id;
            skipped.familyMembers++;
          } else {
            const newMember = await tx.familyMember.create({
              data: { profileId, name: m.name, relationship: m.relationship, side: m.side ?? undefined, notes: m.notes ?? undefined },
            });
            memberId = newMember.id;
            imported.familyMembers++;
          }
        } else {
          const newMember = await tx.familyMember.create({
            data: { profileId, name: m.name, relationship: m.relationship, side: m.side ?? undefined, notes: m.notes ?? undefined },
          });
          memberId = newMember.id;
          imported.familyMembers++;
        }

        for (const c of (m.conditions ?? [])) {
          if (mode === "skip_duplicates") {
            const existingCond = await tx.familyCondition.findFirst({
              where: { familyMemberId: memberId, name: { equals: c.name, mode: "insensitive" } },
              select: { id: true },
            });
            if (existingCond) {
              skipped.familyConditions++;
              continue;
            }
          }
          await tx.familyCondition.create({
            data: { familyMemberId: memberId, name: c.name, notes: c.notes ?? undefined },
          });
          imported.familyConditions++;
        }
      }
    }, { timeout: 60_000 });

    await logAudit(userId, profileId, "IMPORT_PROFILE", "Profile", profileId, { mode, imported });

    return NextResponse.json({ imported, skipped });
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    console.error("POST /api/profiles/[id]/import error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
