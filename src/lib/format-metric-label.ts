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

// Convert a metric type string to a URL slug: "Blood Pressure Systolic" → "blood-pressure-systolic"
export function metricTypeToSlug(type: string): string {
  return type.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/ /g, "-");
}

// Convert a slug back to a normalized type for matching: "blood-pressure-systolic" → "blood pressure systolic"
export function slugToNormalizedType(slug: string): string {
  return slug.replace(/-/g, " ");
}

// Convert any metric type string (including snake_case) to a readable label
export function formatMetricLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => {
      const m = word.match(/^(\()(.+?)(\))$/);
      if (m) return `(${formatWord(m[2])})`;
      return formatWord(word);
    })
    .join(" ");
}
