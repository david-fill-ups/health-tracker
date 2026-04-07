import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NpiSearchSchema } from "@/lib/validation";
import { shapeResult, parseNameQuery } from "@/lib/npi";

const NPI_BASE = "https://npiregistry.cms.hhs.gov/api/?version=2.1";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = NpiSearchSchema.safeParse({
    q: searchParams.get("q"),
    type: searchParams.get("type") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { q, type, city, limit } = parsed.data;
  const npiParams = new URLSearchParams({ limit: String(limit) });

  if (/^\d{10}$/.test(q)) {
    // Direct NPI number lookup — no name/city needed
    npiParams.set("number", q);
  } else if (type === "individual") {
    const [last, first] = parseNameQuery(q);
    npiParams.set("enumeration_type", "NPI-1");
    npiParams.set("name_last", last);
    if (first) npiParams.set("name_first", first);
    if (city) npiParams.set("city", city);
  } else if (type === "organization") {
    npiParams.set("enumeration_type", "NPI-2");
    npiParams.set("organization_name", q);
    if (city) npiParams.set("city", city);
  } else {
    // No type: search as organization name by default
    npiParams.set("enumeration_type", "NPI-2");
    npiParams.set("organization_name", q);
    if (city) npiParams.set("city", city);
  }

  try {
    const res = await fetch(`${NPI_BASE}&${npiParams.toString()}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: "NPI registry unavailable" }, { status: 502 });
    }
    const json = await res.json();
    if (json.Errors?.length) {
      return NextResponse.json(
        { error: "Add a city to narrow provider searches" },
        { status: 400 }
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (json.results ?? []).map((r: any) => shapeResult(r));
    return NextResponse.json({ results, total: json.result_count ?? results.length });
  } catch {
    return NextResponse.json({ error: "Failed to contact NPI registry" }, { status: 502 });
  }
}
