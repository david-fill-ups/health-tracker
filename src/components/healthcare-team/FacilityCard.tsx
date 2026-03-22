"use client";

import Link from "next/link";

interface Facility {
  id: string;
  name: string;
  type: string;
  rating?: number | null;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  phone?: string | null;
  active: boolean;
  visitCount?: number;
  lastVisit?: string | null;
}

function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  facility: Facility;
}

export function FacilityCard({ facility }: Props) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-opacity ${
        facility.active ? "" : "opacity-50"
      }`}
    >
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/healthcare-team/facility/${facility.id}`}
              className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline truncate"
            >
              {facility.name}
            </Link>
            <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
              {formatType(facility.type)}
            </span>
            {!facility.active && (
              <span className="bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
                Inactive
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
            {facility.phone && <span>{facility.phone}</span>}
            {facility.rating != null && (
              <span className="text-amber-500">{"★".repeat(Math.round(facility.rating))}{"☆".repeat(5 - Math.round(facility.rating))} {facility.rating.toFixed(1)}</span>
            )}
            {facility.visitCount != null && (
              <span>{facility.visitCount} visit{facility.visitCount !== 1 ? "s" : ""}</span>
            )}
            {facility.lastVisit && (
              <span>Last seen {new Date(facility.lastVisit).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
