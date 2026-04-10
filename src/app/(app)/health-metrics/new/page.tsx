"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { Toast } from "@/components/ui/Toast";
import { COMMON_METRIC_TYPES } from "@/lib/validation";
import { formatMetricLabel } from "@/lib/format-metric-label";

const NEW_OPTION = "__new__";

type MetricInfo = Record<string, { lastUnit: string; units: string[] }>;

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
  const searchParams = useSearchParams();
  const { activeProfileId } = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Distinct metric info fetched from DB
  const [metricInfo, setMetricInfo] = useState<MetricInfo>({});
  const [loadingInfo, setLoadingInfo] = useState(false);

  // ?type= param from URL (slug format, e.g. "blood-pressure-systolic")
  const typeParam = searchParams.get("type") ?? "";
  // Convert slug back to spaced normalized form for matching
  const typeParamNorm = typeParam.replace(/-/g, " ");

  // Metric type state
  const [metricTypeSelection, setMetricTypeSelection] = useState(""); // dropdown value
  const [customMetricType, setCustomMetricType] = useState(""); // only if NEW_OPTION
  const didPreFill = useRef(false);

  // Unit state
  const [unitSelection, setUnitSelection] = useState(""); // dropdown value
  const [customUnit, setCustomUnit] = useState(""); // only if NEW_OPTION

  const [value, setValue] = useState("");
  const [measuredAt, setMeasuredAt] = useState(nowLocalDatetimeLocal);
  const [notes, setNotes] = useState("");

  // Fetch distinct metric types/units when profile changes
  useEffect(() => {
    if (!activeProfileId) return;
    setLoadingInfo(true);
    fetch(`/api/health-metrics/distinct?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: MetricInfo) => setMetricInfo(data))
      .catch(() => setMetricInfo({}))
      .finally(() => setLoadingInfo(false));
  }, [activeProfileId]);

  // Existing metric types: DB ones first, then COMMON ones not already in DB
  const dbMetricTypes = Object.keys(metricInfo).sort();
  const extraCommon = COMMON_METRIC_TYPES.filter((t) => !metricInfo[t]);
  const allMetricTypeOptions = [...dbMetricTypes, ...extraCommon];

  // Pre-fill metric type from ?type= URL param once options are loaded
  useEffect(() => {
    if (didPreFill.current || !typeParamNorm || allMetricTypeOptions.length === 0) return;
    // Find exact or normalized match in available options
    const match = allMetricTypeOptions.find(
      (t) => t.toLowerCase().replace(/_/g, " ") === typeParamNorm
    );
    if (match) {
      didPreFill.current = true;
      handleMetricTypeChange(match);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMetricTypeOptions, typeParamNorm]);

  // Units available for the selected metric type
  const selectedMetricType = metricTypeSelection === NEW_OPTION ? customMetricType : metricTypeSelection;
  const dbUnitsForType = metricInfo[selectedMetricType]?.units ?? [];
  const allUnitOptions = dbUnitsForType; // only show units previously used for this type

  // When metric type changes, auto-set unit to last used
  function handleMetricTypeChange(val: string) {
    setMetricTypeSelection(val);
    setCustomMetricType("");
    if (val !== NEW_OPTION && val !== "") {
      const lastUnit = metricInfo[val]?.lastUnit ?? "";
      setUnitSelection(lastUnit || (allUnitOptions[0] ?? ""));
      setCustomUnit("");
    } else {
      setUnitSelection("");
      setCustomUnit("");
    }
  }

  // When unit selection changes
  function handleUnitChange(val: string) {
    setUnitSelection(val);
    setCustomUnit("");
  }

  const finalMetricType = metricTypeSelection === NEW_OPTION ? customMetricType : metricTypeSelection;
  const finalUnit = unitSelection === NEW_OPTION ? customUnit : unitSelection;

  async function handleSubmit(e: React.SyntheticEvent) {
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
          metricType: finalMetricType,
          value: parseFloat(value),
          unit: finalUnit,
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

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

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

        {/* Metric Type */}
        <div>
          <label htmlFor="metricType" className="block text-sm font-medium text-gray-700 mb-1">
            Metric type <span className="text-red-500">*</span>
          </label>
          <select
            id="metricType"
            required
            value={metricTypeSelection}
            onChange={(e) => handleMetricTypeChange(e.target.value)}
            disabled={loadingInfo}
            className={inputCls}
          >
            <option value="" disabled>Select a metric type…</option>
            {allMetricTypeOptions.map((t) => (
              <option key={t} value={t}>{formatMetricLabel(t)}</option>
            ))}
            <option value={NEW_OPTION}>+ Add new metric type</option>
          </select>
          {metricTypeSelection === NEW_OPTION && (
            <input
              type="text"
              required
              autoFocus
              value={customMetricType}
              onChange={(e) => setCustomMetricType(e.target.value)}
              placeholder="Enter new metric type"
              className={`${inputCls} mt-2`}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Value */}
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
              className={inputCls}
            />
          </div>

          {/* Unit */}
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unit <span className="text-red-500">*</span>
            </label>
            {allUnitOptions.length > 0 || (metricTypeSelection !== NEW_OPTION && metricTypeSelection !== "") ? (
              <>
                <select
                  id="unit"
                  required={unitSelection !== NEW_OPTION}
                  value={unitSelection}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>Select a unit…</option>
                  {allUnitOptions.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                  <option value={NEW_OPTION}>+ Add new unit</option>
                </select>
                {unitSelection === NEW_OPTION && (
                  <input
                    type="text"
                    required
                    autoFocus
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Enter new unit"
                    className={`${inputCls} mt-2`}
                  />
                )}
              </>
            ) : (
              // New metric type selected — free-text unit
              <input
                id="unit"
                type="text"
                required
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="e.g. kg, mmHg, mg/dL"
                className={inputCls}
              />
            )}
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
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputCls}
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
