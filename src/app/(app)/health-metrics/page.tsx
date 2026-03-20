"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { COMMON_METRIC_TYPES } from "@/lib/validation";

interface HealthMetric {
  id: string;
  metricType: string;
  value: number;
  unit: string;
  measuredAt: string;
  notes?: string | null;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HealthMetricsPage() {
  const { activeProfileId } = useProfile();
  const router = useRouter();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    const url = activeType
      ? `/api/health-metrics?profileId=${activeProfileId}&metricType=${encodeURIComponent(activeType)}`
      : `/api/health-metrics?profileId=${activeProfileId}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setMetrics(Array.isArray(data) ? data : []))
      .catch(() => setMetrics([]))
      .finally(() => setLoading(false));
  }, [activeProfileId, activeType]);

  async function handleDelete(id: string) {
    if (!activeProfileId || !confirm("Delete this metric entry?")) return;
    setDeleting(id);
    await fetch(`/api/health-metrics/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    setDeleting(null);
  }

  // Collect unique metricTypes present in data for dynamic filter pills
  const presentTypes = Array.from(new Set(metrics.map((m) => m.metricType)));
  const filterTypes = Array.from(
    new Set([...COMMON_METRIC_TYPES.filter((t) => presentTypes.includes(t)), ...presentTypes.filter((t) => !COMMON_METRIC_TYPES.includes(t as never))])
  );

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Health Metrics</h1>
        <button
          onClick={() => router.push("/health-metrics/new")}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add Metric
        </button>
      </div>

      {/* Type filter pills */}
      {filterTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeType === null
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {filterTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type === activeType ? null : type)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeType === type
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : metrics.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No health metrics recorded yet.</p>
          <button
            onClick={() => router.push("/health-metrics/new")}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add your first metric
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateTime(m.measuredAt)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {m.metricType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {m.value} <span className="font-normal text-gray-500">{m.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{m.notes ?? ""}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => router.push(`/health-metrics/${m.id}/edit`)}
                      className="mr-3 text-indigo-600 hover:underline text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deleting === m.id}
                      className="text-red-500 hover:underline text-xs disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
