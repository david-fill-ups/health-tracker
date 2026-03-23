"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Recommendation {
  vaccine: string;
  status: "up_to_date" | "due" | "overdue" | "not_applicable" | "completed" | "exempt";
  nextDueDate: string | null;
  notes: string;
}

const STATUS_STYLES: Record<string, string> = {
  up_to_date: "bg-green-100 text-green-700",
  due: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
  not_applicable: "bg-gray-100 text-gray-500",
  completed: "bg-blue-100 text-blue-700",
  exempt: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  up_to_date: "Up to date",
  due: "Due",
  overdue: "Overdue",
  not_applicable: "N/A",
  completed: "Completed",
  exempt: "Declined",
};

export function VaccinationStatus({ activeProfileId }: { activeProfileId: string | null }) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProfileId) {
      setRecs([]);
      return;
    }
    setLoading(true);
    fetch(`/api/vaccinations/recommendations?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setRecs(Array.isArray(data) ? data : (data?.recommendations ?? [])))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  const actionable = recs.filter(
    (r) => r.status === "due" || r.status === "overdue"
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Vaccination Status</h2>
        <Link href="/vaccinations" className="text-xs text-indigo-600 hover:underline">
          View all
        </Link>
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view vaccination status.</p>
      )}

      {activeProfileId && loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      )}

      {activeProfileId && !loading && actionable.length === 0 && recs.length > 0 && (
        <p className="text-sm text-gray-500">All vaccinations are up to date.</p>
      )}

      {activeProfileId && !loading && recs.length === 0 && (
        <p className="text-sm text-gray-500">No vaccination data available.</p>
      )}

      {activeProfileId && !loading && actionable.length > 0 && (
        <ul className="space-y-2">
          {actionable.map((r) => (
            <li key={r.vaccine} className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-800">{r.vaccine}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status]}`}
              >
                {STATUS_LABELS[r.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
