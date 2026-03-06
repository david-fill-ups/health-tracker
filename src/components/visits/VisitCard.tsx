"use client";

import { useState } from "react";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";

interface Doctor {
  id: string;
  name: string;
}

interface Facility {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

export interface Visit {
  id: string;
  profileId: string;
  date?: string | null;
  dueMonth?: string | null;
  type: VisitType;
  status: VisitStatus;
  notes?: string | null;
  doctor?: Doctor | null;
  facility?: Facility | null;
  location?: Location | null;
}

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDueMonth(ym: string) {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}

interface Props {
  visit: Visit;
  onEdit: (visit: Visit) => void;
  onDelete: (id: string) => void;
}

export function VisitCard({ visit, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);

  function handleDelete() {
    if (!confirm("Delete this visit? This cannot be undone.")) return;
    setDeleting(true);
    onDelete(visit.id);
  }

  const dateLabel = visit.date
    ? formatDate(visit.date)
    : visit.dueMonth
    ? `Due ${formatDueMonth(visit.dueMonth)}`
    : "No date";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">{dateLabel}</span>
            <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
              {VISIT_TYPE_LABELS[visit.type]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_STYLES[visit.status]}`}
            >
              {STATUS_LABELS[visit.status]}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-gray-500">
            {visit.doctor && <span>{visit.doctor.name}</span>}
            {visit.facility && <span>{visit.facility.name}</span>}
            {visit.location && <span className="text-gray-400">{visit.location.name}</span>}
          </div>

          {visit.notes && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-1">{visit.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(visit)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
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
    </div>
  );
}
