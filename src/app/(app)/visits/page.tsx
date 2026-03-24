"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { VisitCard, type Visit } from "@/components/visits/VisitCard";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";
import { CardSkeleton } from "@/components/ui/Skeleton";

const STATUS_TABS: Array<{ label: string; value: VisitStatus | "ALL" }> = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const VISIT_TYPES: VisitType[] = ["ROUTINE", "LAB", "SPECIALIST", "URGENT", "TELEHEALTH", "PROCEDURE", "OTHER"];
const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  ROUTINE: "Routine", LAB: "Lab", SPECIALIST: "Specialist", URGENT: "Urgent",
  TELEHEALTH: "Telehealth", PROCEDURE: "Procedure", OTHER: "Other",
};

type GroupBy = "none" | "year" | "doctor" | "facility" | "specialty" | "type";
const GROUP_BY_OPTIONS: Array<{ label: string; value: GroupBy }> = [
  { label: "Provider (Doctor)", value: "doctor" },
  { label: "None", value: "none" },
  { label: "Year", value: "year" },
  { label: "Provider (Facility)", value: "facility" },
  { label: "Office / Specialty", value: "specialty" },
  { label: "Visit Type", value: "type" },
];

export default function VisitsPage() {
  const { activeProfileId } = useProfile();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<VisitStatus | "ALL">("ALL");

  // Filter state
  const [filterFacilityId, setFilterFacilityId] = useState("");
  const [filterDoctorId, setFilterDoctorId] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterType, setFilterType] = useState<VisitType | "">("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [dateSort, setDateSort] = useState<"asc" | "desc" | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("doctor");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchVisits = useCallback(async () => {
    if (!activeProfileId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/visits?profileId=${activeProfileId}`);
      if (res.ok) setVisits(await res.json());
    } finally {
      setLoading(false);
    }
  }, [activeProfileId]);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Select a profile to view visits.
      </div>
    );
  }

  // Build unique facility/doctor lists from loaded visits
  const { facilities, doctors, specialties } = useMemo(() => {
    const facilityMap = new Map<string, string>();
    const doctorMap = new Map<string, string>();
    const specialtySet = new Set<string>();
    for (const v of visits) {
      if (v.facility) facilityMap.set(v.facility.id, v.facility.name);
      if (v.doctor) doctorMap.set(v.doctor.id, v.doctor.name);
      if (v.specialty) specialtySet.add(v.specialty);
    }
    return {
      facilities: Array.from(facilityMap.entries()).sort((a, b) => a[1].localeCompare(b[1])),
      doctors: Array.from(doctorMap.entries()).sort((a, b) => a[1].localeCompare(b[1])),
      specialties: Array.from(specialtySet).sort(),
    };
  }, [visits]);

  // Apply all filters
  const filtered = useMemo(() => {
    let result = visits;
    if (activeTab !== "ALL") result = result.filter((v) => v.status === activeTab);
    if (filterFacilityId) result = result.filter((v) => v.facility?.id === filterFacilityId);
    if (filterDoctorId) result = result.filter((v) => v.doctor?.id === filterDoctorId);
    if (filterSpecialty) result = result.filter((v) =>
      (v.specialty ?? "").toLowerCase().includes(filterSpecialty.toLowerCase())
    );
    if (filterType) result = result.filter((v) => v.type === filterType);
    if (filterDateFrom) result = result.filter((v) => v.date && v.date >= filterDateFrom);
    if (filterDateTo) result = result.filter((v) => v.date && v.date <= filterDateTo + "T23:59:59");
    return result;
  }, [visits, activeTab, filterFacilityId, filterDoctorId, filterSpecialty, filterType, filterDateFrom, filterDateTo]);

  const hasFilters = !!(filterFacilityId || filterDoctorId || filterSpecialty || filterType || filterDateFrom || filterDateTo);

  function clearFilters() {
    setFilterFacilityId("");
    setFilterDoctorId("");
    setFilterSpecialty("");
    setFilterType("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  function sortByDate(list: Visit[]): Visit[] {
    const now = Date.now();
    const sorted = [...list];
    if (dateSort === "asc") {
      sorted.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    } else if (dateSort === "desc") {
      sorted.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } else {
      sorted.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        const aFuture = aTime >= now;
        const bFuture = bTime >= now;
        if (aFuture !== bFuture) return aFuture ? -1 : 1;
        if (aFuture) return aTime - bTime;
        return bTime - aTime;
      });
    }
    return sorted;
  }

  const { needsScheduling, scheduled } = useMemo(() => {
    return {
      needsScheduling: filtered.filter(
        (v) => !v.date && (v.status === "PENDING" || v.status === "SCHEDULED")
      ),
      scheduled: sortByDate(filtered.filter((v) => !!v.date)),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, dateSort]);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groupedVisits = useMemo(() => {
    if (groupBy === "none") return null;

    function getKey(v: Visit): string {
      switch (groupBy) {
        case "doctor": return v.doctor?.name ?? "No Doctor";
        case "facility": return v.facility?.name ?? "No Facility";
        case "specialty": return v.specialty || "No Specialty";
        case "type": return VISIT_TYPE_LABELS[v.type];
        case "year": return v.date ? new Date(v.date).getFullYear().toString() : "Unscheduled";
        default: return "";
      }
    }

    const map = new Map<string, Visit[]>();
    for (const v of filtered) {
      const key = getKey(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }

    // Within each group: most recent dated visit first, undated last
    for (const [, group] of map) {
      group.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }

    // Sort groups by their most recent dated visit, groups with no dates last
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const aDate = a.find((v) => v.date)?.date;
      const bDate = b.find((v) => v.date)?.date;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [filtered, groupBy]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visits & Appointments</h1>
        <Link
          href="/visits/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Visit
        </Link>
      </div>

      {/* Status filter tabs + Group By */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.value
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pb-1">
          <label className="text-xs text-gray-500 whitespace-nowrap">Group by</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced filters */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Facility</label>
            <select
              value={filterFacilityId}
              onChange={(e) => setFilterFacilityId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All</option>
              {facilities.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Doctor</label>
            <select
              value={filterDoctorId}
              onChange={(e) => setFilterDoctorId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All</option>
              {doctors.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Visit type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as VisitType | "")}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All</option>
              {VISIT_TYPES.map((t) => (
                <option key={t} value={t}>{VISIT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Office / Specialty</label>
            <input
              type="text"
              list="visit-specialty-suggestions"
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              placeholder="e.g. Urology"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <datalist id="visit-specialty-suggestions">
              {specialties.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date from</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date to</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 underline hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <>
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500">No visits found.</p>
          )}

          {groupedVisits ? (
            <>
              {groupedVisits.map(([groupName, groupVisits]) => {
                const isExpanded = expandedGroups.has(groupName);
                const lastVisit = groupVisits[0];
                const rest = groupVisits.slice(1);
                return (
                  <section key={groupName} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                        {groupName}
                      </h2>
                      {rest.length > 0 && (
                        <button
                          onClick={() => toggleGroup(groupName)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {isExpanded ? "Show less" : `+${rest.length} more`}
                          <span className="text-sm">{isExpanded ? "▴" : "▾"}</span>
                        </button>
                      )}
                    </div>
                    <VisitCard visit={lastVisit} />
                    {isExpanded && rest.map((v) => (
                      <VisitCard key={v.id} visit={v} />
                    ))}
                  </section>
                );
              })}
            </>
          ) : (
            <>
              {needsScheduling.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                    Needs Scheduling ({needsScheduling.length})
                  </h2>
                  <div className="space-y-3">
                    {needsScheduling.map((v) => (
                      <VisitCard key={v.id} visit={v} />
                    ))}
                  </div>
                </section>
              )}

              {scheduled.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    {needsScheduling.length > 0 ? (
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                        Scheduled
                      </h2>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={() =>
                        setDateSort((prev) =>
                          prev === null ? "asc" : prev === "asc" ? "desc" : null
                        )
                      }
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                        dateSort ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Date
                      <span className="text-base leading-none">
                        {dateSort === "asc" ? "↑" : dateSort === "desc" ? "↓" : "⇅"}
                      </span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {scheduled.map((v) => (
                      <VisitCard key={v.id} visit={v} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
