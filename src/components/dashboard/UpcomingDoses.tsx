"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MedicationLog {
  id: string;
  date: string;
}

interface Medication {
  id: string;
  name: string;
  active: boolean;
  dosage: string | null;
  frequency: string | null;
  recentLog: MedicationLog | null;
}

export function UpcomingDoses({ activeProfileId }: { activeProfileId: string | null }) {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    fetch(`/api/medications?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: Medication[]) => {
        setMeds(data.filter((m) => m.active));
      })
      .catch(() => setMeds([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Active Medications</h2>
        <Link href="/medications" className="text-xs text-indigo-600 hover:underline">
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

      {!loading && meds.length === 0 && (
        <p className="text-sm text-gray-500">No active medications.</p>
      )}

      {!loading && meds.length > 0 && (
        <ul className="space-y-3">
          {meds.map((m) => {
            const detail = [m.dosage, m.frequency].filter(Boolean).join(" · ");
            return (
              <li key={m.id}>
                <Link href={`/medications/${m.id}`} className="flex items-start justify-between gap-2 hover:bg-gray-50 -mx-2 px-2 py-0.5 rounded-lg transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.name}</p>
                    {detail && <p className="text-xs text-gray-500">{detail}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
