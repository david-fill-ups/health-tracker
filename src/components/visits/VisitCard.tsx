"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";

interface Doctor {
  id: string;
  name: string;
  rating?: number | null;
  active?: boolean;
  photo?: string | null;
}

interface Facility {
  id: string;
  name: string;
  active?: boolean;
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
  reason?: string | null;
  specialty?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
  doctor?: Doctor | null;
  facility?: Facility | null;
  location?: Location | null;
}

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  ROUTINE: "Routine",
  LAB: "Lab",
  SPECIALIST: "Specialist",
  URGENT: "Urgent",
  TELEHEALTH: "Telehealth",
  PROCEDURE: "Procedure",
  OTHER: "Other",
};

export const STATUS_STYLES: Record<VisitStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export const STATUS_LABELS: Record<VisitStatus, string> = {
  PENDING: "Pending",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDueMonth(ym: string) {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}

interface Props {
  visit: Visit;
  pill?: boolean;
  showDoctor?: boolean;
  showFacility?: boolean;
}

export function VisitCard({ visit, pill, showDoctor, showFacility }: Props) {
  const router = useRouter();
  const dateLabel = visit.date
    ? formatDate(visit.date)
    : visit.dueMonth
    ? formatDueMonth(visit.dueMonth)
    : "No date";

  const isInactive =
    visit.doctor?.active === false || visit.facility?.active === false;

  if (pill) {
    const hasPhoto = showDoctor && !!visit.doctor;
    return (
      <button
        onClick={() => router.push(`/visits/${visit.id}`)}
        className={`inline-flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left text-xs shadow-sm hover:bg-gray-50 transition-colors cursor-pointer w-[180px] shrink-0 ${isInactive ? "opacity-60" : ""}`}
      >
        {hasPhoto && (
          <div className="shrink-0 mt-0.5">
            {visit.doctor!.photo ? (
              <img src={visit.doctor!.photo} alt={visit.doctor!.name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <span className="text-base leading-none">🩺</span>
            )}
          </div>
        )}
        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-gray-700">{dateLabel}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[visit.status]}`}>
              {STATUS_LABELS[visit.status]}
            </span>
          </div>
          {showDoctor && visit.doctor && (
            <span className="text-gray-600 truncate">{visit.doctor.name}</span>
          )}
          {showFacility && visit.facility && (
            <span className="text-gray-600 truncate">{visit.facility.name}</span>
          )}
          {visit.reason && (
            <span className="text-gray-400 truncate">{visit.reason}</span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={() => router.push(`/visits/${visit.id}`)}
      className={`block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer ${isInactive ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900">{dateLabel}</span>
          {visit.reason && (
            <span className="text-gray-500 text-sm">— {visit.reason}</span>
          )}
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
          {visit.facility && (
            <Link
              href={`/healthcare-team/facility/${visit.facility.id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-indigo-600 hover:underline"
            >
              {visit.facility.name}
            </Link>
          )}
          {visit.location && (
            <span className="text-gray-400">{visit.location.name}</span>
          )}
        </div>

        {visit.notes && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{visit.notes}</p>
        )}

        {visit.documentUrl && (
          <a
            href={visit.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
              <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
              <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
            </svg>
            View document
          </a>
        )}
      </div>

      {visit.doctor && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Link
            href={`/healthcare-team/provider/${visit.doctor.id}`}
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-colors ${visit.doctor.active === false ? "opacity-60" : ""}`}
          >
            {visit.doctor.photo ? (
              <img src={visit.doctor.photo} alt={visit.doctor.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
            ) : (
              <span className="shrink-0">🩺</span>
            )}
            <span className="font-medium">{visit.doctor.name}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
