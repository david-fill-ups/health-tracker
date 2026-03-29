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
  instructions: string | null;
  recentLog: MedicationLog | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getDoseStatus(med: Medication): { label: string; color: string } | null {
  if (!med.recentLog) {
    return null;
  }
  const lastDate = new Date(med.recentLog.date);
  const msSinceLast = Date.now() - lastDate.getTime();
  if (msSinceLast > SEVEN_DAYS_MS) {
    return {
      label: `Last: ${lastDate.toLocaleDateString()}`,
      color: "bg-red-100 text-red-700",
    };
  }
  return {
    label: `Last: ${lastDate.toLocaleDateString()}`,
    color: "bg-green-100 text-green-700",
  };
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
            const status = getDoseStatus(m);
            return (
              <li key={m.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.name}</p>
                </div>
                {status && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
