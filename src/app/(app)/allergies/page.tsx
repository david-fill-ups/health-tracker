"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { CardSkeleton } from "@/components/ui/Skeleton";

interface Allergy {
  id: string;
  allergen: string;
  category: string | null;
  diagnosisDate: string | null;
  whealSize: number | null;
  notes: string | null;
}

function AllergyPill({ allergy }: { allergy: Allergy }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/allergies/${allergy.id}/edit`)}
      className="inline-flex flex-col items-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs shadow-sm hover:bg-gray-50 hover:border-indigo-300 transition-colors cursor-pointer"
    >
      <span className="font-medium text-gray-800">{allergy.allergen}</span>
      {(allergy.diagnosisDate || allergy.whealSize != null) && (
        <span className="text-gray-400 mt-0.5">
          {allergy.diagnosisDate && (
            <>Dx {new Date(allergy.diagnosisDate).toLocaleDateString(undefined, { year: "numeric", month: "short", timeZone: "UTC" })}</>
          )}
          {allergy.diagnosisDate && allergy.whealSize != null && " · "}
          {allergy.whealSize != null && <>Wheal {allergy.whealSize}mm</>}
        </span>
      )}
      {allergy.notes && (
        <span className="text-gray-400 mt-0.5 max-w-[180px] truncate">{allergy.notes}</span>
      )}
    </button>
  );
}

export default function AllergiesPage() {
  const { activeProfileId } = useProfile();
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/allergies?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setAllergies(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load allergies"))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  // Group by category; null/empty → "Uncategorized" at end
  const groups = useMemo(() => {
    const map = new Map<string, Allergy[]>();
    for (const a of allergies) {
      const key = a.category?.trim() || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [allergies]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Allergies</h1>
        <Link
          href="/allergies/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Allergy
        </Link>
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view allergies.</p>
      )}

      {loading && <CardSkeleton count={3} />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          {allergies.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500 mb-3">No allergies recorded.</p>
              <Link
                href="/allergies/new"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + Add your first allergy
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(([category, items]) => (
                <div
                  key={category}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-900">{category}</h2>
                    <span className="text-xs text-gray-400">{items.length} {items.length === 1 ? "allergen" : "allergens"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((a) => (
                      <AllergyPill key={a.id} allergy={a} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
