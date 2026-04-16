export type FacilityCategory = "providers" | "diagnostics" | "pharmacy";

const DIAGNOSTICS_TYPES = new Set(["Lab", "Imaging"]);
const PHARMACY_TYPES = new Set(["Pharmacy", "Supplier"]);

export function getFacilityCategory(type: string): FacilityCategory {
  if (DIAGNOSTICS_TYPES.has(type)) return "diagnostics";
  if (PHARMACY_TYPES.has(type)) return "pharmacy";
  return "providers";
}

export const CATEGORY_META: Record<FacilityCategory, { label: string; description: string }> = {
  providers: {
    label: "Care Providers",
    description: "Clinics, hospitals, and practices you see regularly",
  },
  diagnostics: {
    label: "Diagnostics",
    description: "Labs and imaging centers used as directed",
  },
  pharmacy: {
    label: "Pharmacy & Supplies",
    description: "Pharmacies and medical suppliers",
  },
};
