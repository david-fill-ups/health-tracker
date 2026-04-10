export interface ReferenceZone {
  min: number;
  max: number;
  label: string;
  color: string;
}

export interface ReferenceRange {
  min: number;
  max: number;
  label?: string;
  unit?: string; // if set, status coloring is skipped when stored unit doesn't match
  zones?: ReferenceZone[];
}

export type ValueStatus = "normal" | "borderline" | "abnormal";

// Normalize metric type string for lookup: lowercase, underscores → spaces, collapse whitespace
export function normalizeType(type: string): string {
  return type.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

// Normalize unit string for comparison: lowercase, no whitespace, µ/μ → u
export function normalizeUnit(u: string): string {
  return u
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[µμ]/g, "u")
    .replace(/×10[e^]?3/gi, "k")
    .replace(/x10e3/gi, "k");
}

export const REFERENCE_RANGES: Record<string, ReferenceRange> = {
  // ── Vitals ───────────────────────────────────────────────
  "blood pressure systolic":  { min: 90,   max: 120,  label: "Normal" },
  "blood pressure diastolic": { min: 60,   max: 80,   label: "Normal" },
  "blood sugar (fasting)":    { min: 70,   max: 100,  label: "Normal" },
  "blood sugar fasting":      { min: 70,   max: 100,  label: "Normal" },
  "blood sugar (post-meal)":  { min: 70,   max: 140,  label: "Normal (2hr)" },
  "heart rate":               { min: 60,   max: 100,  label: "Normal resting" },
  "blood oxygen (spo2)":      { min: 95,   max: 100,  label: "Normal" },
  "bmi": {
    min: 18.5, max: 24.9, label: "Normal",
    zones: [
      { min: 10,   max: 18.5, label: "Underweight", color: "#3b82f6" },
      { min: 18.5, max: 24.9, label: "Normal",      color: "#10b981" },
      { min: 24.9, max: 29.9, label: "Overweight",  color: "#f59e0b" },
      { min: 29.9, max: 50,   label: "Obese",       color: "#ef4444" },
    ],
  },

  // ── CBC (absolute counts) ─────────────────────────────────
  "wbc":         { min: 4.5,  max: 11.0, label: "Normal",       unit: "k/ul" },
  "rbc":         { min: 4.5,  max: 5.9,  label: "Normal (male)" },
  "hemoglobin":  { min: 13.5, max: 17.5, label: "Normal (male)", unit: "g/dl" },
  "hematocrit":  { min: 41,   max: 53,   label: "Normal (male)", unit: "%" },
  "mcv":         { min: 80,   max: 100,  label: "Normal" },
  "mch":         { min: 27,   max: 33,   label: "Normal" },
  "mchc":        { min: 32,   max: 36,   label: "Normal" },
  "platelets":   { min: 150,  max: 400,  label: "Normal",        unit: "k/ul" },
  "neutrophils": { min: 1.8,  max: 7.7,  label: "Normal",        unit: "k/ul" },
  "lymphocytes": { min: 1.0,  max: 4.8,  label: "Normal",        unit: "k/ul" },
  "monocytes":   { min: 0.2,  max: 0.95, label: "Normal",        unit: "k/ul" },
  "eosinophils": { min: 0.0,  max: 0.5,  label: "Normal",        unit: "k/ul" },
  "basophils":   { min: 0.0,  max: 0.1,  label: "Normal",        unit: "k/ul" },

  // ── CBC differentials (percentage) ────────────────────────
  "neutrophils (%)": { min: 40, max: 75, label: "Normal", unit: "%" },
  "lymphocytes (%)": { min: 20, max: 45, label: "Normal", unit: "%" },
  "monocytes (%)":   { min: 2,  max: 10, label: "Normal", unit: "%" },
  "eosinophils (%)": { min: 1,  max: 6,  label: "Normal", unit: "%" },
  "basophils (%)":   { min: 0,  max: 1,  label: "Normal", unit: "%" },

  // ── CMP / Metabolic ──────────────────────────────────────
  "glucose":        { min: 70,  max: 100,  label: "Normal (fasting)", unit: "mg/dl" },
  "bun":            { min: 7,   max: 25,   label: "Normal",           unit: "mg/dl" },
  "creatinine":     { min: 0.7, max: 1.3,  label: "Normal",           unit: "mg/dl" },
  "egfr":           { min: 60,  max: 120,  label: "Normal" },
  "sodium":         { min: 136, max: 145,  label: "Normal",           unit: "mmol/l" },
  "potassium":      { min: 3.5, max: 5.1,  label: "Normal",           unit: "mmol/l" },
  "chloride":       { min: 98,  max: 106,  label: "Normal",           unit: "mmol/l" },
  "bicarbonate":    { min: 22,  max: 29,   label: "Normal",           unit: "mmol/l" },
  "calcium":        { min: 8.5, max: 10.5, label: "Normal",           unit: "mg/dl" },
  "albumin":        { min: 3.5, max: 5.0,  label: "Normal",           unit: "g/dl" },
  "total protein":  { min: 6.3, max: 8.2,  label: "Normal",           unit: "g/dl" },
  "bilirubin total":{ min: 0.1, max: 1.2,  label: "Normal",           unit: "mg/dl" },
  "alp":            { min: 44,  max: 147,  label: "Normal",           unit: "iu/l" },
  "alt":            { min: 7,   max: 40,   label: "Normal",           unit: "iu/l" },
  "ast":            { min: 10,  max: 40,   label: "Normal",           unit: "iu/l" },
  "ggt":            { min: 8,   max: 61,   label: "Normal",           unit: "iu/l" },
  "uric acid":      { min: 3.4, max: 7.0,  label: "Normal (male)",    unit: "mg/dl" },
  "phosphorus":     { min: 2.5, max: 4.5,  label: "Normal",           unit: "mg/dl" },
  "magnesium":      { min: 1.7, max: 2.2,  label: "Normal",           unit: "mg/dl" },

  // ── Lipids ───────────────────────────────────────────────
  "total cholesterol": { min: 0,   max: 200, label: "Desirable", unit: "mg/dl" },
  "ldl":               { min: 0,   max: 100, label: "Optimal",   unit: "mg/dl" },
  "hdl":               { min: 40,  max: 80,  label: "Normal",    unit: "mg/dl" },
  "triglycerides":     { min: 0,   max: 150, label: "Normal",    unit: "mg/dl" },
  "vldl":              { min: 2,   max: 30,  label: "Normal",    unit: "mg/dl" },

  // ── Diabetes ─────────────────────────────────────────────
  "hemoglobin a1c": { min: 4.0, max: 5.6, label: "Normal" },
  "a1c":            { min: 4.0, max: 5.6, label: "Normal" },
  "insulin":        { min: 2.6, max: 24.9, label: "Fasting" },

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
  "vitamin d":          { min: 30,  max: 100,  label: "Sufficient", unit: "ng/ml" },
  "vitamin d (25-oh)":  { min: 30,  max: 100,  label: "Sufficient", unit: "ng/ml" },
  "vitamin d 25 oh":    { min: 30,  max: 100,  label: "Sufficient", unit: "ng/ml" },
  "b12":                { min: 200, max: 900,  label: "Normal",     unit: "pg/ml" },
  "vitamin b12":        { min: 200, max: 900,  label: "Normal",     unit: "pg/ml" },
  "folate":             { min: 2.7, max: 17.0, label: "Normal",     unit: "ng/ml" },
  "folic acid":         { min: 2.7, max: 17.0, label: "Normal",     unit: "ng/ml" },
  "ferritin":           { min: 12,  max: 300,  label: "Normal",     unit: "ng/ml" },
  "iron":               { min: 60,  max: 170,  label: "Normal",     unit: "ug/dl" },
  "zinc":               { min: 70,  max: 120,  label: "Normal",     unit: "ug/dl" },

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

export function getReferenceRange(type: string, unit?: string): ReferenceRange | undefined {
  const key = normalizeType(type);
  if (unit && normalizeUnit(unit) === "%") {
    const pctKey = `${key} (%)`;
    if (REFERENCE_RANGES[pctKey]) return REFERENCE_RANGES[pctKey];
  }
  return REFERENCE_RANGES[key];
}

export function getValueStatus(value: number, metricUnit: string, refRange: ReferenceRange): ValueStatus | null {
  if (refRange.unit && normalizeUnit(metricUnit) !== normalizeUnit(refRange.unit)) return null;
  if (value >= refRange.min && value <= refRange.max) return "normal";
  const span = refRange.max - refRange.min;
  const buffer = span > 0 ? span * 0.2 : refRange.max * 0.2 || 1;
  if (value >= refRange.min - buffer && value <= refRange.max + buffer) return "borderline";
  return "abnormal";
}

export const BADGE_STYLES: Record<ValueStatus, string> = {
  normal:     "text-emerald-600 bg-emerald-50",
  borderline: "text-amber-600 bg-amber-50",
  abnormal:   "text-red-600 bg-red-50",
};

export const VALUE_STYLES: Record<ValueStatus, string> = {
  normal:     "text-gray-900",
  borderline: "text-amber-600",
  abnormal:   "text-red-600",
};
