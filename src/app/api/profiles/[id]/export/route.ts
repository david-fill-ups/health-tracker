import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PermissionError } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getProfileById } from "@/server/profiles";
import { getFacilitiesForProfile } from "@/server/facilities";
import { getDoctorsForProfile } from "@/server/doctors";
import { getVisitsForProfile } from "@/server/visits";
import { getConditionsForProfile } from "@/server/conditions";
import { getVaccinationsForProfile } from "@/server/vaccinations";
import { getAllergiesForProfile } from "@/server/allergies";
import { getPortalsForProfile } from "@/server/portals";
import { getHealthMetricsForProfile } from "@/server/health-metrics";
import { getFamilyMembersForProfile } from "@/server/family-members";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const userId = session.user.id;

    const [profile, facilities, doctors, visits, conditions, vaccinations, allergies, portals, healthMetrics, familyMembers] =
      await Promise.all([
        getProfileById(userId, id),
        getFacilitiesForProfile(userId, id),
        getDoctorsForProfile(userId, id),
        getVisitsForProfile(userId, id),
        getConditionsForProfile(userId, id),
        getVaccinationsForProfile(userId, id),
        getAllergiesForProfile(userId, id),
        getPortalsForProfile(userId, id),
        getHealthMetricsForProfile(userId, id),
        getFamilyMembersForProfile(userId, id),
      ]);

    // getMedicationsForProfile only fetches the last 10 logs — fetch all logs for a complete export
    // (access already verified by the parallel calls above)
    const medications = await prisma.medication.findMany({
      where: { profileId: id },
      include: { logs: { orderBy: { date: "desc" } } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const payload = {
      version: "1",
      exportedAt: new Date().toISOString(),
      profile: {
        name: profile.name,
        birthDate: profile.birthDate.toISOString().slice(0, 10),
        sex: profile.sex,
        state: profile.state ?? null,
        heightIn: profile.heightIn ?? null,
        timezone: profile.timezone ?? null,
        notes: profile.notes ?? null,
      },
      facilities: facilities.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        npiNumber: f.npiNumber ?? null,
        rating: f.rating ?? null,
        websiteUrl: f.websiteUrl ?? null,
        portalUrl: f.portalUrl ?? null,
        phone: f.phone ?? null,
        notes: f.notes ?? null,
        active: f.active,
        locations: f.locations.map((l) => ({
          id: l.id,
          name: l.name,
          address1: l.address1 ?? null,
          address2: l.address2 ?? null,
          city: l.city ?? null,
          state: l.state ?? null,
          zip: l.zip ?? null,
          phone: l.phone ?? null,
        })),
      })),
      doctors: doctors.map((d) => ({
        id: d.id,
        name: d.name,
        specialty: d.specialty ?? null,
        facilityId: d.facilityId ?? null,
        npiNumber: d.npiNumber ?? null,
        credential: d.credential ?? null,
        photo: d.photo ?? null,
        rating: d.rating ?? null,
        websiteUrl: d.websiteUrl ?? null,
        portalUrl: d.portalUrl ?? null,
        phone: d.phone ?? null,
        notes: d.notes ?? null,
        active: d.active,
      })),
      visits: visits.map((v) => ({
        date: v.date?.toISOString() ?? null,
        dueMonth: v.dueMonth ?? null,
        type: v.type ?? null,
        status: v.status ?? null,
        reason: v.reason ?? null,
        specialty: v.specialty ?? null,
        notes: v.notes ?? null,
        documentUrl: v.documentUrl ?? null,
        doctorId: v.doctorId ?? null,
        facilityId: v.facilityId ?? null,
        locationId: v.locationId ?? null,
      })),
      medications: medications.map((m) => ({
        name: m.name,
        medicationType: m.medicationType,
        dosage: m.dosage ?? null,
        frequency: m.frequency ?? null,
        prescribingDoctorId: m.prescribingDoctorId ?? null,
        startDate: m.startDate?.toISOString() ?? null,
        endDate: m.endDate?.toISOString() ?? null,
        instructions: m.instructions ?? null,
        active: m.active,
        logs: m.logs.map((l) => ({
          date: l.date.toISOString(),
          dosage: l.dosage ?? null,
          unit: l.unit ?? null,
          injectionSite: l.injectionSite ?? null,
          weight: l.weight ?? null,
          notes: l.notes ?? null,
        })),
      })),
      conditions: conditions.map((c) => ({
        name: c.name,
        diagnosisDate: c.diagnosisDate?.toISOString() ?? null,
        status: c.status ?? null,
        notes: c.notes ?? null,
      })),
      vaccinations: vaccinations.map((v) => ({
        name: v.name,
        aliases: v.aliases,
        notes: v.notes ?? null,
        doses: v.doses.map((d) => ({
          name: d.name ?? null,
          date: d.date.toISOString(),
          source: d.source,
          facilityId: d.facilityId ?? null,
          lotNumber: d.lotNumber ?? null,
          notes: d.notes ?? null,
        })),
      })),
      allergies: allergies.map((a) => ({
        allergen: a.allergen,
        category: a.category ?? null,
        diagnosisDate: a.diagnosisDate?.toISOString() ?? null,
        whealSize: a.whealSize ?? null,
        notes: a.notes ?? null,
      })),
      portals: portals.map((p) => ({
        name: p.name,
        organization: p.organization ?? null,
        url: p.url,
        facilityId: p.facilityId ?? null,
        notes: p.notes ?? null,
        active: p.active,
      })),
      healthMetrics: healthMetrics.map((m) => ({
        metricType: m.metricType,
        value: m.value,
        unit: m.unit,
        measuredAt: m.measuredAt.toISOString(),
        notes: m.notes ?? null,
      })),
      familyMembers: familyMembers.map((m) => ({
        name: m.name,
        relationship: m.relationship,
        side: m.side ?? null,
        notes: m.notes ?? null,
        conditions: m.conditions.map((c) => ({
          name: c.name,
          notes: c.notes ?? null,
        })),
      })),
    };

    const filename = `${profile.name.replace(/\s+/g, "-").toLowerCase()}-health-export.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    if (e instanceof PermissionError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    console.error("GET /api/profiles/[id]/export error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
