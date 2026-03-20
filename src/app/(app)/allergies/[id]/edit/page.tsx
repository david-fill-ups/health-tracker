"use client";

import { useState, useEffect, use, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";

export default function EditAllergyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allergen, setAllergen] = useState("");
  const [category, setCategory] = useState("");
  const [diagnosisDate, setDiagnosisDate] = useState("");
  const [whealSize, setWhealSize] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/allergies/${id}?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => {
        setAllergen(data.allergen ?? "");
        setCategory(data.category ?? "");
        setDiagnosisDate(data.diagnosisDate ? data.diagnosisDate.slice(0, 10) : "");
        setWhealSize(data.whealSize != null ? String(data.whealSize) : "");
        setNotes(data.notes ?? "");
      })
      .catch(() => setError("Failed to load allergy"))
      .finally(() => setLoading(false));
  }, [id, activeProfileId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/allergies/${id}?profileId=${activeProfileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allergen,
          category: category || undefined,
          diagnosisDate: diagnosisDate || undefined,
          whealSize: whealSize ? parseFloat(whealSize) : undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save allergy");
        return;
      }

      router.push("/allergies");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/allergies" className="text-sm text-indigo-600 hover:underline">
          ← Back to Allergies
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Allergy</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allergen <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={allergen}
            onChange={(e) => setAllergen(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g. Tree, Common Household Mold, Food, Pet"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis date</label>
            <input
              type="date"
              value={diagnosisDate}
              onChange={(e) => setDiagnosisDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wheal size (mm)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={whealSize}
              onChange={(e) => setWhealSize(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save changes"}
          </button>
          <a
            href="/allergies"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
