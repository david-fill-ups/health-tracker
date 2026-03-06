"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";

const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  ROUTINE: "Routine",
  LAB: "Lab",
  SPECIALIST: "Specialist",
  URGENT: "Urgent",
  TELEHEALTH: "Telehealth",
  PROCEDURE: "Procedure",
  OTHER: "Other",
};

const STATUS_STYLES: Record<VisitStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<VisitStatus, string> = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

interface Visit {
  id: string;
  profileId: string;
  date?: string | null;
  dueMonth?: string | null;
  type: VisitType;
  status: VisitStatus;
  notes?: string | null;
  doctor?: { id: string; name: string; specialty?: string | null } | null;
  facility?: { id: string; name: string } | null;
  location?: { id: string; name: string; address1?: string | null; city?: string | null; state?: string | null } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDueMonth(ym: string) {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}

export default function VisitDetailPage() {
  const { activeProfileId } = useProfile();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!activeProfileId || !id) return;
    fetch(`/api/visits/${id}?profileId=${activeProfileId}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); return; }
        if (res.ok) setVisit(await res.json());
      })
      .finally(() => setLoading(false));
  }, [activeProfileId, id]);

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Select a profile to view this visit.
      </div>
    );
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  if (notFound || !visit) {
    return <p className="text-sm text-gray-500">Visit not found.</p>;
  }

  const dateLabel = visit.date
    ? formatDate(visit.date)
    : visit.dueMonth
    ? `Due ${formatDueMonth(visit.dueMonth)}`
    : "No date set";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/visits")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Visits
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Visit Details</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-gray-900">{dateLabel}</p>
            <div className="flex gap-2 flex-wrap">
              <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium">
                {VISIT_TYPE_LABELS[visit.type]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[visit.status]}`}
              >
                {STATUS_LABELS[visit.status]}
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/visits/${id}/edit`)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shrink-0"
          >
            Edit
          </button>
        </div>

        {/* Details grid */}
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
          {visit.doctor && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Doctor</dt>
              <dd className="mt-0.5 text-sm text-gray-700">
                {visit.doctor.name}
                {visit.doctor.specialty && (
                  <span className="text-gray-400"> — {visit.doctor.specialty}</span>
                )}
              </dd>
            </div>
          )}
          {visit.facility && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Facility</dt>
              <dd className="mt-0.5 text-sm text-gray-700">{visit.facility.name}</dd>
            </div>
          )}
          {visit.location && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Location</dt>
              <dd className="mt-0.5 text-sm text-gray-700">
                {visit.location.name}
                {visit.location.city && visit.location.state && (
                  <span className="text-gray-400"> — {visit.location.city}, {visit.location.state}</span>
                )}
              </dd>
            </div>
          )}
          {visit.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Notes</dt>
              <dd className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{visit.notes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
