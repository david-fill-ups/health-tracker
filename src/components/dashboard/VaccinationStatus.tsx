"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { vaccineToSlug } from "@/lib/cdc";

interface Recommendation {
  vaccine: string;
  status: "up_to_date" | "due" | "overdue" | "not_applicable" | "completed" | "exempt" | "not_scheduled";
  nextDueDate: string | null;
  notes: string;
}


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
        <h2 className="text-base font-semibold text-gray-900">Vaccinations Needed</h2>
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

      {activeProfileId && !loading && recs.length === 0 && (
        <p className="text-sm text-gray-500">No vaccination data available.</p>
      )}

      {activeProfileId && !loading && actionable.length === 0 && recs.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
          <span className="text-green-600">✓</span>
          <p className="text-sm font-medium text-green-700">All vaccinations are up to date.</p>
        </div>
      )}

      {activeProfileId && !loading && actionable.length > 0 && (
        <ul className="space-y-2">
          {actionable.map((r) => {
            const dueLabel = r.nextDueDate
              ? `Due: ${new Date(r.nextDueDate).toLocaleDateString(undefined, { timeZone: "UTC" })}`
              : r.status === "overdue"
              ? "Due: Unknown"
              : "Due soon";
            const pillStyle = r.status === "overdue"
              ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700";
            return (
              <li key={r.vaccine}>
                <Link href={`/vaccinations/${vaccineToSlug(r.vaccine)}`} className="flex items-center justify-between gap-2 hover:bg-gray-50 -mx-2 px-2 py-0.5 rounded-lg transition-colors">
                  <span className="text-sm text-gray-800">{r.vaccine}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${pillStyle}`}>
                    {dueLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
