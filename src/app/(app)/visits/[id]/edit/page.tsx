"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { VisitForm, type VisitInitial } from "@/components/visits/VisitForm";
import type { VisitType, VisitStatus } from "@/generated/prisma/enums";

interface VisitRaw {
  id: string;
  date?: string | null;
  dueMonth?: string | null;
  type: VisitType;
  status: VisitStatus;
  doctorId?: string | null;
  facilityId?: string | null;
  locationId?: string | null;
  reason?: string | null;
  specialty?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
}

export default function EditVisitPage() {
  const { activeProfileId } = useProfile();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [initial, setInitial] = useState<VisitInitial | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!activeProfileId || !id) return;
    fetch(`/api/visits/${id}?profileId=${activeProfileId}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (res.ok) {
          const v: VisitRaw = await res.json();
          // Convert ISO date to datetime-local format
          let dateStr = "";
          if (v.date) {
            const d = new Date(v.date);
            // Format: YYYY-MM-DDTHH:MM
            dateStr = d.toISOString().slice(0, 16);
          }
          setInitial({
            id: v.id,
            date: dateStr,
            dueMonth: v.dueMonth ?? "",
            type: v.type,
            status: v.status,
            doctorId: v.doctorId ?? "",
            facilityId: v.facilityId ?? "",
            locationId: v.locationId ?? "",
            reason: v.reason ?? "",
            specialty: v.specialty ?? "",
            notes: v.notes ?? "",
            documentUrl: v.documentUrl ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [activeProfileId, id]);

  async function handleDelete() {
    if (!activeProfileId || !confirm("Delete this visit? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/visits/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    router.push("/visits");
  }

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Select a profile to edit this visit.
      </div>
    );
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (notFound || !initial) {
    return <p className="text-sm text-gray-500">Visit not found.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/visits/${id}`)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Visit Details
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Visit</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <VisitForm
          profileId={activeProfileId}
          initial={initial}
          onSuccess={() => router.push(`/visits/${id}`)}
          onCancel={() => router.push(`/visits/${id}`)}
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete visit"}
        </button>
      </div>
    </div>
  );
}
