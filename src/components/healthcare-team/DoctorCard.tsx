"use client";

import { useState } from "react";

interface Facility {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty?: string | null;
  facility?: Facility | null;
  phone?: string | null;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  active: boolean;
}

interface Props {
  doctor: Doctor;
  onEdit: (doctor: Doctor) => void;
  onDelete: (id: string) => void;
}

export function DoctorCard({ doctor, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);

  function handleDelete() {
    if (!confirm(`Delete "${doctor.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    onDelete(doctor.id);
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-opacity ${
        doctor.active ? "" : "opacity-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{doctor.name}</h3>
            {doctor.specialty && (
              <span className="bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
                {doctor.specialty}
              </span>
            )}
            {!doctor.active && (
              <span className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
                Inactive
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {doctor.facility && (
              <span className="text-gray-600">{doctor.facility.name}</span>
            )}
            {doctor.phone && <span>{doctor.phone}</span>}
            {doctor.websiteUrl && (
              <a
                href={doctor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Website ↗
              </a>
            )}
            {doctor.portalUrl && (
              <a
                href={doctor.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Patient Portal ↗
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(doctor)}
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
