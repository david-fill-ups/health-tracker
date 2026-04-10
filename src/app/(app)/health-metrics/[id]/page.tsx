"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { getMetricReference } from "@/lib/health-metrics-reference";
import { formatMetricLabel, slugToNormalizedType, metricTypeToSlug } from "@/lib/format-metric-label";
import {
  normalizeType,
  normalizeUnit,
  getReferenceRange,
  getValueStatus,
  BADGE_STYLES,
  VALUE_STYLES,
  type ReferenceRange,
  type ReferenceZone,
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getYDomain(
  values: number[],
  refRange?: ReferenceRange,
  zones?: ReferenceZone[]
): [number, number] {
  const refPoints = !zones && refRange ? [refRange.min, refRange.max] : [];
  const allValues = [...values, ...refPoints];
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin;
  const padding = range > 0 ? range * 0.15 : Math.abs(dataMax) * 0.1 || 1;
  return [dataMin - padding, dataMax + padding];
}

const BADGE_NEUTRAL = "text-gray-500 bg-gray-100";

export default function MetricTypePage() {
  const { id: slug } = useParams<{ id: string }>();
  const { activeProfileId } = useProfile();

  const [allMetrics, setAllMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve the stored metric type from slug — after load, use the actual stored value
  const slugNorm = slugToNormalizedType(slug);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    fetch(`/api/health-metrics?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: HealthMetric[]) => {
        if (Array.isArray(data)) setAllMetrics(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  // Match by normalizing both the slug and the stored type
  const metrics = useMemo(
    () => allMetrics.filter((m) => normalizeType(m.metricType) === slugNorm),
    [allMetrics, slugNorm]
  );

  // Use the canonical stored type name (from first entry) or derive from slug
  const canonicalType = metrics[0]?.metricType ?? slugNorm;
  const displayName = formatMetricLabel(canonicalType);

  const metricRef = getMetricReference(canonicalType);
  const aliases = metricRef?.aliases ?? [];

  // Group by unit for chart/table rendering
  const byUnit = useMemo(() => {
    const map = new Map<string, HealthMetric[]>();
    for (const m of metrics) {
      if (!map.has(m.unit)) map.set(m.unit, []);
      map.get(m.unit)!.push(m);
    }
    return map;
  }, [metrics]);

  const refRange = metrics[0] ? getReferenceRange(canonicalType, metrics[0].unit) : undefined;

  const logUrl = `/health-metrics/new?type=${encodeURIComponent(metricTypeToSlug(canonicalType))}`;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link href="/health-metrics" className="text-sm text-indigo-600 hover:underline">
          ← Back to Health Metrics
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{displayName}</h1>
        {aliases.length > 0 && (
          <p className="mt-1 text-sm text-gray-400">Also known as: {aliases.join(", ")}</p>
        )}
      </div>

      {/* About this metric */}
      {metricRef?.description && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            About this metric
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">{metricRef.description}</p>
        </div>
      )}

      {/* Reference range */}
      {refRange && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Reference range
          </h2>
          {refRange.zones ? (
            <div className="space-y-1.5">
              {refRange.zones.map((z) => (
                <div key={z.label} className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: z.color }}
                  />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">{z.label}</span>
                    {" "}
                    <span className="text-gray-400">
                      {z.min}–{z.max}{refRange.unit ? ` ${refRange.unit}` : ""}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-gray-700">
                {refRange.label ?? "Normal"}:
              </span>
              <span className="text-gray-500">
                {refRange.min}–{refRange.max}
                {refRange.unit ? ` ${refRange.unit}` : ""}
              </span>
            </div>
          )}
          <p className="mt-3 text-xs text-gray-400">
            Reference ranges are general guidelines. Consult your doctor for interpretation.
          </p>
        </div>
      )}

      {/* Chart (only if ≥ 2 entries for a unit) */}
      {!loading && Array.from(byUnit.entries()).map(([unit, entries]) => {
        if (entries.length < 2) return null;
        const sorted = [...entries].sort(
          (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
        );
        const chartData = sorted.map((m) => ({
          date: new Date(m.measuredAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }),
          value: m.value,
        }));
        const values = sorted.map((m) => m.value);
        const refForUnit = getReferenceRange(canonicalType, unit);
        const [yMin, yMax] = getYDomain(values, refForUnit, refForUnit?.zones);

        return (
          <div key={unit} className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Trend ({unit})
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11 }} width={45} />
                <Tooltip
                  formatter={(val) => [`${val} ${unit}`, displayName]}
                  contentStyle={{ fontSize: 12 }}
                />
                {refForUnit && !refForUnit.zones && (
                  <ReferenceArea
                    y1={refForUnit.min}
                    y2={refForUnit.max}
                    fill="#d1fae5"
                    fillOpacity={0.4}
                  />
                )}
                {refForUnit?.zones?.map((z) => (
                  <ReferenceArea
                    key={z.label}
                    y1={z.min}
                    y2={z.max}
                    fill={z.color}
                    fillOpacity={0.12}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#6366f1" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}

      {/* Readings list */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Your readings
          </h2>
          <Link href={logUrl} className="text-xs text-indigo-600 hover:underline">
            + Log a reading
          </Link>
        </div>

        {!activeProfileId && (
          <p className="text-sm text-gray-400">Select a profile to view your records.</p>
        )}

        {activeProfileId && loading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        )}

        {activeProfileId && !loading && metrics.length === 0 && (
          <p className="text-sm text-gray-400">No readings recorded yet.</p>
        )}

        {activeProfileId && !loading && metrics.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {metrics
              .slice()
              .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
              .map((m) => {
                const ref = getReferenceRange(m.metricType, m.unit);
                const status = ref ? getValueStatus(m.value, m.unit, ref) : null;
                const badgeCls = status ? BADGE_STYLES[status] : BADGE_NEUTRAL;
                const valueCls = status ? VALUE_STYLES[status] : "text-gray-900";
                const pct = ref && normalizeUnit(m.unit) === "%";
                const unitForRef = pct ? "%" : (ref?.unit ?? m.unit);
                const showBadge = !ref?.unit || normalizeUnit(m.unit) === normalizeUnit(unitForRef);

                return (
                  <li key={m.id} className="py-2.5 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-semibold tabular-nums ${valueCls}`}>
                          {m.value} {m.unit}
                        </span>
                        {status && showBadge && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
                            {status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(m.measuredAt)}</p>
                      {m.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 italic">{m.notes}</p>
                      )}
                    </div>
                    <Link
                      href={`/health-metrics/${m.id}/edit`}
                      className="text-xs text-gray-400 hover:text-indigo-600 shrink-0 mt-0.5"
                    >
                      Edit
                    </Link>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
