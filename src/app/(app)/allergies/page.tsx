"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

function AllergyCard({ allergy }: { allergy: Allergy }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/allergies/${allergy.id}/edit`}
          className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
        >
          {allergy.allergen}
        </Link>
        {allergy.category && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {allergy.category}
          </span>
        )}
      </div>
      <div className="mt-1 flex gap-4 text-xs text-gray-400">
        {allergy.diagnosisDate && (
          <span>Diagnosed {new Date(allergy.diagnosisDate).toLocaleDateString()}</span>
        )}
      </div>
      {allergy.notes && (
        <p className="mt-1 text-sm text-gray-500">{allergy.notes}</p>
      )}
    </div>
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
            <div className="space-y-3">
              {allergies.map((a) => (
                <AllergyCard key={a.id} allergy={a} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
