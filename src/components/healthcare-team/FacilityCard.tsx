"use client";

import { useState } from "react";
import type { FacilityType } from "@/generated/prisma/enums";

interface Location {
  id: string;
  name: string;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  active: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialty?: string | null;
  active: boolean;
}

interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  phone?: string | null;
  active: boolean;
  locations: Location[];
  doctors: Doctor[];
}

const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  CLINIC: "Clinic",
  HOSPITAL: "Hospital",
  LAB: "Lab",
  PHARMACY: "Pharmacy",
  SUPPLIER: "Supplier",
  URGENT_CARE: "Urgent Care",
  OTHER: "Other",
};

interface Props {
  facility: Facility;
  onEdit: (facility: Facility) => void;
  onDelete: (id: string) => void;
}

export function FacilityCard({ facility, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${facility.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    onDelete(facility.id);
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-opacity ${
        facility.active ? "" : "opacity-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{facility.name}</h3>
            <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
              {FACILITY_TYPE_LABELS[facility.type]}
            </span>
            {!facility.active && (
              <span className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
                Inactive
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {facility.phone && <span>{facility.phone}</span>}
            {facility.websiteUrl && (
              <a
                href={facility.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Website ↗
              </a>
            )}
            {facility.portalUrl && (
              <a
                href={facility.portalUrl}
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
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {expanded ? "Collapse" : `Details (${facility.locations.length + facility.doctors.length})`}
          </button>
          <button
            onClick={() => onEdit(facility)}
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

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {facility.locations.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Locations
              </p>
              <ul className="space-y-1">
                {facility.locations.map((loc) => (
                  <li key={loc.id} className={`text-sm text-gray-700 ${loc.active ? "" : "opacity-50"}`}>
                    {loc.name}
                    {loc.city && loc.state && (
                      <span className="text-gray-400 ml-1">
                        — {loc.city}, {loc.state} {loc.zip}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {facility.doctors.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Doctors
              </p>
              <ul className="space-y-1">
                {facility.doctors.map((doc) => (
                  <li key={doc.id} className={`text-sm text-gray-700 ${doc.active ? "" : "opacity-50"}`}>
                    {doc.name}
                    {doc.specialty && (
                      <span className="text-gray-400 ml-1">— {doc.specialty}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {facility.locations.length === 0 && facility.doctors.length === 0 && (
            <p className="text-sm text-gray-400">No locations or doctors added yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
