"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Condition {
  id: string;
  name: string;
  status: string;
  diagnosisDate: string | null;
}

export function ActiveConditions({ activeProfileId }: { activeProfileId: string | null }) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    fetch(`/api/conditions?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: Condition[]) => {
        setConditions(data.filter((c) => c.status === "ACTIVE"));
      })
      .catch(() => setConditions([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Active Conditions</h2>
        <Link href="/conditions" className="text-xs text-indigo-600 hover:underline">
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

      {!loading && conditions.length === 0 && (
        <p className="text-sm text-gray-500">No active conditions.</p>
      )}

      {!loading && conditions.length > 0 && (
        <ul className="space-y-2">
          {conditions.map((c) => (
            <li key={c.id}>
              <Link href={`/conditions/${c.id}/edit`} className="flex items-center justify-between gap-2 hover:bg-gray-50 -mx-2 px-2 py-0.5 rounded-lg transition-colors">
                <p className="text-sm font-medium text-gray-800">{c.name}</p>
                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                  Active
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
