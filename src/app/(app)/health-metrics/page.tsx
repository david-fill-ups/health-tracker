"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";
import { useProfile } from "@/components/layout/ProfileProvider";
import { COMMON_METRIC_TYPES } from "@/lib/validation";
import { getMetricReference } from "@/lib/health-metrics-reference";
import { formatMetricLabel, metricTypeToSlug } from "@/lib/format-metric-label";
import {
  normalizeType,
  normalizeUnit,
  getReferenceRange,
  getValueStatus,
  BADGE_STYLES,
  VALUE_STYLES,
  type ReferenceRange,
  type ReferenceZone,
  type ValueStatus,
} from "@/lib/health-metrics-ranges";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";

interface HealthMetric {
  id: string;
  metricType: string;
  value: number;
  unit: string;
  measuredAt: string;
  notes?: string | null;
}

// Returns "stale"/"old" label when reading is over a year old, null otherwise
function getReadingAgeLabel(iso: string): { text: string; old: boolean } | null {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days > 730) {
    const yrs = Math.round(days / 365);
    return { text: `${yrs}y ago`, old: true };
  }
  if (days > 365) return { text: "~1y ago", old: false };
  return null;
}

const BADGE_NEUTRAL = "text-gray-500 bg-gray-100";

function getYDomain(
  values: number[],
  refRange?: ReferenceRange,
  zones?: ReferenceZone[]
): [number, number] {
  // When zones are present, don't pad domain to zone bounds — zones can extend beyond data
  const refPoints = !zones && refRange ? [refRange.min, refRange.max] : [];
  const allValues = [...values, ...refPoints];
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin;
  const padding = range > 0 ? range * 0.15 : Math.abs(dataMax) * 0.1 || 1;
  return [dataMin - padding, dataMax + padding];
}

// Compute weight thresholds for each BMI zone from height (inches), for age 18+
function getWeightBmiZones(heightIn: number, weightUnit: string): ReferenceZone[] | undefined {
  const unit = normalizeUnit(weightUnit);
  const isLbs = unit === "lbs" || unit === "lb" || unit === "pound" || unit === "pounds";
  const isKg = unit === "kg" || unit === "kilogram" || unit === "kilograms";
  // Treat empty/unknown unit as lbs (most common for self-reported weight in the US)
  const useLbs = isLbs || (!isKg && unit === "");
  if (!useLbs && !isKg) return undefined;

  function bmiToWeight(bmi: number): number {
    if (useLbs) return (bmi * heightIn * heightIn) / 703;
    return bmi * Math.pow(heightIn * 0.0254, 2);
  }

  return [
    { min: 0,                 max: bmiToWeight(18.5), label: "Underweight", color: "#3b82f6" },
    { min: bmiToWeight(18.5), max: bmiToWeight(25),   label: "Normal",      color: "#10b981" },
    { min: bmiToWeight(25),   max: bmiToWeight(30),   label: "Overweight",  color: "#f59e0b" },
    { min: bmiToWeight(30),   max: bmiToWeight(60),   label: "Obese",       color: "#ef4444" },
  ];
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

type GroupBy = "type" | "year" | "none";
const GROUP_BY_OPTIONS: Array<{ label: string; value: GroupBy }> = [
  { label: "Type", value: "type" },
  { label: "Year", value: "year" },
  { label: "None", value: "none" },
];

export default function HealthMetricsPage() {
  const { activeProfileId } = useProfile();
  const router = useRouter();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "chart">("table");
  const [toast, setToast] = useState<string | null>(null);
  const [chartDateFrom, setChartDateFrom] = useState("");
  const [chartDateTo, setChartDateTo] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("type");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Fetch the active profile directly for always-fresh heightIn/birthDate
  const [currentProfile, setCurrentProfile] = useState<{ heightIn: number | null; birthDate: string } | null>(null);

  // Active profile age in years (for BMI zone applicability)
  const profileAge = useMemo(() => {
    if (!currentProfile?.birthDate) return null;
    return Math.floor(
      (Date.now() - new Date(currentProfile.birthDate).getTime()) / (365.25 * 86_400_000)
    );
  }, [currentProfile]);

  // Reference info for the currently filtered metric type
  const metricRef = useMemo(
    () => (activeType ? getMetricReference(activeType) : undefined),
    [activeType]
  );

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/health-metrics?profileId=${activeProfileId}`).then((r) => r.json()),
      fetch(`/api/profiles/${activeProfileId}`).then((r) => r.json()),
    ])
      .then(([metricsData, profileData]) => {
        setMetrics(Array.isArray(metricsData) ? metricsData : []);
        if (profileData?.id) {
          setCurrentProfile({
            heightIn: profileData.heightIn ?? null,
            birthDate: profileData.birthDate,
          });
        }
      })
      .catch(() => setMetrics([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  // Collect unique metricTypes from ALL metrics, deduplicating by normalizeType
  const filterTypes = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    // Common types first (if present in data)
    for (const t of COMMON_METRIC_TYPES) {
      const norm = normalizeType(t);
      if (!seen.has(norm) && metrics.some((m) => normalizeType(m.metricType) === norm)) {
        seen.add(norm);
        result.push(t);
      }
    }
    // Remaining types from data
    for (const m of metrics) {
      const norm = normalizeType(m.metricType);
      if (!seen.has(norm)) {
        seen.add(norm);
        result.push(m.metricType);
      }
    }
    return result;
  }, [metrics]);

  // Apply active type filter client-side (normalized comparison to handle case variants)
  const displayedMetrics = useMemo(
    () =>
      activeType
        ? metrics.filter((m) => normalizeType(m.metricType) === normalizeType(activeType))
        : metrics,
    [metrics, activeType]
  );

  // Filter displayed metrics by date range for chart view
  const filteredForChart = useMemo(() => {
    if (!chartDateFrom && !chartDateTo) return displayedMetrics;
    return displayedMetrics.filter((m) => {
      const d = m.measuredAt.slice(0, 10);
      if (chartDateFrom && d < chartDateFrom) return false;
      if (chartDateTo && d > chartDateTo) return false;
      return true;
    });
  }, [displayedMetrics, chartDateFrom, chartDateTo]);

  // Group metrics by type for chart view
  const metricsByType = useMemo(() => {
    const map = new Map<string, HealthMetric[]>();
    for (const m of filteredForChart) {
      const key = normalizeType(m.metricType);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
    }
    return map;
  }, [filteredForChart]);

  // Group displayed metrics for table view — use normalizeType as key to merge e.g. "Weight"/"weight"
  const groupedMetrics = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, HealthMetric[]>();
    for (const m of displayedMetrics) {
      const key =
        groupBy === "year"
          ? new Date(m.measuredAt).getFullYear().toString()
          : normalizeType(m.metricType);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
    }
    return Array.from(map.entries()).sort(
      ([, a], [, b]) => new Date(b[0].measuredAt).getTime() - new Date(a[0].measuredAt).getTime()
    );
  }, [displayedMetrics, groupBy]);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Health Metrics</h1>
        <div className="flex items-center gap-2">
          {/* Type filter dropdown */}
          {filterTypes.length > 0 && (
            <select
              value={activeType ?? ""}
              onChange={(e) => setActiveType(e.target.value || null)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {filterTypes.map((type) => (
                <option key={type} value={type}>
                  {formatMetricLabel(type)}
                </option>
              ))}
            </select>
          )}
          {/* Group by (table only) */}
          {view === "table" && filterTypes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">Group by</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
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

      {/* Date range picker for chart view */}
      {view === "chart" && !loading && displayedMetrics.length > 0 && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500 font-medium">Date range:</span>
          <input
            type="date"
            value={chartDateFrom}
            onChange={(e) => setChartDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={chartDateTo}
            onChange={(e) => setChartDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {(chartDateFrom || chartDateTo) && (
            <button
              onClick={() => { setChartDateFrom(""); setChartDateTo(""); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* About this metric */}
      {metricRef?.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">About this metric</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{metricRef.description}</p>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : displayedMetrics.length === 0 ? (
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
              id: m.id,
            }));
            const refRange = getReferenceRange(type, unit);
            const values = chartData.map((d) => d.value);

            // For Weight: compute BMI-derived zones if height known and age ≥ 18
            const isWeight = normalizeType(type) === "weight";
            const weightZones =
              isWeight && currentProfile?.heightIn && profileAge !== null && profileAge >= 18
                ? getWeightBmiZones(currentProfile.heightIn, unit)
                : undefined;
            const effectiveZones = refRange?.zones ?? weightZones;

            const yDomain = getYDomain(values, refRange, effectiveZones);

            return (
              <div key={type} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    <Link
                      href={`/health-metrics/${metricTypeToSlug(type)}`}
                      className="hover:text-indigo-600"
                    >
                      {formatMetricLabel(type)}
                    </Link>
                    <span className="ml-2 font-normal text-gray-400 text-xs">({unit})</span>
                  </h3>
                  {refRange && !effectiveZones && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {refRange.label ?? "Normal"}: {refRange.min}–{refRange.max}
                    </span>
                  )}
                  {effectiveZones && (
                    <div className="flex items-center gap-1">
                      {effectiveZones.map((z) => (
                        <span
                          key={z.label}
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ color: z.color, backgroundColor: `${z.color}18` }}
                        >
                          {z.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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
                      domain={yDomain}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} ${unit}`, formatMetricLabel(type)]}
                      labelFormatter={(label) => String(label)}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                      }}
                    />
                    {effectiveZones
                      ? effectiveZones.map((zone) => (
                          <ReferenceArea
                            key={zone.label}
                            y1={zone.min}
                            y2={zone.max}
                            fill={zone.color}
                            fillOpacity={0.1}
                            strokeOpacity={0}
                            ifOverflow="hidden"
                          />
                        ))
                      : refRange && (
                          <ReferenceArea
                            y1={refRange.min}
                            y2={refRange.max}
                            fill="#10b981"
                            fillOpacity={0.08}
                            strokeOpacity={0}
                            ifOverflow="hidden"
                          />
                        )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: color, cursor: "pointer" }}
                      activeDot={{
                        r: 6,
                        cursor: "pointer",
                        onClick: (_event: unknown, dotProps: unknown) => {
                          const id = (dotProps as { payload?: { id?: string } })?.payload?.id;
                          if (id) {
                            router.push(`/health-metrics/${id}/edit`);
                          }
                        },
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      ) : groupedMetrics ? (
        /* Grouped table view */
        <GroupedTable
          groupedMetrics={groupedMetrics}
          groupBy={groupBy}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          router={router}
          currentProfile={currentProfile}
          profileAge={profileAge}
        />
      ) : (
        /* Flat table view (groupBy === "none") */
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedMetrics.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/health-metrics/${m.id}/edit`)}
                >
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateTime(m.measuredAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/health-metrics/${metricTypeToSlug(m.metricType)}`}
                      className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      {formatMetricLabel(m.metricType)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {m.value} <span className="font-normal text-gray-500">{m.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{m.notes ?? ""}</td>
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

// Extracted to keep JSX manageable and allow tracking the "Older Results" separator
function GroupedTable({
  groupedMetrics,
  groupBy,
  expandedGroups,
  toggleGroup,
  router,
  currentProfile,
  profileAge,
}: {
  groupedMetrics: [string, HealthMetric[]][];
  groupBy: GroupBy;
  expandedGroups: Set<string>;
  toggleGroup: (key: string) => void;
  router: ReturnType<typeof useRouter>;
  currentProfile: { heightIn: number | null; birthDate: string } | null;
  profileAge: number | null;
}) {
  let emittedOldSeparator = false;

  return (
    <div className="space-y-3">
      {groupedMetrics.map(([groupKey, groupItems]) => {
        const isExpanded = expandedGroups.has(groupKey);
        const latest = groupItems[0];
        const rest = groupItems.slice(1);
        const refRange = groupBy === "type" ? getReferenceRange(groupKey, latest.unit) : undefined;
        const label = groupBy === "type" ? formatMetricLabel(groupKey) : groupKey;

        const latestStatus = refRange ? getValueStatus(latest.value, latest.unit, refRange) : null;
        const ageLabel = getReadingAgeLabel(latest.measuredAt);

        // Insert "Older Results" separator before the first group whose latest reading is old (> 1 year)
        const showSeparator = !emittedOldSeparator && ageLabel !== null;
        if (showSeparator) emittedOldSeparator = true;

        return (
          <div key={groupKey}>
            {showSeparator && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 border-t border-amber-200" />
                <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">
                  Older Results
                </span>
                <div className="flex-1 border-t border-amber-200" />
              </div>
            )}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer select-none"
                onClick={() => toggleGroup(groupKey)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {groupBy === "type" ? (
                    <Link
                      href={`/health-metrics/${metricTypeToSlug(groupKey)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-gray-800 text-sm truncate hover:text-indigo-600"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-800 text-sm truncate">{label}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {refRange && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      latestStatus ? BADGE_STYLES[latestStatus] : BADGE_NEUTRAL
                    }`}>
                      {refRange.label ?? "Normal"}: {refRange.min}–{refRange.max}
                      {latestStatus === null && refRange.unit ? ` ${refRange.unit}` : ""}
                    </span>
                  )}
                  <span className={`font-semibold text-sm ${latestStatus ? VALUE_STYLES[latestStatus] : "text-gray-900"}`}>
                    {latest.value}{" "}
                    <span className="font-normal text-gray-400 text-xs">{latest.unit}</span>
                  </span>
                  <span className={`text-xs whitespace-nowrap ${ageLabel ? (ageLabel.old ? "text-amber-500" : "text-amber-400") : "text-gray-400"}`}>
                    {formatDateShort(latest.measuredAt)}
                    {ageLabel && <span className="ml-1 opacity-75">({ageLabel.text})</span>}
                  </span>
                  <span className="text-xs text-gray-400 w-14 text-right">
                    {groupItems.length === 1
                      ? "1 reading"
                      : isExpanded
                      ? "▴"
                      : `+${rest.length} ▾`}
                  </span>
                </div>
              </div>

              {/* Expanded rows */}
              {isExpanded && (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {groupItems.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => router.push(`/health-metrics/${m.id}/edit`)}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap text-xs w-44">
                          {(() => {
                            const age = getReadingAgeLabel(m.measuredAt);
                            return (
                              <span className={age ? (age.old ? "text-amber-500" : "text-amber-400") : "text-gray-600"}>
                                {formatDateTime(m.measuredAt)}
                                {age && <span className="ml-1 opacity-75">({age.text})</span>}
                              </span>
                            );
                          })()}
                        </td>
                        {groupBy === "year" && (
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/health-metrics/${metricTypeToSlug(m.metricType)}`}
                              className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                            >
                              {formatMetricLabel(m.metricType)}
                            </Link>
                          </td>
                        )}
                        <td className="px-4 py-2.5 w-32">
                          {(() => {
                            const s = refRange ? getValueStatus(m.value, m.unit, refRange) : null;
                            return (
                              <span className={`font-semibold ${s ? VALUE_STYLES[s] : "text-gray-900"}`}>
                                {m.value}{" "}
                                <span className="font-normal text-gray-500">{m.unit}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">
                          {m.notes ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
