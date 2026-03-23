"use client";

import Link from "next/link";

interface MedicationLog {
  id: string;
  date: string;
  dosage: number;
  unit: string;
  injectionSite: string | null;
  weight: number | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  prescribingDoctorId: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  recentLog?: MedicationLog | null;
  prescribingDoctor?: { name: string } | null;
}

interface MedicationCardProps {
  medication: Medication;
  profileId: string;
}

function fmt(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString();
}

export function MedicationCard({ medication }: MedicationCardProps) {
  const log = medication.recentLog;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-lg">
              <Link href={`/medications/${medication.id}`} className="hover:text-indigo-600 hover:underline">
                {medication.name}
              </Link>
              {medication.dosage && (
                <span className="ml-1.5 text-base font-normal text-gray-500">{medication.dosage}</span>
              )}
            </h3>
            {medication.active ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Active
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                Inactive
              </span>
            )}
          </div>

          {medication.prescribingDoctor && (
            <p className="mt-1 text-sm text-gray-500">
              Prescribed by {medication.prescribingDoctor.name}
            </p>
          )}

          {medication.frequency && (
            <p className="mt-0.5 text-sm text-gray-500">{medication.frequency}</p>
          )}

          <div className="mt-1 flex gap-4 text-xs text-gray-400">
            {medication.startDate && <span>Started {fmt(medication.startDate)}</span>}
            {medication.endDate && <span>Ended {fmt(medication.endDate)}</span>}
          </div>

          {log && (
            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
              <div className="space-y-0.5">
                <p className="font-medium text-gray-700">Last dose: {fmt(log.date)}</p>
                <p className="text-gray-500">
                  {log.dosage} {log.unit}
                  {log.injectionSite ? ` · ${log.injectionSite}` : ""}
                  {log.weight ? ` · ${log.weight} lbs` : ""}
                </p>
              </div>
            </div>
          )}
        </div>

        {medication.active && (
          <a
            href={`/medications/${medication.id}/log`}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 text-center whitespace-nowrap shrink-0"
          >
            Log dose
          </a>
        )}
      </div>
    </div>
  );
}
