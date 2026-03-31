"use client";

import { useState, useEffect, use, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { Toast } from "@/components/ui/Toast";

interface Facility {
  id: string;
  name: string;
}

type VaccinationSource = "ADMINISTERED" | "NATURAL" | "DECLINED";

const SOURCE_OPTIONS: { value: VaccinationSource; label: string; description: string }[] = [
  { value: "ADMINISTERED", label: "Administered", description: "I received this vaccine" },
  { value: "NATURAL", label: "Natural immunity", description: "I had the disease" },
  { value: "DECLINED", label: "Declined", description: "I chose not to vaccinate" },
];

export default function EditVaccinationPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [date, setDate] = useState("");
  const [source, setSource] = useState<VaccinationSource>("ADMINISTERED");
  const [facilityId, setFacilityId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [notes, setNotes] = useState("");

  const isAdministered = source === "ADMINISTERED";

  useEffect(() => {
    if (!activeProfileId) return;
    Promise.all([
      fetch(`/api/vaccinations/${id}`).then((r) => r.json()),
      fetch(`/api/facilities?profileId=${activeProfileId}`).then((r) => r.json()),
    ])
      .then(([vax, facs]) => {
        setDate(vax.date ? vax.date.slice(0, 10) : "");
        setSource(vax.source ?? "ADMINISTERED");
        setFacilityId(vax.facilityId ?? "");
        setLotNumber(vax.lotNumber ?? "");
        setNotes(vax.notes ?? "");
        setFacilities(Array.isArray(facs) ? facs : []);
      })
      .catch(() => setError("Failed to load vaccination record"))
      .finally(() => setLoading(false));
  }, [id, activeProfileId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/vaccinations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date || undefined,
          source,
          facilityId: isAdministered && facilityId ? facilityId : null,
          lotNumber: isAdministered && lotNumber ? lotNumber : null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }

      setSaved(true);
      setTimeout(() => { router.push(`/vaccinations/${slug}`); router.refresh(); }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this vaccination record?")) return;
    setDeleting(true);
    const res = await fetch(`/api/vaccinations/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push(`/vaccinations/${slug}`);
      router.refresh();
    } else {
      setError("Failed to delete vaccination");
      setDeleting(false);
    }
  }

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href={`/vaccinations/${slug}`} className="text-sm text-indigo-600 hover:underline">
          ← Back
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit Vaccination</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSource(opt.value)}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  source === opt.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="block font-medium">{opt.label}</span>
                <span className="block text-xs text-gray-400 mt-0.5">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {isAdministered && (
          <div>
            <label htmlFor="facility" className="block text-sm font-medium text-gray-700 mb-1">Facility</label>
            <select
              id="facility"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— None —</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isAdministered && (
          <div>
            <label htmlFor="lotNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Lot number
            </label>
            <input
              id="lotNumber"
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            id="notes"
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
            {saved ? "Saved!" : submitting ? "Saving…" : "Save changes"}
          </button>
          <a
            href={`/vaccinations/${slug}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>
      <Toast message={saved ? "Saved successfully" : null} onDismiss={() => setSaved(false)} />
    </div>
  );
}
