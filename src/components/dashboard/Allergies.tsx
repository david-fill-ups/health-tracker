"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Allergy {
  id: string;
  allergen: string;
  category: string | null;
}

export function Allergies({ activeProfileId }: { activeProfileId: string | null }) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    fetch(`/api/allergies?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: Allergy[]) => setAllergies(data))
      .catch(() => setAllergies([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Allergies</h2>
        <Link href="/allergies" className="text-xs text-indigo-600 hover:underline">
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

      {!loading && allergies.length === 0 && (
        <p className="text-sm text-gray-500">No allergies recorded.</p>
      )}

      {!loading && allergies.length > 0 && (() => {
        const groups: Record<string, Allergy[]> = {};
        for (const a of allergies) {
          const key = a.category ?? "Other";
          (groups[key] ??= []).push(a);
        }
        return (
          <div className="space-y-4">
            {Object.entries(groups).map(([category, items]) => (
              <div key={category}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{category}</p>
                <ul className="space-y-1">
                  {items.map((a) => (
                    <li key={a.id}>
                      <Link href={`/allergies/${a.id}/edit`} className="flex items-center hover:bg-gray-50 -mx-2 px-2 py-0.5 rounded-lg transition-colors">
                        <p className="text-sm font-medium text-gray-800">{a.allergen}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
