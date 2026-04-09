"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { FacilityForm } from "@/components/healthcare-team/FacilityForm";
import { LocationForm } from "@/components/healthcare-team/LocationForm";
import { StarRating } from "@/components/ui/StarRating";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";

interface VisitSummary {
  id: string;
  date: string | null;
  type: VisitType;
  status: VisitStatus;
  reason: string | null;
  doctor: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
}

interface Location {
  id: string;
  name: string;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string | null;
  active: boolean;
  photo: string | null;
}

interface FacilityDetail {
  id: string;
  name: string;
  type: string;
  rating: number | null;
  websiteUrl: string | null;
  portalUrl: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  _count: { visits: number };
  visits: VisitSummary[];
  doctors: Doctor[];
  locations: Location[];
}

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  ROUTINE: "Routine", LAB: "Lab", SPECIALIST: "Specialist",
  URGENT: "Urgent", TELEHEALTH: "Telehealth", PROCEDURE: "Procedure", OTHER: "Other",
};
const STATUS_STYLES: Record<VisitStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700", SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700", CANCELLED: "bg-gray-100 text-gray-500",
};

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/w/g, (c) => c.toUpperCase());
}

export default function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { activeProfileId } = useProfile();
  const router = useRouter();

  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [addingLocation, setAddingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId || !id) return;
    setLoading(true);
    fetch(`/api/facilities/${id}?profileId=${activeProfileId}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (res.ok) {
          const data = await res.json();
          setFacility(data);
          setLocations(data.locations ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [activeProfileId, id]);

  async function handleDelete() {
    if (!activeProfileId || !confirm(`Delete "${facility?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/facilities/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    router.push("/healthcare-team");
  }

  async function handleToggleActive() {
    if (!activeProfileId || !facility) return;
    if (facility.active && facility.doctors.some((d) => d.active)) {
      alert("All providers at this facility must be marked inactive before the facility can be marked inactive.");
      return;
    }
    setToggling(true);
    const res = await fetch(`/api/facilities/${id}?profileId=${activeProfileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !facility.active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setFacility((prev) => prev ? { ...prev, active: updated.active } : prev);
    }
    setToggling(false);
  }

  async function handleRatingChange(rating: number) {
    if (!activeProfileId || !facility) return;
    const newRating = rating === 0 ? null : rating;
    setFacility((prev) => prev ? { ...prev, rating: newRating } : prev);
    await fetch(`/api/facilities/${id}?profileId=${activeProfileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: newRating }),
    });
  }

  async function handleDeleteLocation(locationId: string) {
    if (!confirm("Delete this location? This cannot be undone.")) return;
    await fetch(`/api/locations/${locationId}?facilityId=${id}`, { method: "DELETE" });
    setLocations((prev) => prev.filter((l) => l.id !== locationId));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEditSuccess(saved: any) {
    setFacility((prev) => prev ? { ...prev, ...saved } : prev);
    setEditing(false);
  }

  if (!activeProfileId) {
    return <div className="flex items-center justify-center h-48 text-gray-500">Select a profile first.</div>;
  }
  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (notFound || !facility) return <p className="text-sm text-gray-500">Facility not found.</p>;

  const visitDates = facility.visits.filter((v) => v.date).map((v) => new Date(v.date!).getTime());
  const firstSeen = visitDates.length ? new Date(Math.min(...visitDates)).toLocaleDateString() : null;
  const lastSeen = visitDates.length ? new Date(Math.max(...visitDates)).toLocaleDateString() : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/healthcare-team" className="text-sm text-gray-500 hover:text-gray-700">
          ← Healthcare Team
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
        {!facility.active && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inactive</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{facility._count.visits}</p>
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
            <p>
              <span className="font-medium text-gray-500">Type:</span>{" "}
              {formatType(facility.type)}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-500">Rating:</span>
              <StarRating value={facility.rating} onChange={handleRatingChange} />
            </div>
            {facility.phone && (
              <p><span className="font-medium text-gray-500">Phone:</span> {facility.phone}</p>
            )}
            {facility.websiteUrl && (
              <p>
                <span className="font-medium text-gray-500">Website:</span>{" "}
                <a href={facility.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                  {facility.websiteUrl} ↗
                </a>
              </p>
            )}
            {facility.portalUrl && (
              <p>
                <span className="font-medium text-gray-500">Patient Portal:</span>{" "}
                <a href={facility.portalUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">
                  {facility.portalUrl} ↗
                </a>
              </p>
            )}
            {facility.notes && (
              <p><span className="font-medium text-gray-500">Notes:</span> {facility.notes}</p>
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
              {facility.active ? "Mark Inactive" : "Mark Active"}
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
            <FacilityForm
              profileId={activeProfileId}
              initial={{
                id: facility.id,
                name: facility.name,
                type: facility.type,
                rating: facility.rating,
                websiteUrl: facility.websiteUrl ?? "",
                portalUrl: facility.portalUrl ?? "",
                phone: facility.phone ?? "",
                notes: facility.notes ?? "",
                active: facility.active,
              }}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}
      </div>

      {/* Locations */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">Locations</h2>
          {!addingLocation && (
            <button
              onClick={() => { setAddingLocation(true); setEditingLocationId(null); }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add Location
            </button>
          )}
        </div>

        {addingLocation && (
          <LocationForm
            facilityId={id}
            onSuccess={(saved) => {
              setLocations((prev) => [...prev, saved]);
              setAddingLocation(false);
            }}
            onCancel={() => setAddingLocation(false)}
          />
        )}

        {locations.length === 0 && !addingLocation ? (
          <p className="text-sm text-gray-400">No locations recorded for this facility.</p>
        ) : (
          <div className="space-y-2">
            {locations.map((loc) =>
              editingLocationId === loc.id ? (
                <LocationForm
                  key={loc.id}
                  facilityId={id}
                  initial={{
                    id: loc.id,
                    name: loc.name,
                    address1: loc.address1 ?? "",
                    address2: loc.address2 ?? "",
                    city: loc.city ?? "",
                    state: loc.state ?? "",
                    zip: loc.zip ?? "",
                    phone: loc.phone ?? "",
                  }}
                  onSuccess={(saved) => {
                    setLocations((prev) => prev.map((l) => l.id === saved.id ? saved : l));
                    setEditingLocationId(null);
                  }}
                  onCancel={() => setEditingLocationId(null)}
                />
              ) : (
                <div
                  key={loc.id}
                  className="rounded-xl border border-gray-200 bg-white p-3 flex items-start justify-between gap-4"
                >
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{loc.name}</p>
                    {(loc.address1 || loc.city) && (
                      <p className="text-gray-500 mt-0.5">
                        {[loc.address1, loc.address2].filter(Boolean).join(", ")}
                        {(loc.address1 || loc.address2) && (loc.city || loc.state) ? " · " : ""}
                        {[loc.city, loc.state].filter(Boolean).join(", ")}
                        {loc.zip ? ` ${loc.zip}` : ""}
                      </p>
                    )}
                    {loc.phone && <p className="text-gray-500">{loc.phone}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setEditingLocationId(loc.id); setAddingLocation(false); }}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(loc.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* Doctors */}
      {facility.doctors.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-700">Providers at this Facility</h2>
          <div className="space-y-2">
            {facility.doctors.map((doc) => (
              <div key={doc.id} className={`rounded-xl border border-gray-200 bg-white p-3 flex items-center justify-between ${doc.active ? "" : "opacity-50"}`}>
                <div className="flex items-center gap-3">
                  {doc.photo && (
                    <img
                      src={doc.photo}
                      alt={doc.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  )}
                  <div>
                    <Link href={`/healthcare-team/provider/${doc.id}`} className="font-medium text-gray-900 hover:text-indigo-600 hover:underline text-sm">
                      {doc.name}
                    </Link>
                    {doc.specialty && (
                      <span className="ml-2 text-xs text-gray-500">{doc.specialty}</span>
                    )}
                  </div>
                </div>
                {!doc.active && (
                  <span className="text-xs text-gray-400">Inactive</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Visits */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-700">Visits</h2>
        {facility.visits.length === 0 ? (
          <p className="text-sm text-gray-400">No visits recorded at this facility.</p>
        ) : (
          <div className="space-y-2">
            {facility.visits.map((v) => (
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
                  {v.doctor && <span className="text-gray-400">· {v.doctor.name}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
