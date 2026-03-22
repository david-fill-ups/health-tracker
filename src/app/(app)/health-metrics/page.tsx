"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { useProfile } from "@/components/layout/ProfileProvider";
import { COMMON_METRIC_TYPES } from "@/lib/validation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

const LINE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

export default function HealthMetricsPage() {
  const { activeProfileId } = useProfile();
  const router = useRouter();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "chart">("table");
  const [toast, setToast] = useState<string | null>(null);

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
    const snapshot = metrics.find((m) => m.id === id);
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/health-metrics/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setToast("Metric deleted");
    } catch {
      if (snapshot) setMetrics((prev) => [...prev, snapshot]);
      setToast("Failed to delete metric");
    } finally {
      setDeleting(null);
    }
  }

  // Collect unique metricTypes present in data for dynamic filter pills
  const filterTypes = useMemo(() => {
    const presentTypes = Array.from(new Set(metrics.map((m) => m.metricType)));
    return Array.from(
      new Set([
        ...COMMON_METRIC_TYPES.filter((t) => presentTypes.includes(t)),
        ...presentTypes.filter((t) => !COMMON_METRIC_TYPES.includes(t as never)),
      ])
    );
  }, [metrics]);

  // Group metrics by type for chart view
  const metricsByType = useMemo(() => {
    const map = new Map<string, HealthMetric[]>();
    for (const m of metrics) {
      if (!map.has(m.metricType)) map.set(m.metricType, []);
      map.get(m.metricType)!.push(m);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
    }
    return map;
  }, [metrics]);

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Health Metrics</h1>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "table"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setView("chart")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "chart"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Chart
            </button>
          </div>
          <button
            onClick={() => router.push("/health-metrics/new")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Metric
          </button>
        </div>
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
        <TableSkeleton rows={5} cols={4} />
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
      ) : view === "chart" ? (
        <div className="space-y-6">
          {Array.from(metricsByType.entries()).map(([type, typeMetrics], idx) => {
            const color = LINE_COLORS[idx % LINE_COLORS.length];
            const unit = typeMetrics[0]?.unit ?? "";
            const chartData = typeMetrics.map((m) => ({
              date: formatDateShort(m.measuredAt),
              value: m.value,
              fullDate: formatDateTime(m.measuredAt),
            }));
            return (
              <div key={type} className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  {type}
                  <span className="ml-2 font-normal text-gray-400 text-xs">({unit})</span>
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} ${unit}`, type]}
                      labelFormatter={(label) => String(label)}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: color }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
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
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
