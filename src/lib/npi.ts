import type { FACILITY_TYPE_SUGGESTIONS } from "./validation";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface NpiAddress {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

export type NpiResult =
  | {
      npiNumber: string;
      type: "individual";
      name: string;
      firstName: string;
      lastName: string;
      credential: string;
      specialty: string;
      phone: string;
      address: NpiAddress | null;
    }
  | {
      npiNumber: string;
      type: "organization";
      name: string;
      specialty: string;
      phone: string;
      address: NpiAddress | null;
    };

// ── Helpers ────────────────────────────────────────────────────────────────────

export function normalizeZip(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 5);
}

export function parseNameQuery(q: string): [string, string] {
  const trimmed = q.trim();
  if (trimmed.includes(",")) {
    const [last, first] = trimmed.split(",").map((s) => s.trim());
    return [last, first ?? ""];
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return [parts[parts.length - 1], parts[0]];
  return [trimmed, ""];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function shapeResult(r: any): NpiResult {
  const enumType: string = r.enumeration_type ?? "";
  const primaryTaxonomy =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r.taxonomies ?? []).find((t: any) => t.primary) ?? r.taxonomies?.[0];
  const locationAddr =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r.addresses ?? []).find((a: any) => a.address_purpose === "LOCATION") ??
    r.addresses?.[0];

  const address: NpiAddress | null = locationAddr
    ? {
        address1: locationAddr.address_1 ?? "",
        address2: locationAddr.address_2 ?? "",
        city: locationAddr.city ?? "",
        state: locationAddr.state ?? "",
        zip: normalizeZip(locationAddr.postal_code ?? ""),
      }
    : null;

  const phone: string = (locationAddr?.telephone_number ?? "").trim();
  const specialty: string = primaryTaxonomy?.desc ?? "";

  if (enumType === "NPI-1") {
    const b = r.basic ?? {};
    const nameParts = [b.first_name, b.middle_name, b.last_name].filter(Boolean);
    return {
      npiNumber: r.number,
      type: "individual",
      name: nameParts.join(" "),
      firstName: b.first_name ?? "",
      lastName: b.last_name ?? "",
      credential: b.credential ?? "",
      specialty,
      phone,
      address,
    };
  }

  return {
    npiNumber: r.number,
    type: "organization",
    name: r.basic?.organization_name ?? "",
    specialty,
    phone,
    address,
  };
}

// ── Taxonomy → Facility Type ───────────────────────────────────────────────────

type FacilityType = (typeof FACILITY_TYPE_SUGGESTIONS)[number];

const TAXONOMY_TYPE_MAP: Array<[string, FacilityType]> = [
  ["hospital", "Hospital"],
  ["acute care", "Hospital"],
  ["critical access", "Hospital"],
  ["psychiatric hospital", "Hospital"],
  ["dental", "Dental"],
  ["dentist", "Dental"],
  ["oral", "Dental"],
  ["laboratory", "Lab"],
  ["clinical lab", "Lab"],
  ["pathology", "Lab"],
  ["pharmacy", "Pharmacy"],
  ["pharmacist", "Pharmacy"],
  ["radiology", "Imaging"],
  ["imaging", "Imaging"],
  ["magnetic resonance", "Imaging"],
  ["nuclear medicine", "Imaging"],
  ["physical therapy", "Therapy"],
  ["occupational therapy", "Therapy"],
  ["speech", "Therapy"],
  ["behavioral health", "Therapy"],
  ["psychology", "Therapy"],
  ["mental health", "Therapy"],
  ["urgent care", "Urgent Care"],
  ["emergency", "Urgent Care"],
  ["supplier", "Supplier"],
  ["durable medical", "Supplier"],
  ["telehealth", "Virtual"],
  ["telemedicine", "Virtual"],
  ["clinic", "Clinic"],
  ["physician", "Clinic"],
  ["group practice", "Clinic"],
  ["family medicine", "Clinic"],
  ["internal medicine", "Clinic"],
];

export function taxonomyToFacilityType(taxonomyDesc: string): FacilityType {
  const lower = taxonomyDesc.toLowerCase();
  for (const [fragment, type] of TAXONOMY_TYPE_MAP) {
    if (lower.includes(fragment)) return type;
  }
  return "Other";
}
