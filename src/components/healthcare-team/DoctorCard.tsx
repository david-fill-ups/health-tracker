"use client";

import { useState } from "react";
import Link from "next/link";
import { PhotoLightbox } from "@/components/ui/PhotoLightbox";

interface Doctor {
  id: string;
  name: string;
  specialty?: string | null;
  facilityId?: string | null;
  facility?: { id: string; name: string } | null;
  phone?: string | null;
  rating?: number | null;
  active: boolean;
  visitCount?: number;
  lastVisit?: string | null;
  photo?: string | null;
}

interface Props {
  doctor: Doctor;
}

export function DoctorCard({ doctor }: Props) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      {lightbox && doctor.photo && (
        <PhotoLightbox src={doctor.photo} alt={doctor.name} onClose={() => setLightbox(false)} />
      )}
      <div
        className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-opacity ${
          doctor.active ? "" : "opacity-50"
        }`}
      >
      <div className="flex items-start gap-3 flex-wrap">
        {doctor.photo && (
          <button onClick={() => setLightbox(true)} className="shrink-0 cursor-zoom-in">
            <img
              src={doctor.photo}
              alt={doctor.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/healthcare-team/provider/${doctor.id}`}
              className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline truncate"
            >
              {doctor.name}
            </Link>
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
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
            {doctor.phone && <span>{doctor.phone}</span>}
            {doctor.rating != null && (
              <span className="text-amber-500">
                {'\u2605'.repeat(Math.round(doctor.rating))}{'\u2606'.repeat(5 - Math.round(doctor.rating))} {doctor.rating.toFixed(1)}
              </span>
            )}
            {doctor.visitCount != null && (
              <span>{doctor.visitCount} visit{doctor.visitCount !== 1 ? "s" : ""}</span>
            )}
            {doctor.lastVisit && (
              <span>Last seen {new Date(doctor.lastVisit).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}