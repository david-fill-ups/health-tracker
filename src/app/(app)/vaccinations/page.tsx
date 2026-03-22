"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { VaccinationCard } from "@/components/vaccinations/VaccinationCard";
import { CdcComplianceRow } from "@/components/vaccinations/CdcComplianceRow";
import type { VaccinationRecommendation, VaccinationStatus } from "@/lib/cdc";

interface Vaccination {
  id: string;
  name: string;
  date: string;
  lotNumber: string | null;
  facility?: { name: string } | null;
}

type ComplianceFilter = "all" | "due" | "overdue";

const FILTER_STATUSES: Record<ComplianceFilter, VaccinationStatus[]> = {
  all: ["up_to_date", "due", "overdue", "not_applicable"],
  due: ["due"],
  overdue: ["overdue"],
};

export default function VaccinationsPage() {
  const { activeProfileId } = useProfile();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [recommendations, setRecommendations] = useState<VaccinationRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ComplianceFilter>("all");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

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
        setRecommendations(Array.isArray(recData) ? recData : []);
      })
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  function handleDelete(id: string) {
    setVaccinations((prev) => prev.filter((v) => v.id !== id));
  }

  const sortedVaccinations = [...vaccinations].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Group vaccinations by name
  const vaccinationGroups: Array<{ name: string; items: Vaccination[] }> = [];
  for (const v of sortedVaccinations) {
    const group = vaccinationGroups.find((g) => g.name === v.name);
    if (group) group.items.push(v);
    else vaccinationGroups.push({ name: v.name, items: [v] });
  }

  const allowedStatuses = FILTER_STATUSES[filter];
  const filteredRecs = recommendations.filter((r) =>
    allowedStatuses.includes(r.status)
  );

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

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {activeProfileId && !loading && (
        <>
          {/* Recorded vaccinations */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-700">Recorded Vaccinations</h2>
            {vaccinationGroups.length === 0 ? (
              <p className="text-sm text-gray-500">No vaccinations recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {vaccinationGroups.map(({ name, items }) => {
                  const isOpen = openGroups.has(name);
                  return (
                    <div key={name} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <button
                        onClick={() => toggleGroup(name)}
                        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50"
                      >
                        <span className="font-semibold text-gray-900">{name}</span>
                        <span className="flex items-center gap-2 text-sm text-gray-400">
                          {items.length} {items.length === 1 ? "dose" : "doses"}
                          <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
                        </span>
                      </button>
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
          </section>

          {/* CDC compliance */}
          <section>
            <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-gray-700">CDC Schedule Compliance</h2>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                {(["all", "due", "overdue"] as ComplianceFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 font-medium capitalize ${
                      filter === f
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {f === "all" ? "All" : f === "due" ? "Due" : "Overdue"}
                  </button>
                ))}
              </div>
            </div>

            {filteredRecs.length === 0 ? (
              <p className="text-sm text-gray-500">
                {filter === "all"
                  ? "No CDC schedule data available for this age group."
                  : `No vaccines are currently ${filter}.`}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredRecs.map((rec) => (
                  <CdcComplianceRow key={rec.vaccine} recommendation={rec} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
