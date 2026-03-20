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
  dueMonth: string | null;
  type: string | null;
  status: string;
  doctor: Doctor | null;
  facility: Facility | null;
}

export function NeedToSchedule({ activeProfileId }: { activeProfileId: string | null }) {
  const [items, setItems] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    fetch(`/api/visits?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: Visit[]) => {
        const needScheduling = data.filter(
          (v) => !v.date && (v.status === "PENDING" || v.status === "SCHEDULED")
        );
        setItems(needScheduling);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Need to Schedule</h2>
        <Link href="/visits" className="text-xs text-indigo-600 hover:underline">
          View all
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-500">Nothing to schedule.</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((v) => {
            const label = v.doctor?.name ?? v.facility?.name ?? "Unknown";
            const due = v.dueMonth ?? "When available";
            const type = v.type?.replace(/_/g, " ") ?? "";
            return (
              <li key={v.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  {type && <p className="text-xs text-gray-500">{type}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {due}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
