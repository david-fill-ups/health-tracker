"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { Toast } from "@/components/ui/Toast";

interface Facility {
  id: string;
  name: string;
}

const COMMON_VACCINES = [
  "Influenza",
  "COVID-19",
  "Tdap",
  "MMR",
  "Varicella",
  "HPV",
  "Hepatitis B",
  "Hepatitis A",
  "Shingrix",
  "RSV",
  "Pneumococcal",
  "Meningococcal",
  "DTaP",
  "Polio",
];

export default function NewVaccinationPage() {
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/facilities?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setFacilities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [activeProfileId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfileId,
          name,
          date,
          facilityId: facilityId || undefined,
          lotNumber: lotNumber || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save vaccination");
        return;
      }

      setSaved(true);
      setTimeout(() => { router.push("/vaccinations"); router.refresh(); }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/vaccinations" className="text-sm text-indigo-600 hover:underline">
          ← Back to Vaccinations
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Record Vaccination</h1>
      </div>

      {!activeProfileId ? (
        <p className="text-sm text-gray-500">Select a profile first.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Vaccine name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              list="vaccine-list"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Influenza"
            />
            <datalist id="vaccine-list">
              {COMMON_VACCINES.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
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

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Any reactions, observations, etc."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saved ? "Saved!" : submitting ? "Saving…" : "Record vaccination"}
            </button>
            <a
              href="/vaccinations"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </a>
          </div>
        </form>
      )}
      <Toast message={saved ? "Vaccination recorded" : null} onDismiss={() => setSaved(false)} />
    </div>
  );
}
