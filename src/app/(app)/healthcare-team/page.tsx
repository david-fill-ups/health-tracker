"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { FacilityCard } from "@/components/healthcare-team/FacilityCard";
import { DoctorCard } from "@/components/healthcare-team/DoctorCard";

interface Doctor {
  id: string;
  name: string;
  specialty?: string | null;
  facilityId?: string | null;
  facility?: { id: string; name: string } | null;
  phone?: string | null;
  active: boolean;
  rating?: number | null;
  _count?: { visits: number };
  visits?: Array<{ date: string | null }>;
}

interface Facility {
  id: string;
  name: string;
  type: string;
  rating?: number | null;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  phone?: string | null;
  active: boolean;
  _count?: { visits: number };
  visits?: Array<{ date: string | null }>;
}

export default function HealthcareTeamPage() {
  return (
    <Suspense>
      <HealthcareTeamContent />
    </Suspense>
  );
}

function HealthcareTeamContent() {
  const { activeProfileId } = useProfile();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(searchParams.get("inactive") === "1");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [showFilter, setShowFilter] = useState<"all" | "facilities" | "providers">(
    (searchParams.get("filter") as "all" | "facilities" | "providers") ?? "all"
  );
  const addMenuRef = useRef<HTMLDivElement>(null);

  function syncToUrl(q: string, filter: "all" | "facilities" | "providers", inactive: boolean) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter !== "all") params.set("filter", filter);
    if (inactive) params.set("inactive", "1");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    syncToUrl(value, showFilter, inactiveOpen);
  }

  function handleFilterChange(value: "all" | "facilities" | "providers") {
    setShowFilter(value);
    syncToUrl(search, value, inactiveOpen);
  }

  function handleInactiveToggle() {
    const next = !inactiveOpen;
    setInactiveOpen(next);
    syncToUrl(search, showFilter, next);
  }

  const fetchFacilities = useCallback(async () => {
    if (!activeProfileId) return;
    setLoadingFacilities(true);
    try {
      const res = await fetch(`/api/facilities?profileId=${activeProfileId}`);
      if (res.ok) setFacilities(await res.json());
    } finally {
      setLoadingFacilities(false);
    }
  }, [activeProfileId]);

  const fetchDoctors = useCallback(async () => {
    if (!activeProfileId) return;
    setLoadingDoctors(true);
    try {
      const res = await fetch(`/api/doctors?profileId=${activeProfileId}`);
      if (res.ok) setDoctors(await res.json());
    } finally {
      setLoadingDoctors(false);
    }
  }, [activeProfileId]);

  useEffect(() => {
    fetchFacilities();
    fetchDoctors();
  }, [fetchFacilities, fetchDoctors]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Select a profile to view your healthcare team.
      </div>
    );
  }

  const activeFacilities = facilities.filter((f) => f.active);
  const inactiveFacilities = facilities.filter((f) => !f.active);
  const inactiveDoctors = doctors.filter((d) => !d.active);

  // Active facilities that have at least one inactive doctor (show in both sections)
  const activeFacilitiesWithInactiveDoctors = activeFacilities.filter(
    (f) => inactiveDoctors.some((d) => d.facilityId === f.id)
  );

  // Group active doctors by facilityId
  const activeDoctorsByFacility = new Map<string, Doctor[]>();
  const independentDoctors: Doctor[] = [];
  for (const d of doctors.filter((d) => d.active)) {
    if (d.facilityId) {
      const arr = activeDoctorsByFacility.get(d.facilityId) ?? [];
      arr.push(d);
      activeDoctorsByFacility.set(d.facilityId, arr);
    } else {
      independentDoctors.push(d);
    }
  }

  // Inactive grouped
  const inactiveDoctorsByFacility = new Map<string, Doctor[]>();
  const inactiveIndependentDoctors: Doctor[] = [];
  for (const d of inactiveDoctors) {
    if (d.facilityId) {
      const arr = inactiveDoctorsByFacility.get(d.facilityId) ?? [];
      arr.push(d);
      inactiveDoctorsByFacility.set(d.facilityId, arr);
    } else {
      inactiveIndependentDoctors.push(d);
    }
  }

  function toDoctorCardProps(d: Doctor) {
    return { ...d, visitCount: d._count?.visits, lastVisit: d.visits?.[0]?.date ?? null };
  }

  function toFacilityCardProps(f: Facility) {
    return { ...f, visitCount: f._count?.visits, lastVisit: f.visits?.[0]?.date ?? null };
  }

  const searchLower = search.toLowerCase();

  function doctorMatchesSearch(d: Doctor): boolean {
    if (!searchLower) return true;
    return (
      d.name.toLowerCase().includes(searchLower) ||
      (d.specialty ?? "").toLowerCase().includes(searchLower) ||
      (d.facility?.name ?? "").toLowerCase().includes(searchLower)
    );
  }

  function facilityMatchesSearch(f: Facility): boolean {
    if (!searchLower) return true;
    return (
      f.name.toLowerCase().includes(searchLower) ||
      f.type.toLowerCase().replace(/_/g, " ").includes(searchLower)
    );
  }

  // Derived: what's visible in the active section
  const visibleActiveFacilities = showFilter !== "providers"
    ? activeFacilities.filter((f) =>
        facilityMatchesSearch(f) || (activeDoctorsByFacility.get(f.id) ?? []).some(doctorMatchesSearch)
      )
    : [];

  const visibleIndependentDoctors = showFilter !== "facilities"
    ? independentDoctors.filter(doctorMatchesSearch)
    : [];

  // In "providers" mode: flat list of all active matching doctors
  const flatProviders = showFilter === "providers"
    ? doctors.filter((d) => d.active && doctorMatchesSearch(d))
    : [];

  // Derived: what's visible in the inactive section
  const visibleInactiveFacilities = showFilter !== "providers"
    ? inactiveFacilities.filter((f) =>
        facilityMatchesSearch(f) || (inactiveDoctorsByFacility.get(f.id) ?? []).some(doctorMatchesSearch)
      )
    : [];

  const visibleActiveFacilitiesWithInactiveDoctors = showFilter !== "providers"
    ? activeFacilitiesWithInactiveDoctors.filter((f) =>
        facilityMatchesSearch(f) || (inactiveDoctorsByFacility.get(f.id) ?? []).some(doctorMatchesSearch)
      )
    : [];

  const visibleInactiveIndependentDoctors = showFilter !== "facilities"
    ? inactiveIndependentDoctors.filter(doctorMatchesSearch)
    : [];

  const loading = loadingFacilities || loadingDoctors;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Healthcare Team</h1>
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setAddMenuOpen((v) => !v)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 flex items-center gap-1"
          >
            + Add <span className="text-xs opacity-70">▾</span>
          </button>
          {addMenuOpen && (
            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-lg z-10 overflow-hidden">
              <Link
                href="/healthcare-team/facility/new"
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => setAddMenuOpen(false)}
              >
                🏥 Add Facility
              </Link>
              <Link
                href="/healthcare-team/provider/new"
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                onClick={() => setAddMenuOpen(false)}
              >
                🩺 Add Provider
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name, specialty, type…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm shrink-0">
          {(["all", "facilities", "providers"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => handleFilterChange(opt)}
              className={`px-3 py-2 capitalize transition-colors ${
                showFilter === opt
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt === "all" ? "All" : opt === "facilities" ? "Facilities" : "Providers"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {visibleActiveFacilities.length === 0 && visibleIndependentDoctors.length === 0 && flatProviders.length === 0 && (
            <p className="text-sm text-gray-400">
              {search || showFilter !== "all"
                ? "No results found."
                : "No facilities or providers added yet."}
            </p>
          )}

          {/* Providers-only flat mode */}
          {showFilter === "providers" && flatProviders.map((d) => (
            <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} />
          ))}

          {/* Facilities with their doctors */}
          {showFilter !== "providers" && visibleActiveFacilities.map((f) => {
            const facilityDoctors = showFilter === "facilities"
              ? []
              : (activeDoctorsByFacility.get(f.id) ?? []).filter(doctorMatchesSearch);
            return (
              <div key={f.id} className="space-y-1">
                <FacilityCard facility={toFacilityCardProps(f)} />
                {facilityDoctors.length > 0 && (
                  <div className="ml-6 space-y-1 border-l-2 border-indigo-100 pl-4">
                    {facilityDoctors.map((d) => (
                      <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {/* Independent providers */}
          {visibleIndependentDoctors.length > 0 && (
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Independent Providers
              </h2>
              <div className="space-y-1">
                {visibleIndependentDoctors.map((d) => (
                  <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive section */}
          {(inactiveFacilities.length > 0 || inactiveDoctors.length > 0) && (
            <div className="border-t border-gray-200 pt-4 mt-2">
              <button
                onClick={handleInactiveToggle}
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <span className="text-xs">{inactiveOpen ? "▾" : "▸"}</span>
                {inactiveOpen ? "Hide" : "Show"} inactive (
                {inactiveFacilities.length + inactiveDoctors.length})
              </button>
              {inactiveOpen && (
                <div className="mt-3 space-y-4">
                  {visibleInactiveFacilities.map((f) => {
                    const facilityDoctors = (inactiveDoctorsByFacility.get(f.id) ?? []).filter(doctorMatchesSearch);
                    return (
                      <div key={f.id} className="space-y-1">
                        <FacilityCard facility={toFacilityCardProps(f)} />
                        {facilityDoctors.length > 0 && (
                          <div className="ml-6 space-y-1 border-l-2 border-gray-100 pl-4">
                            {facilityDoctors.map((d) => (
                              <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Active facilities with some inactive providers */}
                  {visibleActiveFacilitiesWithInactiveDoctors.map((f) => {
                    const facilityDoctors = (inactiveDoctorsByFacility.get(f.id) ?? []).filter(doctorMatchesSearch);
                    return (
                      <div key={f.id} className="space-y-1">
                        <FacilityCard facility={toFacilityCardProps(f)} />
                        {facilityDoctors.length > 0 && (
                          <div className="ml-6 space-y-1 border-l-2 border-gray-100 pl-4">
                            {facilityDoctors.map((d) => (
                              <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {visibleInactiveIndependentDoctors.length > 0 && (
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                        Independent Providers
                      </h2>
                      {visibleInactiveIndependentDoctors.map((d) => (
                        <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
