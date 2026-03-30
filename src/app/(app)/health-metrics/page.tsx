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

interface ReferenceRange {
  min: number;
  max: number;
  label?: string;
  unit?: string; // if set, status coloring is skipped when stored unit doesn't match
}

// Normalize metric type string for lookup: lowercase, underscores → spaces, collapse whitespace
function normalizeType(type: string): string {
  return type.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

// Normalize unit string for comparison: lowercase, no whitespace, µ/μ → u
function normalizeUnit(u: string): string {
  return u
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[µμ]/g, "u")
    .replace(/×10[e^]?3/gi, "k")
    .replace(/x10e3/gi, "k");
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

// Known medical abbreviations that should be ALL CAPS
const MEDICAL_ABBREVIATIONS = new Set([
  "tsh", "t3", "t4",
  "alt", "ast", "alp", "ggt",
  "ldl", "hdl", "vldl",
  "bmi", "bun", "crp", "esr", "psa",
  "wbc", "rbc", "cbc", "hgb", "hct", "mcv", "mch", "mchc",
  "fsh", "lh", "dhea", "dheas", "tpo",
  "ige", "igg", "iga", "igm",
  "dna", "rna", "pcr", "hiv",
  "covid", "bnp",
]);

// Words with special mixed-case formatting
const SPECIAL_CASE_WORDS: Record<string, string> = {
  "spo2": "SpO2",
  "egfr": "eGFR",
  "hba1c": "HbA1c",
  "a1c": "A1C",
};

function formatWord(word: string): string {
  const lower = word.toLowerCase();
  if (SPECIAL_CASE_WORDS[lower]) return SPECIAL_CASE_WORDS[lower];
  if (MEDICAL_ABBREVIATIONS.has(lower)) return lower.toUpperCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Convert any metric type string to a readable label:
// - snake_case → spaces
// - abbreviations → UPPER (TSH, ALT, LDL…)
// - special cases → mixed (SpO2, eGFR, A1C…)
// - everything else → Title Case
function formatMetricLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => {
      // Handle parenthesized segment e.g. "(Fasting)" or "(spo2)"
      const m = word.match(/^(\()(.+?)(\))$/);
      if (m) return `(${formatWord(m[2])})`;
      return formatWord(word);
    })
    .join(" ");
}

// Reference ranges keyed by normalized type (lowercase, spaces — underscores handled by normalizeType)
const REFERENCE_RANGES: Record<string, ReferenceRange> = {
  // ── Vitals ───────────────────────────────────────────────
  "blood pressure systolic":  { min: 90,   max: 120,  label: "Normal" },
  "blood pressure diastolic": { min: 60,   max: 80,   label: "Normal" },
  "blood sugar (fasting)":    { min: 70,   max: 100,  label: "Normal" },
  "blood sugar fasting":      { min: 70,   max: 100,  label: "Normal" },
  "blood sugar (post-meal)":  { min: 70,   max: 140,  label: "Normal (2hr)" },
  "heart rate":               { min: 60,   max: 100,  label: "Normal resting" },
  "blood oxygen (spo2)":      { min: 95,   max: 100,  label: "Normal" },
  "bmi":                      { min: 18.5, max: 24.9, label: "Normal" },

  // ── CBC ──────────────────────────────────────────────────
  "wbc":         { min: 4.5,  max: 11.0, label: "Normal" },
  "rbc":         { min: 4.5,  max: 5.9,  label: "Normal (male)" },
  "hemoglobin":  { min: 13.5, max: 17.5, label: "Normal (male)" },
  "hematocrit":  { min: 41,   max: 53,   label: "Normal (male)" },
  "mcv":         { min: 80,   max: 100,  label: "Normal" },
  "mch":         { min: 27,   max: 33,   label: "Normal" },
  "mchc":        { min: 32,   max: 36,   label: "Normal" },
  "platelets":   { min: 150,  max: 400,  label: "Normal" },
  "neutrophils": { min: 1.8,  max: 7.7,  label: "Normal" },
  "lymphocytes": { min: 1.0,  max: 4.8,  label: "Normal" },
  "monocytes":   { min: 0.2,  max: 0.95, label: "Normal" },
  "eosinophils": { min: 0.0,  max: 0.5,  label: "Normal" },
  "basophils":   { min: 0.0,  max: 0.1,  label: "Normal" },

  // ── CMP / Metabolic ──────────────────────────────────────
  "glucose":        { min: 70,  max: 100,  label: "Normal (fasting)", unit: "mg/dL" },
  "bun":            { min: 7,   max: 25,   label: "Normal",           unit: "mg/dL" },
  "creatinine":     { min: 0.7, max: 1.3,  label: "Normal",           unit: "mg/dL" },
  "egfr":           { min: 60,  max: 120,  label: "Normal" },
  "sodium":         { min: 136, max: 145,  label: "Normal",           unit: "mmol/L" },
  "potassium":      { min: 3.5, max: 5.1,  label: "Normal",           unit: "mmol/L" },
  "chloride":       { min: 98,  max: 106,  label: "Normal",           unit: "mmol/L" },
  "bicarbonate":    { min: 22,  max: 29,   label: "Normal",           unit: "mmol/L" },
  "calcium":        { min: 8.5, max: 10.5, label: "Normal",           unit: "mg/dL" },
  "albumin":        { min: 3.5, max: 5.0,  label: "Normal",           unit: "g/dL" },
  "total protein":  { min: 6.3, max: 8.2,  label: "Normal",           unit: "g/dL" },
  "bilirubin total":{ min: 0.1, max: 1.2,  label: "Normal",           unit: "mg/dL" },
  "alp":            { min: 44,  max: 147,  label: "Normal",           unit: "IU/L" },
  "alt":            { min: 7,   max: 40,   label: "Normal",           unit: "IU/L" },
  "ast":            { min: 10,  max: 40,   label: "Normal",           unit: "IU/L" },
  "ggt":            { min: 8,   max: 61,   label: "Normal",           unit: "IU/L" },
  "uric acid":      { min: 3.4, max: 7.0,  label: "Normal (male)",    unit: "mg/dL" },
  "phosphorus":     { min: 2.5, max: 4.5,  label: "Normal",           unit: "mg/dL" },
  "magnesium":      { min: 1.7, max: 2.2,  label: "Normal",           unit: "mg/dL" },

  // ── Lipids ───────────────────────────────────────────────
  "total cholesterol": { min: 0,   max: 200, label: "Desirable", unit: "mg/dL" },
  "ldl":               { min: 0,   max: 100, label: "Optimal",   unit: "mg/dL" },
  "hdl":               { min: 40,  max: 80,  label: "Normal",    unit: "mg/dL" },
  "triglycerides":     { min: 0,   max: 150, label: "Normal",    unit: "mg/dL" },
  "vldl":              { min: 2,   max: 30,  label: "Normal",    unit: "mg/dL" },

  // ── Diabetes ─────────────────────────────────────────────
  "hemoglobin a1c": { min: 4.0, max: 5.6, label: "Normal" },
  "a1c":            { min: 4.0, max: 5.6, label: "Normal" },
  "insulin":        { min: 2.6, max: 24.9,label: "Fasting" },

  // ── Thyroid ──────────────────────────────────────────────
  "tsh":                   { min: 0.4,  max: 4.0,  label: "Normal" },
  "free t3":               { min: 2.3,  max: 4.2,  label: "Normal" },
  "free t4":               { min: 0.8,  max: 1.8,  label: "Normal" },
  "t3":                    { min: 2.3,  max: 4.2,  label: "Normal (free)" },
  "t4":                    { min: 0.8,  max: 1.8,  label: "Normal (free)" },
  "total t3":              { min: 80,   max: 200,  label: "Normal" },
  "total t4":              { min: 5.0,  max: 12.0, label: "Normal" },
  "thyroglobulin":         { min: 0,    max: 55,   label: "Normal" },
  "thyroglobulin antibody":{ min: 0,    max: 1,    label: "Normal" },
  "tpo antibodies":        { min: 0,    max: 35,   label: "Normal" },

  // ── Hormones ─────────────────────────────────────────────
  "testosterone":       { min: 300,  max: 1000, label: "Normal (male)" },
  "free testosterone":  { min: 9,    max: 30,   label: "Normal (male)" },
  "estradiol":          { min: 10,   max: 40,   label: "Normal (male)" },
  "shbg":               { min: 10,   max: 80,   label: "Normal" },
  "dheas":              { min: 80,   max: 560,  label: "Normal" },
  "dhea s":             { min: 80,   max: 560,  label: "Normal" },
  "prolactin":          { min: 2,    max: 18,   label: "Normal (male)" },
  "cortisol":           { min: 6,    max: 23,   label: "Normal (AM)" },
  "fsh":                { min: 1.5,  max: 12.4, label: "Normal (male)" },
  "lh":                 { min: 1.7,  max: 8.6,  label: "Normal (male)" },
  "igf 1":              { min: 115,  max: 307,  label: "Normal" },
  "igf-1":              { min: 115,  max: 307,  label: "Normal" },

  // ── Vitamins / Minerals ──────────────────────────────────
  "vitamin d":          { min: 30,  max: 100,  label: "Sufficient", unit: "ng/mL" },
  "vitamin d (25-oh)":  { min: 30,  max: 100,  label: "Sufficient", unit: "ng/mL" },
  "vitamin d 25 oh":    { min: 30,  max: 100,  label: "Sufficient", unit: "ng/mL" },
  "b12":                { min: 200, max: 900,  label: "Normal",     unit: "pg/mL" },
  "vitamin b12":        { min: 200, max: 900,  label: "Normal",     unit: "pg/mL" },
  "folate":             { min: 2.7, max: 17.0, label: "Normal",     unit: "ng/mL" },
  "folic acid":         { min: 2.7, max: 17.0, label: "Normal",     unit: "ng/mL" },
  "ferritin":           { min: 12,  max: 300,  label: "Normal",     unit: "ng/mL" },
  "iron":               { min: 60,  max: 170,  label: "Normal",     unit: "ug/dL" },
  "zinc":               { min: 70,  max: 120,  label: "Normal",     unit: "ug/dL" },

  // ── Coagulation ──────────────────────────────────────────
  "inr":          { min: 0.8, max: 1.2,  label: "Normal" },
  "pt":           { min: 11,  max: 13.5, label: "Normal" },
  "ptt":          { min: 25,  max: 35,   label: "Normal" },

  // ── Inflammation / Other ─────────────────────────────────
  "crp":          { min: 0,   max: 1.0,  label: "Normal" },
  "hs crp":       { min: 0,   max: 3.0,  label: "Normal" },
  "esr":          { min: 0,   max: 15,   label: "Normal (male)" },
  "homocysteine": { min: 5,   max: 15,   label: "Normal" },
  "psa":          { min: 0,   max: 4.0,  label: "Normal" },

  // ── Extra aliases ─────────────────────────────────────────
  "spo2":                     { min: 95,  max: 100, label: "Normal" },
  "oxygen saturation":        { min: 95,  max: 100, label: "Normal" },
  "blood sugar post meal":    { min: 70,  max: 140, label: "Normal (2hr)" },
  "blood sugar postmeal":     { min: 70,  max: 140, label: "Normal (2hr)" },
  "blood sugar (post meal)":  { min: 70,  max: 140, label: "Normal (2hr)" },
  "postprandial glucose":     { min: 70,  max: 140, label: "Normal (2hr)" },
  "fasting glucose":          { min: 70,  max: 100, label: "Normal" },
  "fasting blood sugar":      { min: 70,  max: 100, label: "Normal" },
  "ldl cholesterol":          { min: 0,   max: 100, label: "Optimal" },
  "hdl cholesterol":          { min: 40,  max: 80,  label: "Normal" },
  "total t3 (pg ml)":         { min: 2.3, max: 4.2, label: "Normal" },
};

function getReferenceRange(type: string): ReferenceRange | undefined {
  return REFERENCE_RANGES[normalizeType(type)];
}

type ValueStatus = "normal" | "borderline" | "abnormal";

// Returns null when the metric's unit doesn't match the reference range's expected unit
function getValueStatus(value: number, metricUnit: string, refRange: ReferenceRange): ValueStatus | null {
  if (refRange.unit && normalizeUnit(metricUnit) !== normalizeUnit(refRange.unit)) return null;
  if (value >= refRange.min && value <= refRange.max) return "normal";
  const span = refRange.max - refRange.min;
  const buffer = span > 0 ? span * 0.2 : refRange.max * 0.2 || 1;
  if (value >= refRange.min - buffer && value <= refRange.max + buffer) return "borderline";
  return "abnormal";
}

const BADGE_STYLES: Record<ValueStatus, string> = {
  normal:     "text-emerald-600 bg-emerald-50",
  borderline: "text-amber-600 bg-amber-50",
  abnormal:   "text-red-600 bg-red-50",
};
// Used when units don't match — show the range as info only, no coloring
const BADGE_NEUTRAL = "text-gray-500 bg-gray-100";

const VALUE_STYLES: Record<ValueStatus, string> = {
  normal:     "text-gray-900",
  borderline: "text-amber-600",
  abnormal:   "text-red-600",
};

function getYDomain(
  values: number[],
  refRange?: ReferenceRange
): [number, number] {
  const allValues = refRange
    ? [...values, refRange.min, refRange.max]
    : values;
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin;
  const padding = range > 0 ? range * 0.15 : Math.abs(dataMax) * 0.1 || 1;
  return [dataMin - padding, dataMax + padding];
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

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    fetch(`/api/health-metrics?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setMetrics(Array.isArray(data) ? data : []))
      .catch(() => setMetrics([]))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  // Collect unique metricTypes from ALL metrics for the dropdown
  const filterTypes = useMemo(() => {
    const presentTypes = Array.from(new Set(metrics.map((m) => m.metricType)));
    return Array.from(
      new Set([
        ...COMMON_METRIC_TYPES.filter((t) => presentTypes.includes(t)),
        ...presentTypes.filter((t) => !COMMON_METRIC_TYPES.includes(t as never)),
      ])
    );
  }, [metrics]);

  // Apply active type filter client-side
  const displayedMetrics = useMemo(
    () => (activeType ? metrics.filter((m) => m.metricType === activeType) : metrics),
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
      if (!map.has(m.metricType)) map.set(m.metricType, []);
      map.get(m.metricType)!.push(m);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
    }
    return map;
  }, [filteredForChart]);

  // Group displayed metrics for table view
  const groupedMetrics = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, HealthMetric[]>();
    for (const m of displayedMetrics) {
      const key =
        groupBy === "year"
          ? new Date(m.measuredAt).getFullYear().toString()
          : m.metricType;
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
            }));
            const refRange = getReferenceRange(type);
            const values = chartData.map((d) => d.value);
            const yDomain = getYDomain(values, refRange);
            return (
              <div key={type} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {formatMetricLabel(type)}
                    <span className="ml-2 font-normal text-gray-400 text-xs">({unit})</span>
                  </h3>
                  {refRange && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {refRange.label ?? "Normal"}: {refRange.min}–{refRange.max}
                    </span>
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
                    {refRange && (
                      <ReferenceArea
                        y1={refRange.min}
                        y2={refRange.max}
                        fill="#10b981"
                        fillOpacity={0.08}
                        strokeOpacity={0}
                      />
                    )}
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
      ) : groupedMetrics ? (
        /* Grouped table view */
        <div className="space-y-3">
          {groupedMetrics.map(([groupKey, groupItems]) => {
            const isExpanded = expandedGroups.has(groupKey);
            const latest = groupItems[0];
            const rest = groupItems.slice(1);
            const refRange = groupBy === "type" ? getReferenceRange(groupKey) : undefined;
            const label = groupBy === "type" ? formatMetricLabel(groupKey) : groupKey;

            const latestStatus = refRange ? getValueStatus(latest.value, latest.unit, refRange) : null;
            const ageLabel = getReadingAgeLabel(latest.measuredAt);

            return (
              <div key={groupKey} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                {/* Group header */}
                <div
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer select-none"
                  onClick={() => toggleGroup(groupKey)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-semibold text-gray-800 text-sm truncate">{label}</span>
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
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                {formatMetricLabel(m.metricType)}
                              </span>
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
            );
          })}
        </div>
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
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {formatMetricLabel(m.metricType)}
                    </span>
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
