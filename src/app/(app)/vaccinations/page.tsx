"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { VaccinationCard } from "@/components/vaccinations/VaccinationCard";
import { vaccineToSlug } from "@/lib/cdc";
import type { VaccinationRecommendation } from "@/lib/cdc";
import type { TravelCheckResult } from "@/lib/travel";

interface Vaccination {
  id: string;
  name: string;
  date: string;
  source?: "ADMINISTERED" | "NATURAL" | "DECLINED" | null;
  lotNumber: string | null;
  facility?: { name: string } | null;
}

const COMPLIANCE_BADGE: Record<string, { label: string; classes: string }> = {
  up_to_date: { label: "Up to date", classes: "bg-green-100 text-green-700" },
  due: { label: "Due", classes: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", classes: "bg-red-100 text-red-700" },
  not_applicable: { label: "N/A", classes: "bg-gray-100 text-gray-500" },
  completed: { label: "Completed", classes: "bg-blue-100 text-blue-700" },
  exempt: { label: "Declined", classes: "bg-gray-100 text-gray-500" },
};

export default function VaccinationsPage() {
  const { activeProfileId } = useProfile();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [recommendations, setRecommendations] = useState<VaccinationRecommendation[]>([]);
  const [cdcLastUpdated, setCdcLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const [travelOpen, setTravelOpen] = useState(false);
  const [travelQuery, setTravelQuery] = useState("");
  const [travelLoading, setTravelLoading] = useState(false);
  const [travelResult, setTravelResult] = useState<TravelCheckResult | null>(null);
  const [travelError, setTravelError] = useState<string | null>(null);

  function toggleGroup(name: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/vaccinations?profileId=${activeProfileId}`).then((r) => r.json()),
      fetch(`/api/vaccinations/recommendations?profileId=${activeProfileId}`).then((r) =>
        r.json()
      ),
    ])
      .then(([vaxData, recData]) => {
        setVaccinations(Array.isArray(vaxData) ? vaxData : []);
        setRecommendations(Array.isArray(recData?.recommendations) ? recData.recommendations : []);
        if (recData?.dataLastUpdated) setCdcLastUpdated(recData.dataLastUpdated);
      })
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  function handleDelete(id: string) {
    setVaccinations((prev) => prev.filter((v) => v.id !== id));
  }

  // Build a lookup from vaccine name/alias → recommendation status
  const recByName = useMemo(() => {
    const map = new Map<string, VaccinationRecommendation>();
    for (const r of recommendations) {
      const allNames = [r.vaccine, ...(r.aliases ?? [])].map((n) => n.toLowerCase());
      for (const name of allNames) map.set(name, r);
    }
    return map;
  }, [recommendations]);

  const STATUS_SORT_ORDER: Record<string, number> = {
    overdue: 0,
    due: 1,
    up_to_date: 2,
    not_applicable: 3,
    completed: 4,
    exempt: 5,
  };

  const vaccinationGroups = useMemo(() => {
    const sorted = [...vaccinations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const groups: Array<{ name: string; items: Vaccination[] }> = [];
    for (const v of sorted) {
      const group = groups.find((g) => g.name === v.name);
      if (group) group.items.push(v);
      else groups.push({ name: v.name, items: [v] });
    }
    return groups.sort((a, b) => {
      const aStatus = recByName.get(a.name.toLowerCase())?.status ?? "not_applicable";
      const bStatus = recByName.get(b.name.toLowerCase())?.status ?? "not_applicable";
      return (STATUS_SORT_ORDER[aStatus] ?? 3) - (STATUS_SORT_ORDER[bStatus] ?? 3);
    });
  }, [vaccinations, recByName]);

  // Vaccines the CDC schedule flags but the user has zero records for
  const unrecordedVaccines = useMemo(() => {
    const recordedNames = new Set(vaccinationGroups.map((g) => g.name.toLowerCase()));
    return recommendations.filter((r) => {
      if (r.status === "not_applicable" || r.status === "exempt") return false;
      const allNames = [r.vaccine, ...(r.aliases ?? [])].map((n) => n.toLowerCase());
      return !allNames.some((n) => recordedNames.has(n));
    });
  }, [recommendations, vaccinationGroups]);

  function getComplianceBadge(groupName: string) {
    const rec = recByName.get(groupName.toLowerCase());
    if (!rec || rec.status === "not_applicable") return null;
    return COMPLIANCE_BADGE[rec.status] ?? null;
  }

  async function checkTravel(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProfileId || !travelQuery.trim()) return;
    setTravelLoading(true);
    setTravelResult(null);
    setTravelError(null);
    try {
      const res = await fetch("/api/vaccinations/travel-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfileId, destination: travelQuery.trim() }),
      });
      if (res.status === 404) {
        setTravelError(`No data found for "${travelQuery}". Try the country name (e.g. "France", "Thailand").`);
      } else if (!res.ok) {
        setTravelError("Something went wrong. Please try again.");
      } else {
        setTravelResult(await res.json());
      }
    } finally {
      setTravelLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vaccinations</h1>
        <Link
          href="/vaccinations/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Record Vaccination
        </Link>
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view vaccinations.</p>
      )}

      {activeProfileId && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => { setTravelOpen((o) => !o); setTravelResult(null); setTravelError(null); }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50"
          >
            <span className="font-semibold text-gray-900">Traveling soon?</span>
            <span className="text-xs text-gray-400">{travelOpen ? "▲" : "▼"}</span>
          </button>
          {travelOpen && (
            <div className="border-t border-gray-100 px-5 py-4 space-y-4">
              <form onSubmit={checkTravel} className="flex gap-2">
                <input
                  type="text"
                  value={travelQuery}
                  onChange={(e) => setTravelQuery(e.target.value)}
                  placeholder="Enter destination (e.g. France, Tokyo, Kenya)"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={travelLoading || !travelQuery.trim()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {travelLoading ? "Checking…" : "Check"}
                </button>
              </form>

              {travelError && (
                <p className="text-sm text-red-600">{travelError}</p>
              )}

              {travelResult && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-700">
                    CDC recommendations for{" "}
                    <span className="text-indigo-600">{travelResult.destination}</span>
                  </p>

                  {travelResult.required.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Required for entry</p>
                      <ul className="space-y-1.5">
                        {travelResult.required.map((v) => (
                          <li key={v.name} className="flex items-center gap-2 text-sm">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.covered ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {v.covered ? "Covered" : "Not recorded"}
                            </span>
                            <span className="text-gray-800">{v.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {travelResult.recommended.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">CDC recommended</p>
                      <ul className="space-y-1.5">
                        {travelResult.recommended.map((v) => (
                          <li key={v.name} className="flex items-center gap-2 text-sm">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${v.covered ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {v.covered ? "Covered" : "Not recorded"}
                            </span>
                            <span className="text-gray-800">{v.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {travelResult.notes.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Additional advisories</p>
                      <ul className="space-y-1 list-disc list-inside">
                        {travelResult.notes.map((note, i) => (
                          <li key={i} className="text-sm text-gray-600">{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {travelResult.required.length === 0 && travelResult.recommended.length === 0 && (
                    <p className="text-sm text-gray-500">No specific vaccine requirements for this destination.</p>
                  )}

                  <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                    Based on CDC recommendations as of{" "}
                    {new Date(travelResult.dataLastUpdated + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.{" "}
                    For reference only — consult your doctor or a travel health clinic before travel.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && <CardSkeleton count={3} />}

      {activeProfileId && !loading && unrecordedVaccines.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">No Recorded History</h2>
          <div className="space-y-2">
            {unrecordedVaccines.map((r) => {
              const badge = COMPLIANCE_BADGE[r.status];
              return (
                <div key={r.vaccine} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 gap-4">
                    <span className="flex items-center gap-2">
                      <Link
                        href={`/vaccinations/${vaccineToSlug(r.vaccine)}`}
                        className="font-semibold text-gray-900 hover:text-indigo-600"
                      >
                        {r.vaccine}
                      </Link>
                      {badge && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                      )}
                    </span>
                    <Link
                      href={`/vaccinations/new?name=${encodeURIComponent(r.vaccine)}`}
                      className="text-xs text-indigo-600 hover:underline shrink-0"
                    >
                      Record
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeProfileId && !loading && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-700">Recorded Vaccinations</h2>
          {vaccinationGroups.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500 mb-3">No vaccinations recorded yet.</p>
              <Link
                href="/vaccinations/new"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + Record your first vaccination
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {vaccinationGroups.map(({ name, items }) => {
                const isOpen = openGroups.has(name);
                const badge = getComplianceBadge(name);
                return (
                  <div key={name} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                      <span className="flex items-center gap-2">
                        <Link
                          href={`/vaccinations/${vaccineToSlug(name)}`}
                          className="font-semibold text-gray-900 hover:text-indigo-600"
                        >
                          {name}
                        </Link>
                        {badge && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
                            {badge.label}
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => toggleGroup(name)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600"
                      >
                        {items.length} {items.length === 1 ? "dose" : "doses"}
                        <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
                      </button>
                    </div>
                    {isOpen && (
                      <div className="border-t border-gray-100 divide-y divide-gray-100">
                        {items.map((v) => (
                          <div key={v.id} className="flex items-center justify-between px-5 py-3 gap-4">
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700">
                                {new Date(v.date).toLocaleDateString()}
                                {v.facility ? ` · ${v.facility.name}` : ""}
                              </p>
                              {v.lotNumber && (
                                <p className="text-xs text-gray-400">Lot: {v.lotNumber}</p>
                              )}
                            </div>
                            <VaccinationCard
                              vaccination={v}
                              onDelete={handleDelete}
                              compact
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {cdcLastUpdated && (
            <p className="mt-3 text-xs text-gray-400">
              Compliance status based on CDC immunization schedule as of{" "}
              {new Date(cdcLastUpdated + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
              For reference only — consult your doctor.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
