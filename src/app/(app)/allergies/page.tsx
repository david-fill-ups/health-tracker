"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";

interface Allergy {
  id: string;
  allergen: string;
  category: string | null;
  diagnosisDate: string | null;
  whealSize: number | null;
  notes: string | null;
}

function AllergyCard({
  allergy,
  profileId,
  onDelete,
}: {
  allergy: Allergy;
  profileId: string;
  onDelete: (id: string) => void;
}) {
  async function handleDelete() {
    if (!confirm(`Delete allergy "${allergy.allergen}"?`)) return;
    await fetch(`/api/allergies/${allergy.id}?profileId=${profileId}`, {
      method: "DELETE",
    });
    onDelete(allergy.id);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900">{allergy.allergen}</p>
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
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/allergies/${allergy.id}/edit`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
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

  function handleDelete(id: string) {
    setAllergies((prev) => prev.filter((a) => a.id !== id));
  }

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

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          {allergies.length === 0 ? (
            <p className="text-sm text-gray-500">No allergies recorded.</p>
          ) : (
            <div className="space-y-3">
              {allergies.map((a) => (
                <AllergyCard
                  key={a.id}
                  allergy={a}
                  profileId={activeProfileId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
