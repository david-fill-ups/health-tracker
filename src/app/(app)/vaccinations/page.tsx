"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { VaccinationCard } from "@/components/vaccinations/VaccinationCard";
import type { VaccinationRecommendation } from "@/lib/cdc";

interface Vaccination {
  id: string;
  name: string;
  date: string;
  lotNumber: string | null;
  facility?: { name: string } | null;
}

const COMPLIANCE_BADGE: Record<string, { label: string; classes: string }> = {
  up_to_date: { label: "Up to date", classes: "bg-green-100 text-green-700" },
  due: { label: "Due", classes: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", classes: "bg-red-100 text-red-700" },
  not_applicable: { label: "N/A", classes: "bg-gray-100 text-gray-500" },
};

export default function VaccinationsPage() {
  const { activeProfileId } = useProfile();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [recommendations, setRecommendations] = useState<VaccinationRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
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
    return groups;
  }, [vaccinations]);

  // Build a lookup from vaccine name → recommendation status
  const recByName = useMemo(() => {
    const map = new Map<string, VaccinationRecommendation>();
    for (const r of recommendations) {
      map.set(r.vaccine.toLowerCase(), r);
    }
    return map;
  }, [recommendations]);

  function getComplianceBadge(groupName: string) {
    const rec = recByName.get(groupName.toLowerCase());
    if (!rec || rec.status === "not_applicable") return null;
    return COMPLIANCE_BADGE[rec.status] ?? null;
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

      {loading && <CardSkeleton count={3} />}

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
                    <button
                      onClick={() => toggleGroup(name)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{name}</span>
                        {badge && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
                            {badge.label}
                          </span>
                        )}
                      </span>
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
      )}
    </div>
  );
}
