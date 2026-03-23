"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const { activeProfileId } = useProfile();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<VaccinationSource>("ADMINISTERED");
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [date, setDate] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [notes, setNotes] = useState("");

  const isAdministered = source === "ADMINISTERED";
  const isNatural = source === "NATURAL";
  const isDeclined = source === "DECLINED";

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/facilities?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setFacilities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [activeProfileId]);

  useEffect(() => {
    if (!isAdministered) {
      setFacilityId("");
      setLotNumber("");
    }
  }, [isAdministered]);

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
          date: date || undefined,
          source,
          facilityId: facilityId || undefined,
          lotNumber: lotNumber || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              {isNatural ? "Disease / condition" : "Vaccine name"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              list="vaccine-list"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder={isNatural ? "e.g. Varicella (Chickenpox)" : "e.g. Influenza"}
            />
            <datalist id="vaccine-list">
              {COMMON_VACCINES.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              {isNatural ? "Approx. date of illness" : isDeclined ? "Date declined" : "Date"}
              {!isNatural && <span className="text-red-500"> *</span>}
              {isNatural && <span className="text-gray-400 text-xs ml-1">(optional)</span>}
            </label>
            <input
              id="date"
              type="date"
              required={!isNatural}
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
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              {isDeclined ? "Reason" : "Notes"}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder={
                isDeclined
                  ? "Optional reason for declining"
                  : isNatural
                  ? "Any details, lab confirmation, etc."
                  : "Any reactions, observations, etc."
              }
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saved ? "Saved!" : submitting ? "Saving…" : "Save record"}
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
      <Toast message={saved ? "Record saved" : null} onDismiss={() => setSaved(false)} />
    </div>
  );
}
