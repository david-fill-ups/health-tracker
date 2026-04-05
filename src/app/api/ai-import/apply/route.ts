import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { assertProfileAccess, PermissionError } from "@/lib/permissions";
import type { ProposalItem, ApplyResult, EntityType } from "@/lib/ai-import/types";

function ci(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function emptyEntityCounts(): Record<EntityType, number> {
  return {
    facility: 0,
    location: 0,
    doctor: 0,
    visit: 0,
    medication: 0,
    condition: 0,
    allergy: 0,
    vaccination: 0,
    health_metric: 0,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { profileId: string; items: ProposalItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { profileId, items } = body;
  if (!profileId || !Array.isArray(items)) {
    return NextResponse.json({ error: "profileId and items are required" }, { status: 400 });
  }

  try {
    await assertProfileAccess(session.user.id, profileId, "WRITE");
  } catch (e) {
    if (e instanceof PermissionError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const approved = items.filter((i) => i.status === "approved");
  if (approved.length === 0) {
    return NextResponse.json({ created: emptyEntityCounts(), updated: emptyEntityCounts(), merged: emptyEntityCounts() } as ApplyResult);
  }

  const result: ApplyResult = {
    created: emptyEntityCounts(),
    updated: emptyEntityCounts(),
    merged: emptyEntityCounts(),
  };

  try {
    await prisma.$transaction(async (tx) => {
      // Pre-build facility and doctor name→id maps for FK resolution
      const [existingFacilities, existingDoctors] = await Promise.all([
        tx.facility.findMany({ where: { profileId }, select: { id: true, name: true } }),
        tx.doctor.findMany({ where: { profileId }, select: { id: true, name: true } }),
      ]);

      const facilityIdByName = new Map<string, string>(
        existingFacilities.map((f) => [ci(f.name), f.id])
      );
      const doctorIdByName = new Map<string, string>(
        existingDoctors.map((d) => [ci(d.name), d.id])
      );

      // ── Process in dependency order ──────────────────────────────────

      // 1. Facilities (first — doctors & vaccinations reference them)
      for (const item of approved.filter((i) => i.entityType === "facility")) {
        await applyFacilityItem(item, profileId, tx, facilityIdByName, result);
      }

      // 2. Doctors (second — medications reference prescribers)
      for (const item of approved.filter((i) => i.entityType === "doctor")) {
        await applyDoctorItem(item, profileId, tx, facilityIdByName, doctorIdByName, result);
      }

      // 3. Everything else (order-independent among remaining types)
      for (const item of approved.filter(
        (i) => i.entityType !== "facility" && i.entityType !== "doctor"
      )) {
        await applyOtherItem(item, profileId, tx, facilityIdByName, doctorIdByName, result);
      }
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[ai-import/apply] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Failed to apply changes" }, { status: 500 });
  }
}

// ── Item handlers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

async function applyFacilityItem(
  item: ProposalItem,
  profileId: string,
  tx: Tx,
  facilityIdByName: Map<string, string>,
  result: ApplyResult
) {
  const d = item.data ?? {};

  if (item.action === "create") {
    const notes = [d.notes as string | undefined, d.address ? `Address: ${d.address}` : undefined]
      .filter(Boolean)
      .join("\n");

    const created = await tx.facility.create({
      data: {
        profileId,
        name: d.name as string,
        type: (d.type as string) ?? "Clinic",
        phone: (d.phone as string) ?? undefined,
        npiNumber: (d.npiNumber as string) ?? undefined,
        websiteUrl: (d.websiteUrl as string) ?? undefined,
        notes: notes || undefined,
        active: true,
      },
    });
    facilityIdByName.set(ci(d.name as string), created.id);
    result.created.facility++;
  } else if (item.action === "update" && item.entityId) {
    await tx.facility.update({
      where: { id: item.entityId },
      data: item.proposedChanges ?? {},
    });
    result.updated.facility++;
  } else if (item.action === "merge_candidate" && item.existingId) {
    // Merge: update the existing facility with any new enriched data
    const updates: Record<string, unknown> = {};
    if (d.phone && !(await tx.facility.findUnique({ where: { id: item.existingId }, select: { phone: true } }))?.phone) updates.phone = d.phone;
    if (d.npiNumber) updates.npiNumber = d.npiNumber;
    if (d.websiteUrl) updates.websiteUrl = d.websiteUrl;
    if (Object.keys(updates).length > 0) {
      await tx.facility.update({ where: { id: item.existingId }, data: updates });
    }
    facilityIdByName.set(ci(item.existingName ?? ""), item.existingId);
    result.merged.facility++;
  }
}

async function applyDoctorItem(
  item: ProposalItem,
  profileId: string,
  tx: Tx,
  facilityIdByName: Map<string, string>,
  doctorIdByName: Map<string, string>,
  result: ApplyResult
) {
  const d = item.data ?? {};

  if (item.action === "create") {
    const facilityId = d.facilityName
      ? facilityIdByName.get(ci(d.facilityName as string))
      : undefined;

    const created = await tx.doctor.create({
      data: {
        profileId,
        name: d.name as string,
        specialty: (d.specialty as string) ?? undefined,
        credential: (d.credential as string) ?? undefined,
        facilityId: facilityId ?? undefined,
        phone: (d.phone as string) ?? undefined,
        npiNumber: (d.npiNumber as string) ?? undefined,
        notes: (d.notes as string) ?? undefined,
        active: true,
      },
    });
    doctorIdByName.set(ci(d.name as string), created.id);
    result.created.doctor++;
  } else if (item.action === "update" && item.entityId) {
    await tx.doctor.update({ where: { id: item.entityId }, data: item.proposedChanges ?? {} });
    result.updated.doctor++;
  } else if (item.action === "merge_candidate" && item.existingId) {
    const updates: Record<string, unknown> = {};
    if (d.phone) updates.phone = d.phone;
    if (d.npiNumber) updates.npiNumber = d.npiNumber;
    if (d.specialty) updates.specialty = d.specialty;
    if (d.credential) updates.credential = d.credential;
    if (Object.keys(updates).length > 0) {
      await tx.doctor.update({ where: { id: item.existingId }, data: updates });
    }
    doctorIdByName.set(ci(item.existingName ?? ""), item.existingId);
    result.merged.doctor++;
  }
}

async function applyOtherItem(
  item: ProposalItem,
  profileId: string,
  tx: Tx,
  facilityIdByName: Map<string, string>,
  doctorIdByName: Map<string, string>,
  result: ApplyResult
) {
  const d = item.data ?? {};

  switch (item.entityType) {
    case "visit": {
      if (item.action === "create") {
        const facilityId = d.facilityName
          ? facilityIdByName.get(ci(d.facilityName as string))
          : undefined;
        const doctorId = d.doctorName
          ? doctorIdByName.get(ci(d.doctorName as string))
          : undefined;

        await tx.visit.create({
          data: {
            profileId,
            date: d.date ? new Date(d.date as string) : undefined,
            type: (d.type as string) ?? "ROUTINE",
            status: "COMPLETED",
            reason: (d.reason as string) ?? undefined,
            specialty: (d.specialty as string) ?? undefined,
            notes: (d.notes as string) ?? undefined,
            facilityId: facilityId ?? undefined,
            doctorId: doctorId ?? undefined,
          },
        });
        result.created.visit++;
      } else if (item.action === "update" && item.entityId) {
        await tx.visit.update({ where: { id: item.entityId }, data: item.proposedChanges ?? {} });
        result.updated.visit++;
      }
      break;
    }

    case "medication": {
      if (item.action === "create") {
        const prescribingDoctorId = d.prescriberName
          ? doctorIdByName.get(ci(d.prescriberName as string))
          : undefined;

        await tx.medication.create({
          data: {
            profileId,
            name: d.name as string,
            medicationType: (d.type as string) ?? "ORAL",
            dosage: (d.dosage as string) ?? undefined,
            frequency: (d.frequency as string) ?? undefined,
            prescribingDoctorId: prescribingDoctorId ?? undefined,
            startDate: d.startDate ? new Date(d.startDate as string) : undefined,
            endDate: d.endDate ? new Date(d.endDate as string) : undefined,
            instructions: (d.instructions as string) ?? undefined,
            active: (d.active as boolean) ?? true,
          },
        });
        result.created.medication++;
      } else if (item.action === "update" && item.entityId) {
        // Strip internal tracking field before updating
        const { _previousDosage: _, ...changes } = item.proposedChanges ?? {};
        await tx.medication.update({ where: { id: item.entityId }, data: changes });
        result.updated.medication++;
      }
      break;
    }

    case "condition": {
      if (item.action === "create") {
        await tx.condition.create({
          data: {
            profileId,
            name: d.name as string,
            diagnosisDate: d.diagnosisDate ? new Date(d.diagnosisDate as string) : undefined,
            status: (d.status as string) ?? "ACTIVE",
            notes: (d.notes as string) ?? undefined,
          },
        });
        result.created.condition++;
      } else if (item.action === "update" && item.entityId) {
        const changes: Record<string, unknown> = { ...item.proposedChanges };
        if (changes.diagnosisDate) changes.diagnosisDate = new Date(changes.diagnosisDate as string);
        await tx.condition.update({ where: { id: item.entityId }, data: changes });
        result.updated.condition++;
      }
      break;
    }

    case "allergy": {
      if (item.action === "create") {
        await tx.allergy.create({
          data: {
            profileId,
            allergen: d.allergen as string,
            category: (d.category as string) ?? undefined,
            diagnosisDate: d.diagnosisDate ? new Date(d.diagnosisDate as string) : undefined,
            notes: (d.notes as string) ?? undefined,
          },
        });
        result.created.allergy++;
      } else if (item.action === "update" && item.entityId) {
        await tx.allergy.update({ where: { id: item.entityId }, data: item.proposedChanges ?? {} });
        result.updated.allergy++;
      }
      break;
    }

    case "vaccination": {
      if (item.action === "create") {
        const facilityId = d.facilityName
          ? facilityIdByName.get(ci(d.facilityName as string))
          : undefined;

        const vax = await tx.vaccination.upsert({
          where: { profileId_name: { profileId, name: d.name as string } },
          create: { profileId, name: d.name as string, aliases: [] },
          update: {},
        });

        await tx.dose.create({
          data: {
            vaccinationId: vax.id,
            profileId,
            date: new Date(d.date as string),
            source: "ADMINISTERED",
            facilityId: facilityId ?? undefined,
            lotNumber: (d.lotNumber as string) ?? undefined,
            notes: (d.notes as string) ?? undefined,
          },
        });
        result.created.vaccination++;
      }
      break;
    }

    case "health_metric": {
      if (item.action === "create") {
        await tx.healthMetric.create({
          data: {
            profileId,
            metricType: d.metricType as string,
            value: d.value as number,
            unit: d.unit as string,
            measuredAt: new Date(d.measuredAt as string),
            notes: (d.notes as string) ?? undefined,
          },
        });
        result.created.health_metric++;
      }
      break;
    }
  }
}
