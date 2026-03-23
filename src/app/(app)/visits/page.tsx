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

  const { needsScheduling, scheduled } = useMemo(() => {
    const now = Date.now();
    const scheduledList = filtered.filter((v) => !!v.date);

    if (dateSort === "asc") {
      scheduledList.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    } else if (dateSort === "desc") {
      scheduledList.sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
    } else {
      scheduledList.sort((a, b) => {
        const aTime = new Date(a.date!).getTime();
        const bTime = new Date(b.date!).getTime();
        const aFuture = aTime >= now;
        const bFuture = bTime >= now;
        if (aFuture !== bFuture) return aFuture ? -1 : 1;
        if (aFuture) return aTime - bTime; // upcoming: ascending
        return bTime - aTime; // past: descending
      });
    }

    return {
      needsScheduling: filtered.filter(
        (v) => !v.date && (v.status === "PENDING" || v.status === "SCHEDULED")
      ),
      scheduled: scheduledList,
    };
  }, [filtered, dateSort]);

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

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
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

          {filtered.length === 0 && (
            <p className="text-sm text-gray-500">No visits found.</p>
          )}
        </>
      )}
    </div>
  );
}
