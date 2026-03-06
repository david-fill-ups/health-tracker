"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Doctor {
  id: string;
  name: string;
}

interface Facility {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  date: string | null;
  type: string | null;
  status: string;
  doctor: Doctor | null;
  facility: Facility | null;
}

export function UpcomingVisits({ activeProfileId }: { activeProfileId: string | null }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    fetch(`/api/visits?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: Visit[]) => {
        const now = new Date();
        const upcoming = data
          .filter((v) => v.date && new Date(v.date) >= now && v.status === "SCHEDULED")
          .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
          .slice(0, 5);
        setVisits(upcoming);
      })
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Upcoming Visits</h2>
        <Link href="/visits" className="text-xs text-indigo-600 hover:underline">
          View all
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && visits.length === 0 && (
        <p className="text-sm text-gray-500">No upcoming appointments.</p>
      )}

      {!loading && visits.length > 0 && (
        <ul className="space-y-3">
          {visits.map((v) => {
            const label = v.doctor?.name ?? v.facility?.name ?? "Unknown";
            const date = v.date ? new Date(v.date).toLocaleDateString() : "—";
            const type = v.type?.replace(/_/g, " ") ?? "";
            return (
              <li key={v.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  {type && <p className="text-xs text-gray-500">{type}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {date}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
