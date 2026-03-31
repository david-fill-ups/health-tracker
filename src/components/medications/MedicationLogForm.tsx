"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";

interface MedicationLogFormProps {
  medicationId: string;
  profileId: string;
  medicationDosage?: string | null;
  medicationType?: string | null;
  returnTo?: string;
}

function parseMedicationDosage(s: string): { dosage: string; unit: string } {
  const match = s.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (match) return { dosage: match[1], unit: match[2].trim() };
  return { dosage: "", unit: s.trim() };
}

const INJECTION_SITES = [
  "Left thigh",
  "Right thigh",
  "Left abdomen",
  "Right abdomen",
  "Left arm",
  "Right arm",
  "Other",
];

function nowLocal() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MedicationLogForm({ medicationId, profileId, medicationDosage, medicationType, returnTo = "/medications" }: MedicationLogFormProps) {
  const isDevice = medicationType === "DEVICE";
  const isInjectable = medicationType === "INJECTABLE";
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(nowLocal());
  const [dosage, setDosage] = useState("");
  const [unit, setUnit] = useState("");

  useEffect(() => {
    if (!medicationDosage) return;
    const parsed = parseMedicationDosage(medicationDosage);
    if (parsed.dosage) setDosage(parsed.dosage);
    if (parsed.unit) setUnit(parsed.unit);
  }, [medicationDosage]);
  const [injectionSite, setInjectionSite] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body = {
      profileId,
      date,
      dosage: dosage ? parseFloat(dosage) : undefined,
      unit: unit || undefined,
      injectionSite: injectionSite || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      notes: notes || undefined,
    };

    try {
      const res = await fetch(`/api/medications/${medicationId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to log dose");
        return;
      }

      router.push(returnTo);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date &amp; time <span className="text-red-500">*</span>
        </label>
        <input
          type="datetime-local"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {!isDevice && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
            <input
              type="number"
              step="any"
              min="0"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. 2.5"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input
              type="text"
              list="unit-suggestions"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="mg, mL, units…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <datalist id="unit-suggestions">
              <option value="mg" />
              <option value="mL" />
              <option value="units" />
              <option value="mcg" />
              <option value="IU" />
            </datalist>
          </div>
        </div>
      )}

      {isInjectable && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Injection site</label>
          <select
            value={injectionSite}
            onChange={(e) => setInjectionSite(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— Select site —</option>
            {INJECTION_SITES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Weight today (lbs)
        </label>
        <input
          type="number"
          step="0.1"
          min="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Optional"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Any observations, side effects, etc."
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto rounded-lg bg-green-600 px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Log dose"}
        </button>
        <a
          href={returnTo}
          className="w-full sm:w-auto text-center rounded-lg border border-gray-300 px-4 py-3 sm:py-2 text-base sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
