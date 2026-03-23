"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { Toast } from "@/components/ui/Toast";
import { COMMON_METRIC_TYPES } from "@/lib/validation";

const COMMON_UNITS = ["kg", "lbs", "mmHg", "mg/dL", "mmol/L", "bpm", "%", "cm", "in"];

function toLocalDatetimeInput(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

function nowLocalDatetimeLocal() {
  const now = new Date();
  now.setSeconds(0, 0);
  return toLocalDatetimeInput(now);
}

export default function NewHealthMetricPage() {
  const router = useRouter();
  const { activeProfileId } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metricType, setMetricType] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [measuredAt, setMeasuredAt] = useState(nowLocalDatetimeLocal);
  const [notes, setNotes] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeProfileId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/health-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfileId,
          metricType,
          value: parseFloat(value),
          unit,
          measuredAt: new Date(measuredAt).toISOString(),
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save metric");
        return;
      }

      setSaved(true);
      setTimeout(() => { router.push("/health-metrics"); router.refresh(); }, 1500);
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/health-metrics" className="text-sm text-indigo-600 hover:underline">
          ← Back to Health Metrics
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Log a Metric</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="metricType" className="block text-sm font-medium text-gray-700 mb-1">
            Metric type <span className="text-red-500">*</span>
          </label>
          <input
            id="metricType"
            type="text"
            required
            list="metric-type-suggestions"
            value={metricType}
            onChange={(e) => setMetricType(e.target.value)}
            placeholder="e.g. Weight, Blood Pressure Systolic"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <datalist id="metric-type-suggestions">
            {COMMON_METRIC_TYPES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
              Value <span className="text-red-500">*</span>
            </label>
            <input
              id="value"
              type="number"
              required
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit <span className="text-red-500">*</span>
            </label>
            <input
              id="unit"
              type="text"
              required
              list="unit-suggestions"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. kg, mmHg, mg/dL"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <datalist id="unit-suggestions">
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label htmlFor="measuredAt" className="block text-sm font-medium text-gray-700 mb-1">
            Measured at <span className="text-red-500">*</span>
          </label>
          <input
            id="measuredAt"
            type="datetime-local"
            required
            value={measuredAt}
            onChange={(e) => setMeasuredAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saved ? "Saved!" : submitting ? "Saving…" : "Save metric"}
          </button>
          <a
            href="/health-metrics"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
        </div>
      </form>
      <Toast message={saved ? "Metric saved" : null} onDismiss={() => setSaved(false)} />
    </div>
  );
}
