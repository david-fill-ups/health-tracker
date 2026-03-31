import { shapeResult, parseNameQuery, taxonomyToFacilityType } from "@/lib/npi";
import type { WebExtractedEntities } from "./types";

const NPI_BASE = "https://npiregistry.cms.hhs.gov/api/?version=2.1";
const NPI_TIMEOUT_MS = 5000;

async function fetchNpi(params: URLSearchParams): Promise<unknown[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NPI_TIMEOUT_MS);
    const res = await fetch(`${NPI_BASE}&${params.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const json = await res.json();
    return json.results ?? [];
  } catch {
    return [];
  }
}

/**
 * Enrich extracted facilities and doctors with NPI data (NPI number, phone, address, website).
 * Mutates the entities in-place and returns them.
 * Failures are silently swallowed — enrichment is best-effort.
 */
export async function enrichWithNpi(extracted: WebExtractedEntities): Promise<WebExtractedEntities> {
  await Promise.all([
    ...extracted.facilities.map(async (f) => {
      if (f.npiNumber) return; // already have NPI
      const params = new URLSearchParams({
        enumeration_type: "NPI-2",
        organization_name: f.name,
        limit: "1",
      });
      const results = await fetchNpi(params);
      if (results.length === 0) return;
      const shaped = shapeResult(results[0]);
      if (shaped.type !== "organization") return;

      if (!f.npiNumber) f.npiNumber = shaped.npiNumber;
      if (!f.phone && shaped.phone) f.phone = shaped.phone;
      if (!f.address && shaped.address) {
        const a = shaped.address;
        f.address = [a.address1, a.address2, a.city, a.state, a.zip].filter(Boolean).join(", ");
      }
      // Infer facility type from taxonomy if not already set
      if (!f.type && shaped.specialty) {
        f.type = taxonomyToFacilityType(shaped.specialty);
      }
    }),

    ...extracted.doctors.map(async (d) => {
      if (d.npiNumber) return; // already have NPI
      const [last, first] = parseNameQuery(d.name);
      const params = new URLSearchParams({
        enumeration_type: "NPI-1",
        name_last: last,
        limit: "1",
      });
      if (first) params.set("name_first", first);

      const results = await fetchNpi(params);
      if (results.length === 0) return;
      const shaped = shapeResult(results[0]);
      if (shaped.type !== "individual") return;

      if (!d.npiNumber) d.npiNumber = shaped.npiNumber;
      if (!d.phone && shaped.phone) d.phone = shaped.phone;
      if (!d.credential && shaped.credential) d.credential = shaped.credential;
      if (!d.specialty && shaped.specialty) d.specialty = shaped.specialty;
    }),
  ]);

  return extracted;
}
