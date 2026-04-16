"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StarRating } from "@/components/ui/StarRating";
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

type GroupBy = "none" | "doctor" | "facility";
const GROUP_BY_OPTIONS: Array<{ label: string; value: GroupBy }> = [
  { label: "None", value: "none" },
  { label: "Provider (Doctor)", value: "doctor" },
  { label: "Provider (Facility)", value: "facility" },
];

function VisitsPageInner() {
  const { activeProfileId } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<VisitStatus | "ALL">(
    (searchParams.get("status") as VisitStatus | "ALL") ?? "ALL"
  );

  // Filter state — initialized from URL
  const [filterSearch, setFilterSearch] = useState(searchParams.get("search") ?? "");
  const [filterFacilityId, setFilterFacilityId] = useState(searchParams.get("facility") ?? "");
  const [filterDoctorId, setFilterDoctorId] = useState(searchParams.get("doctor") ?? "");
  const [filterSpecialty, setFilterSpecialty] = useState(searchParams.get("specialty") ?? "");
  const [filterType, setFilterType] = useState<VisitType | "">(
    (searchParams.get("type") as VisitType | "") ?? ""
  );
  const [filterDateFrom, setFilterDateFrom] = useState(searchParams.get("from") ?? "");
  const [filterDateTo, setFilterDateTo] = useState(searchParams.get("to") ?? "");
  const [groupBy, setGroupBy] = useState<GroupBy>(
    (searchParams.get("group") as GroupBy) ?? "doctor"
  );
  // Used to expand overflow past-visit pills in group mode
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Sync filter state to URL so back-navigation restores it
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "ALL") params.set("status", activeTab);
    if (filterSearch) params.set("search", filterSearch);
    if (filterFacilityId) params.set("facility", filterFacilityId);
    if (filterDoctorId) params.set("doctor", filterDoctorId);
    if (filterSpecialty) params.set("specialty", filterSpecialty);
    if (filterType) params.set("type", filterType);
    if (filterDateFrom) params.set("from", filterDateFrom);
    if (filterDateTo) params.set("to", filterDateTo);
    if (groupBy !== "doctor") params.set("group", groupBy);
    const query = params.toString();
    router.replace(`/visits${query ? `?${query}` : ""}`, { scroll: false });
  }, [activeTab, filterSearch, filterFacilityId, filterDoctorId, filterSpecialty, filterType, filterDateFrom, filterDateTo, groupBy]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const todayStr = new Date().toISOString().slice(0, 10);

  // Smart-sorted scheduled visits (have a date or dueMonth): upcoming first then newest past
  const { needsScheduling, scheduled } = useMemo(() => {
    const now = Date.now();
    const withDate = filtered.filter((v) => !!v.date || !!v.dueMonth);
    withDate.sort((a, b) => {
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
    return {
      needsScheduling: filtered.filter(
        (v) => !v.date && !v.dueMonth && (v.status === "PENDING" || v.status === "SCHEDULED")
      ),
      scheduled: withDate,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // "none" mode: split into upcoming/past, grouped by year
  const noneGroups = useMemo(() => {
    if (groupBy !== "none") return null;
    const upcoming = scheduled.filter(v => {
      const d = effectiveDate(v);
      return (v.status === "PENDING" || v.status === "SCHEDULED") && d && d >= todayStr;
    });
    const upcomingIds = new Set(upcoming.map(v => v.id));
    const past = scheduled.filter(v => !upcomingIds.has(v.id));

    function groupByYear(list: Visit[]): Array<[string, Visit[]]> {
      const map = new Map<string, Visit[]>();
      for (const v of list) {
        const d = effectiveDate(v);
        const year = d ? new Date(d).getUTCFullYear().toString() : "Undated";
        if (!map.has(year)) map.set(year, []);
        map.get(year)!.push(v);
      }
      return Array.from(map.entries());
    }

    return { upcoming: groupByYear(upcoming), past: groupByYear(past) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBy, scheduled]);

  // "doctor" / "facility" grouping
  const groupedVisits = useMemo(() => {
    if (groupBy === "none") return null;

    function getKey(v: Visit): string {
      switch (groupBy) {
        case "doctor": return v.doctor?.name ?? v.facility?.name ?? "Other";
        case "facility": return v.facility?.name ?? "No Facility";
        default: return "";
      }
    }

    const map = new Map<string, Visit[]>();
    for (const v of filtered) {
      const key = getKey(v);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }

    // Within each group: most recent first, undated last
    for (const [, group] of map) {
      group.sort((a, b) => {
        const ad = effectiveDate(a), bd = effectiveDate(b);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return new Date(bd).getTime() - new Date(ad).getTime();
      });
    }

    function nextUpcoming(vs: Visit[]): string | null {
      let result: string | null = null;
      for (const v of vs) {
        if (v.status !== "PENDING" && v.status !== "SCHEDULED") continue;
        const d = effectiveDate(v);
        if (d !== null && d < todayStr) continue;
        const val = d ?? "";
        if (result === null || val < result) result = val;
      }
      return result;
    }

    function mostRecentDate(vs: Visit[]): string | null {
      let result: string | null = null;
      for (const v of vs) {
        const d = effectiveDate(v);
        if (d && (result === null || d > result)) result = d;
      }
      return result;
    }

    // Sort groups: upcoming first (soonest), then by most recent visit
    const sorted = Array.from(map.entries()).sort(([, a], [, b]) => {
      const aNext = nextUpcoming(a);
      const bNext = nextUpcoming(b);
      if ((aNext !== null) !== (bNext !== null)) return aNext !== null ? -1 : 1;
      if (aNext !== null && bNext !== null) return aNext.localeCompare(bNext);
      const aLast = mostRecentDate(a);
      const bLast = mostRecentDate(b);
      if (!aLast && !bLast) return 0;
      if (!aLast) return 1;
      if (!bLast) return -1;
      return bLast.localeCompare(aLast);
    });

    // In doctor mode: hide facility-fallback groups unless they have an upcoming visit
    if (groupBy === "doctor") {
      return sorted.filter(([, vs]) => {
        const isFacilityFallback = vs.every((v) => !v.doctor);
        if (!isFacilityFallback) return true;
        return vs.some((v) => {
          const d = effectiveDate(v);
          return (v.status === "PENDING" || v.status === "SCHEDULED") && (!d || d >= todayStr);
        });
      });
    }

    return sorted;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, groupBy]);

  // Index of first group with no upcoming visits — used for the between-rows grid divider
  const groupDividerIdx = groupedVisits
    ? groupedVisits.findIndex(([, visits]) =>
        !visits.some(v => {
          const d = effectiveDate(v);
          return (v.status === "PENDING" || v.status === "SCHEDULED") && (!d || d >= todayStr);
        })
      )
    : -1;

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

          {/* Doctor / Facility grouped mode — grid of cards with visit pills inside */}
          {groupedVisits ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedVisits.flatMap(([groupName, groupVisits], groupIndex) => {
                const isExpanded = expandedGroups.has(groupName);
                const rep = groupVisits[0];
                const isFacilityFallback = groupBy === "doctor" && !rep.doctor && !!rep.facility;

                const doctorId = !isFacilityFallback && groupBy === "doctor" ? rep.doctor?.id ?? null : null;
                const facilityId = (groupBy === "facility" || isFacilityFallback) ? rep.facility?.id ?? null : null;
                const entityHref = doctorId
                  ? `/healthcare-team/provider/${doctorId}`
                  : facilityId
                  ? `/healthcare-team/facility/${facilityId}`
                  : null;

                const photo = !isFacilityFallback && groupBy === "doctor" ? rep.doctor?.photo ?? null : null;
                const rating = !isFacilityFallback && groupBy === "doctor" ? rep.doctor?.rating ?? null : null;
                const isInactive =
                  (!isFacilityFallback && groupBy === "doctor" && rep.doctor?.active === false) ||
                  ((isFacilityFallback || groupBy === "facility") && rep.facility?.active === false);

                // Summary: next upcoming + most recent past
                let nextVisit: typeof rep | null = null;
                let nextDateStr: string | null = null;
                let lastDisplayVisit: typeof rep | null = null;
                let lastDateStr: string | null = null;
                for (const v of groupVisits) {
                  const d = effectiveDate(v);
                  if (d && d >= todayStr && (v.status === "PENDING" || v.status === "SCHEDULED")) {
                    if (!nextDateStr || d < nextDateStr) { nextVisit = v; nextDateStr = d; }
                  } else if (d && (d < todayStr || v.status === "COMPLETED" || v.status === "CANCELLED")) {
                    if (!lastDateStr || d > lastDateStr) { lastDisplayVisit = v; lastDateStr = d; }
                  }
                }

                // Split: upcoming vs past
                const upcomingVisits = groupVisits.filter(v => {
                  const d = effectiveDate(v);
                  return (v.status === "PENDING" || v.status === "SCHEDULED") && (!d || d >= todayStr);
                });
                const upcomingIds = new Set(upcomingVisits.map(v => v.id));
                const pastVisits = groupVisits.filter(v => !upcomingIds.has(v.id));
                const visiblePast = pastVisits.slice(0, 3);
                const extraCount = pastVisits.length - visiblePast.length;

                const card = (
                  <div key={groupName} className={`rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col ${isInactive ? "bg-gray-50 opacity-75" : "bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isFacilityFallback && (
                            <span className="text-xs font-medium text-indigo-500 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 shrink-0">
                              Facility
                            </span>
                          )}
                          {entityHref ? (
                            <Link
                              href={entityHref}
                              className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
                            >
                              {groupName}
                            </Link>
                          ) : (
                            <span className="font-semibold text-gray-900">{groupName}</span>
                          )}
                          {rating != null && (
                            <StarRating value={rating} readonly size="sm" />
                          )}
                          {isInactive && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 shrink-0">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                          {groupBy !== "facility" && !isFacilityFallback && rep.facility && (
                            <span>{rep.facility.name}</span>
                          )}
                          {rep.specialty && <span>{rep.specialty}</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                          {nextVisit && (
                            <span className="text-gray-500">
                              <span className="text-indigo-500 font-medium">Next:</span>{" "}
                              {nextVisit.date
                                ? formatDate(nextVisit.date)
                                : nextVisit.dueMonth
                                ? formatDueMonth(nextVisit.dueMonth)
                                : "TBD"}
                            </span>
                          )}
                          {lastDisplayVisit && (
                            <span className="text-gray-500">
                              <span className="font-medium text-gray-600">Last:</span>{" "}
                              {lastDisplayVisit.date
                                ? formatDate(lastDisplayVisit.date)
                                : lastDisplayVisit.dueMonth
                                ? formatDueMonth(lastDisplayVisit.dueMonth)
                                : ""}
                            </span>
                          )}
                          {!nextVisit && !lastDisplayVisit && (
                            <span className="text-gray-400">
                              {groupVisits.some(v => v.status === "PENDING") ? "Scheduling pending" : "No dates recorded"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {photo && (
                          entityHref ? (
                            <Link href={entityHref}>
                              <img
                                src={photo}
                                alt={groupName}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100 hover:ring-indigo-200 transition-all"
                              />
                            </Link>
                          ) : (
                            <img
                              src={photo}
                              alt={groupName}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                            />
                          )
                        )}
                        <span className="text-xs text-gray-400">
                          {groupVisits.length} visit{groupVisits.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Visit pills inside card */}
                    {(upcomingVisits.length > 0 || pastVisits.length > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                        {upcomingVisits.map((v) => (
                          <VisitCard key={v.id} visit={v} pill showDoctor={groupBy === "facility"} showFacility={groupBy === "doctor" && !isFacilityFallback} />
                        ))}
                        {visiblePast.map((v) => (
                          <VisitCard key={v.id} visit={v} pill showDoctor={groupBy === "facility"} showFacility={groupBy === "doctor" && !isFacilityFallback} />
                        ))}
                        {extraCount > 0 && !isExpanded && (
                          <button
                            onClick={() => toggleGroup(groupName)}
                            className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            +{extraCount} more
                          </button>
                        )}
                        {isExpanded && pastVisits.slice(3).map((v) => (
                          <VisitCard key={v.id} visit={v} pill showDoctor={groupBy === "facility"} showFacility={groupBy === "doctor" && !isFacilityFallback} />
                        ))}
                        {extraCount > 0 && isExpanded && (
                          <button
                            onClick={() => toggleGroup(groupName)}
                            className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );

                // Insert a full-width divider row before the first group with no upcoming visits
                if (groupDividerIdx > 0 && groupIndex === groupDividerIdx) {
                  return [
                    <div key="group-section-divider" className="col-span-full flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">No upcoming appointments</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>,
                    card,
                  ];
                }
                return [card];
              })}
            </div>
          ) : (
            /* None mode: needs-scheduling + year-grouped sections with future/past divider */
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

              {noneGroups && (
                <>
                  {noneGroups.upcoming.map(([year, yearVisits]) => (
                    <section key={`upcoming-${year}`} className="space-y-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-500">
                        {year}
                      </h2>
                      <div className="space-y-3">
                        {yearVisits.map((v) => (
                          <VisitCard key={v.id} visit={v} />
                        ))}
                      </div>
                    </section>
                  ))}

                  {noneGroups.upcoming.length > 0 && noneGroups.past.length > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Past</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}

                  {noneGroups.past.map(([year, yearVisits]) => (
                    <section key={`past-${year}`} className="space-y-3">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                        {year}
                      </h2>
                      <div className="space-y-3">
                        {yearVisits.map((v) => (
                          <VisitCard key={v.id} visit={v} />
                        ))}
                      </div>
                    </section>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function VisitsPage() {
  return (
    <Suspense>
      <VisitsPageInner />
    </Suspense>
  );
}
