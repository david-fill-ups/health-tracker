"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import {
  VisitCard, type Visit,
  VISIT_TYPE_LABELS, STATUS_STYLES, STATUS_LABELS,
  formatDate, formatDueMonth,
} from "@/components/visits/VisitCard";
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

type GroupBy = "none" | "year" | "doctor" | "facility" | "specialty" | "type";
const GROUP_BY_OPTIONS: Array<{ label: string; value: GroupBy }> = [
  { label: "None", value: "none" },
  { label: "Provider (Doctor)", value: "doctor" },
  { label: "Provider (Facility)", value: "facility" },
  { label: "Office / Specialty", value: "specialty" },
  { label: "Visit Type", value: "type" },
  { label: "Year", value: "year" },
];

export default function VisitsPage() {
  const { activeProfileId } = useProfile();
  const router = useRouter();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<VisitStatus | "ALL">("ALL");

  // Filter state
  const [filterSearch, setFilterSearch] = useState("");
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
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      result = result.filter((v) =>
        (v.doctor?.name ?? "").toLowerCase().includes(q) ||
        (v.facility?.name ?? "").toLowerCase().includes(q) ||
        VISIT_TYPE_LABELS[v.type].toLowerCase().includes(q) ||
        (v.specialty ?? "").toLowerCase().includes(q) ||
        (v.reason ?? "").toLowerCase().includes(q) ||
        (v.notes ?? "").toLowerCase().includes(q) ||
        (v.location?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (filterFacilityId) result = result.filter((v) => v.facility?.id === filterFacilityId);
    if (filterDoctorId) result = result.filter((v) => v.doctor?.id === filterDoctorId);
    if (filterSpecialty) result = result.filter((v) =>
      (v.specialty ?? "").toLowerCase().includes(filterSpecialty.toLowerCase())
    );
    if (filterType) result = result.filter((v) => v.type === filterType);
    if (filterDateFrom) result = result.filter((v) => v.date && v.date >= filterDateFrom);
    if (filterDateTo) result = result.filter((v) => v.date && v.date <= filterDateTo + "T23:59:59");
    return result;
  }, [visits, activeTab, filterSearch, filterFacilityId, filterDoctorId, filterSpecialty, filterType, filterDateFrom, filterDateTo]);

  const hasFilters = !!(filterSearch || filterFacilityId || filterDoctorId || filterSpecialty || filterType || filterDateFrom || filterDateTo);

  function clearFilters() {
    setFilterSearch("");
    setFilterFacilityId("");
    setFilterDoctorId("");
    setFilterSpecialty("");
    setFilterType("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  function effectiveDate(v: Visit): string | null {
    return v.date ?? (v.dueMonth ? `${v.dueMonth}-01` : null);
  }

  function sortByDate(list: Visit[]): Visit[] {
    const now = Date.now();
    const sorted = [...list];
    if (dateSort === "asc") {
      sorted.sort((a, b) => {
        const ad = effectiveDate(a), bd = effectiveDate(b);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return new Date(ad).getTime() - new Date(bd).getTime();
      });
    } else if (dateSort === "desc") {
      sorted.sort((a, b) => {
        const ad = effectiveDate(a), bd = effectiveDate(b);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return new Date(bd).getTime() - new Date(ad).getTime();
      });
    } else {
      sorted.sort((a, b) => {
        const ad = effectiveDate(a), bd = effectiveDate(b);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        const aTime = new Date(ad).getTime();
        const bTime = new Date(bd).getTime();
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
        (v) => !v.date && !v.dueMonth && (v.status === "PENDING" || v.status === "SCHEDULED")
      ),
      scheduled: sortByDate(filtered.filter((v) => !!v.date || !!v.dueMonth)),
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
        case "doctor": return v.doctor?.name ?? v.facility?.name ?? "Other";
        case "facility": return v.facility?.name ?? "No Facility";
        case "specialty": return v.specialty || "No Specialty";
        case "type": return VISIT_TYPE_LABELS[v.type];
        case "year": {
          const d = effectiveDate(v);
          return d ? new Date(d).getFullYear().toString() : "Unscheduled";
        }
        default: return "";
      }
    }

    const map = new Map<string, Visit[]>();
    for (const v of filtered) {
      const key = getKey(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }

    // Within each group: most recent visit first (dueMonth treated as 1st of month), undated last
    for (const [, group] of map) {
      group.sort((a, b) => {
        const ad = effectiveDate(a), bd = effectiveDate(b);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return new Date(bd).getTime() - new Date(ad).getTime();
      });
    }

    // Sort groups by their most recent visit, groups with no dates last
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const aDate = a.map(effectiveDate).find(Boolean);
      const bDate = b.map(effectiveDate).find(Boolean);
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [filtered, groupBy]);

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Select a profile to view visits.
      </div>
    );
  }

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
        <div>
          <input
            type="search"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Search doctor, facility, type, reason, notes…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
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

                // Year grouping: collapsible header only, no summary card
                if (groupBy === "year") {
                  return (
                    <section key={groupName} className="space-y-3">
                      <button
                        onClick={() => toggleGroup(groupName)}
                        className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-semibold text-gray-900">{groupName}</span>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{groupVisits.length} visit{groupVisits.length !== 1 ? "s" : ""}</span>
                          <span>{isExpanded ? "▴" : "▾"}</span>
                        </div>
                      </button>
                      {isExpanded && groupVisits.map((v) => (
                        <VisitCard key={v.id} visit={v} />
                      ))}
                    </section>
                  );
                }

                // Named-entity groups: summary card showing the last visit
                const lastVisit = groupVisits[0];
                const rest = groupVisits.slice(1);
                const isFacilityFallback = groupBy === "doctor" && !lastVisit.doctor && !!lastVisit.facility;
                const lastVisitDateLabel = lastVisit.date
                  ? formatDate(lastVisit.date)
                  : lastVisit.dueMonth
                  ? `Due ${formatDueMonth(lastVisit.dueMonth)}`
                  : "No date";

                return (
                  <section key={groupName} className="space-y-3">
                    <div
                      onClick={() => router.push(`/visits/${lastVisit.id}`)}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isFacilityFallback && (
                              <span className="text-xs font-medium text-indigo-500 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 shrink-0">Facility</span>
                            )}
                            <span className="font-semibold text-gray-900">{groupName}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-gray-500">Last Visit: {lastVisitDateLabel}</span>
                            {groupBy !== "type" && (
                              <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
                                {VISIT_TYPE_LABELS[lastVisit.type]}
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_STYLES[lastVisit.status]}`}>
                              {STATUS_LABELS[lastVisit.status]}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 text-sm text-gray-500">
                            {groupBy !== "doctor" && !isFacilityFallback && lastVisit.doctor && (
                              <span>{lastVisit.doctor.name}</span>
                            )}
                            {groupBy !== "facility" && !isFacilityFallback && lastVisit.facility && (
                              <span>{lastVisit.facility.name}</span>
                            )}
                            {groupBy !== "specialty" && lastVisit.specialty && (
                              <span>{lastVisit.specialty}</span>
                            )}
                          </div>
                        </div>
                        {rest.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleGroup(groupName); }}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5"
                          >
                            {isExpanded ? "Show less" : `+${rest.length} more`}
                            <span className="text-sm">{isExpanded ? "▴" : "▾"}</span>
                          </button>
                        )}
                      </div>
                    </div>
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
