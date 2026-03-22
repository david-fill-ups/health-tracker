"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { VisitCard, type Visit } from "@/components/visits/VisitCard";
import type { VisitStatus, VisitType } from "@/generated/prisma/enums";

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
  const facilityMap = new Map<string, string>();
  const doctorMap = new Map<string, string>();
  for (const v of visits) {
    if (v.facility) facilityMap.set(v.facility.id, v.facility.name);
    if (v.doctor) doctorMap.set(v.doctor.id, v.doctor.name);
  }
  const facilities = Array.from(facilityMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  const doctors = Array.from(doctorMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  // Apply all filters
  let filtered = visits;
  if (activeTab !== "ALL") filtered = filtered.filter((v) => v.status === activeTab);
  if (filterFacilityId) filtered = filtered.filter((v) => v.facility?.id === filterFacilityId);
  if (filterDoctorId) filtered = filtered.filter((v) => v.doctor?.id === filterDoctorId);
  if (filterSpecialty) filtered = filtered.filter((v) =>
    (v.specialty ?? "").toLowerCase().includes(filterSpecialty.toLowerCase())
  );
  if (filterType) filtered = filtered.filter((v) => v.type === filterType);
  if (filterDateFrom) filtered = filtered.filter((v) => v.date && v.date >= filterDateFrom);
  if (filterDateTo) filtered = filtered.filter((v) => v.date && v.date <= filterDateTo + "T23:59:59");

  const hasFilters = !!(filterFacilityId || filterDoctorId || filterSpecialty || filterType || filterDateFrom || filterDateTo);

  function clearFilters() {
    setFilterFacilityId("");
    setFilterDoctorId("");
    setFilterSpecialty("");
    setFilterType("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  const needsScheduling = filtered.filter(
    (v) => !v.date && (v.status === "PENDING" || v.status === "SCHEDULED")
  );
  const scheduled = filtered.filter((v) => !!v.date);

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
              value={filterSpecialty}
              onChange={(e) => setFilterSpecialty(e.target.value)}
              placeholder="e.g. Urology"
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
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
        <p className="text-sm text-gray-400">Loading…</p>
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
              {needsScheduling.length > 0 && (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Scheduled
                </h2>
              )}
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
