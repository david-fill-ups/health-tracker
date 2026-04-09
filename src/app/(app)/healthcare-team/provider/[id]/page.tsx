"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { DoctorForm } from "@/components/healthcare-team/DoctorForm";
import { StarRating } from "@/components/ui/StarRating";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";

interface VisitSummary {
  id: string;
  date: string | null;
  type: VisitType;
  status: VisitStatus;
  reason: string | null;
  facility: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}

interface Facility {
  id: string;
  name: string;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  locations?: { id: string; name: string; facilityId: string }[];
}

interface DoctorDetail {
  id: string;
  name: string;
  specialty: string | null;
  facilityId: string | null;
  facility: Facility | null;
  primaryLocationId: string | null;
  primaryLocation: { id: string; name: string } | null;
  rating: number | null;
  phone: string | null;
  websiteUrl: string | null;
  portalUrl: string | null;
  notes: string | null;
  active: boolean;
  photo: string | null;
  npiNumber: string | null;
  credential: string | null;
  npiLastSynced: string | null;
  _count: { visits: number };
  visits: VisitSummary[];
}

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  ROUTINE: "Routine", LAB: "Lab", SPECIALIST: "Specialist",
  URGENT: "Urgent", TELEHEALTH: "Telehealth", PROCEDURE: "Procedure", OTHER: "Other",
};
const STATUS_STYLES: Record<VisitStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700", SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700", CANCELLED: "bg-gray-100 text-gray-500",
};

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeProfileId } = useProfile();
  const router = useRouter();

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [allLocations, setAllLocations] = useState<{ id: string; name: string; facilityId: string }[]>([]);
  const [allSpecialties, setAllSpecialties] = useState<string[]>([]);
  const [allDoctors, setAllDoctors] = useState<{ id: string; facilityId: string | null; active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!activeProfileId || !id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/doctors/${id}?profileId=${activeProfileId}`),
      fetch(`/api/facilities?profileId=${activeProfileId}`),
      fetch(`/api/doctors?profileId=${activeProfileId}`),
    ])
      .then(async ([docRes, facRes, allDocRes]) => {
        if (docRes.status === 404) { setNotFound(true); return; }
        if (docRes.ok) setDoctor(await docRes.json());
        if (facRes.ok) {
          const facs: Facility[] = await facRes.json();
          setFacilities(facs);
          setAllLocations(
            facs.flatMap((f) => (f.locations ?? []).map((l) => ({ ...l, facilityId: f.id })))
          );
        }
        if (allDocRes.ok) {
          const allDocs = await allDocRes.json();
          const specs = [...new Set(
            allDocs.map((d: { specialty?: string | null }) => d.specialty).filter(Boolean)
          )] as string[];
          setAllSpecialties(specs);
          setAllDoctors(allDocs.map((d: { id: string; facilityId?: string | null; active: boolean }) => ({
            id: d.id,
            facilityId: d.facilityId ?? null,
            active: d.active,
          })));
        }
      })
      .finally(() => setLoading(false));
  }, [activeProfileId, id]);

  async function handleDelete() {
    if (!activeProfileId || !confirm(`Delete "${doctor?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/doctors/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    router.push("/healthcare-team");
  }

  async function handleToggleActive() {
    if (!activeProfileId || !doctor) return;
    setToggling(true);
    const markingInactive = doctor.active;
    const res = await fetch(`/api/doctors/${id}?profileId=${activeProfileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !doctor.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDoctor((prev) => prev ? { ...prev, active: updated.active } : prev);

      if (markingInactive && doctor.facilityId) {
        const siblingsAllInactive = allDoctors
          .filter((d) => d.facilityId === doctor.facilityId && d.id !== doctor.id)
          .every((d) => !d.active);
        if (siblingsAllInactive) {
          const facilityName = doctor.facility?.name ?? "this facility";
          const markFacility = confirm(
            `All providers at ${facilityName} are now inactive. Mark the facility as inactive too?`
          );
          if (markFacility) {
            await fetch(`/api/facilities/${doctor.facilityId}?profileId=${activeProfileId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ active: false }),
            });
          }
        }
      }
    }
    setToggling(false);
  }

  async function handleRatingChange(rating: number) {
    if (!activeProfileId || !doctor) return;
    const newRating = rating === 0 ? null : rating;
    setDoctor((prev) => prev ? { ...prev, rating: newRating } : prev);
    await fetch(`/api/doctors/${id}?profileId=${activeProfileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: newRating }),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEditSuccess(saved: any) {
    setDoctor((prev) => prev ? { ...prev, ...saved } : prev);
    setEditing(false);
  }

  if (!activeProfileId) {
    return <div className="flex items-center justify-center h-48 text-gray-500">Select a profile first.</div>;
  }
  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (notFound || !doctor) return <p className="text-sm text-gray-500">Provider not found.</p>;

  const visitDates = doctor.visits.filter((v) => v.date).map((v) => new Date(v.date!).getTime());
  const firstSeen = visitDates.length ? new Date(Math.min(...visitDates)).toLocaleDateString() : null;
  const lastSeen = visitDates.length ? new Date(Math.max(...visitDates)).toLocaleDateString() : null;

  const effectivePortalUrl = doctor.portalUrl || doctor.facility?.portalUrl || null;
  const portalIsInherited = !doctor.portalUrl && !!doctor.facility?.portalUrl;

  return (
    <div className="max-w-3xl space-y-6">
      {lightbox && doctor.photo && (
        <PhotoLightbox src={doctor.photo} alt={doctor.name} onClose={() => setLightbox(false)} />
      )}
      <div className="flex items-center gap-4">
        <Link href="/healthcare-team" className="text-sm text-gray-500 hover:text-gray-700">
          ← Healthcare Team
        </Link>
        {doctor.photo && (
          <button onClick={() => setLightbox(true)} className="shrink-0 cursor-zoom-in">
            <img
              src={doctor.photo}
              alt={doctor.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{doctor.name}</h1>
        {doctor.specialty && (
          <span className="rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 text-xs font-medium">{doctor.specialty}</span>
        )}
        {!doctor.active && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inactive</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{doctor._count.visits}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Visits</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">{firstSeen ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">First Seen</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-sm font-semibold text-gray-900">{lastSeen ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-0.5">Last Seen</p>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 text-sm text-gray-700">
            {doctor.facility && (
              <p>
                <span className="font-medium text-gray-500">Facility:</span>{" "}
                <Link href={`/healthcare-team/facility/${doctor.facility.id}`} className="text-indigo-600 hover:underline">
                  {doctor.facility.name}
                </Link>
              </p>
            )}
            {doctor.primaryLocation && (
              <p>
                <span className="font-medium text-gray-500">Primary Location:</span>{" "}
                {doctor.primaryLocation.name}
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500">Rating:</span>
              <StarRating value={doctor.rating} onChange={handleRatingChange} />
            </div>
            {doctor.phone && (
              <p><span className="font-medium text-gray-500">Phone:</span> {doctor.phone}</p>
            )}
            {doctor.websiteUrl && (
              <p>
                <span className="font-medium text-gray-500">Website:</span>{" "}
                <a href={doctor.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                  {doctor.websiteUrl} ↗
                </a>
              </p>
            )}
            {effectivePortalUrl && (
              <p>
                <span className="font-medium text-gray-500">Patient Portal:</span>{" "}
                <a href={effectivePortalUrl} target="_blank" rel="noopener noreferrer" className={`hover:underline break-all ${portalIsInherited ? "text-gray-400" : "text-indigo-600"}`}>
                  {effectivePortalUrl} ↗
                </a>
                {portalIsInherited && <span className="ml-1 text-xs text-gray-400">(from facility)</span>}
              </p>
            )}
            {doctor.notes && (
              <p><span className="font-medium text-gray-500">Notes:</span> {doctor.notes}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {editing ? "Cancel Edit" : "Edit"}
            </button>
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {doctor.active ? "Mark Inactive" : "Mark Active"}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>

        {editing && activeProfileId && (
          <div className="border-t border-gray-100 pt-4">
            <DoctorForm
              profileId={activeProfileId}
              facilities={facilities}
              locations={allLocations}
              existingSpecialties={allSpecialties}
              initial={{
                id: doctor.id,
                name: doctor.name,
                specialty: doctor.specialty ?? "",
                facilityId: doctor.facilityId ?? "",
                primaryLocationId: doctor.primaryLocationId ?? "",
                npiNumber: doctor.npiNumber ?? "",
                credential: doctor.credential ?? "",
                npiLastSynced: doctor.npiLastSynced ?? null,
                photo: doctor.photo ?? "",
                rating: doctor.rating,
                websiteUrl: doctor.websiteUrl ?? "",
                portalUrl: doctor.portalUrl ?? "",
                phone: doctor.phone ?? "",
                notes: doctor.notes ?? "",
                active: doctor.active,
              }}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}
      </div>

      {/* Visits */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-700">Visits</h2>
        {doctor.visits.length === 0 ? (
          <p className="text-sm text-gray-400">No visits recorded with this provider.</p>
        ) : (
          <div className="space-y-2">
            {doctor.visits.map((v) => (
              <Link
                key={v.id}
                href={`/visits/${v.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="font-medium text-gray-900">
                    {v.date ? new Date(v.date).toLocaleDateString() : "No date"}
                  </span>
                  <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                    {VISIT_TYPE_LABELS[v.type]}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status]}`}>
                    {v.status.charAt(0) + v.status.slice(1).toLowerCase()}
                  </span>
                  {v.reason && <span className="text-gray-500">{v.reason}</span>}
                  {v.facility && <span className="text-gray-400">· {v.facility.name}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
