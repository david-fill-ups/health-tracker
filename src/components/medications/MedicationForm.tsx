"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MEDICATION_TYPE_LABELS } from "@/lib/validation";

interface Doctor {
  id: string;
  name: string;
}

const MEDICATION_TYPES = Object.entries(MEDICATION_TYPE_LABELS) as [
  keyof typeof MEDICATION_TYPE_LABELS,
  string,
][];

interface MedicationFormProps {
  profileId: string;
  /** When provided, the form operates in edit mode */
  initialValues?: {
    name: string;
    medicationType: string | null;
    dosage: string | null;
    frequency: string | null;
    prescribingDoctorId: string | null;
    startDate: string | null;
    endDate: string | null;
    instructions: string | null;
    active: boolean;
  };
  medicationId?: string;
}

export function MedicationForm({ profileId, initialValues, medicationId }: MedicationFormProps) {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [medicationType, setMedicationType] = useState(initialValues?.medicationType ?? "ORAL");
  const [dosage, setDosage] = useState(initialValues?.dosage ?? "");
  const [frequency, setFrequency] = useState(initialValues?.frequency ?? "");
  const [prescribingDoctorId, setPrescribingDoctorId] = useState(
    initialValues?.prescribingDoctorId ?? ""
  );
  const [startDate, setStartDate] = useState(initialValues?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(initialValues?.endDate?.slice(0, 10) ?? "");
  const [instructions, setInstructions] = useState(initialValues?.instructions ?? "");
  const [active, setActive] = useState(initialValues?.active ?? true);

  useEffect(() => {
    fetch(`/api/doctors?profileId=${profileId}`)
      .then((r) => r.json())
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [profileId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body = {
      profileId,
      name,
      medicationType,
      dosage: dosage || null,
      frequency: frequency || null,
      prescribingDoctorId: prescribingDoctorId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      instructions: instructions || null,
      active,
    };

    try {
      const res = medicationId
        ? await fetch(`/api/medications/${medicationId}?profileId=${profileId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/medications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save medication");
        return;
      }

      router.push("/medications");
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
          Medication name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="e.g. Metformin"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          value={medicationType}
          onChange={(e) => setMedicationType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {MEDICATION_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {medicationType !== "DEVICE" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Dosage</label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g. 500mg, 10mg/0.5mL"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
        <input
          type="text"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="e.g. Daily, As needed, 1 / week"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Prescribing doctor</label>
        <select
          value={prescribingDoctorId}
          onChange={(e) => setPrescribingDoctorId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">— None —</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Instructions / notes
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Dosage instructions, timing, etc."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="active" className="text-sm font-medium text-gray-700">
          Currently active
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : medicationId ? "Save changes" : "Add medication"}
        </button>
        <a
          href="/medications"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
