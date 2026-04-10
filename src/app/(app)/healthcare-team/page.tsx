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
  photo?: string | null;
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

type SortBy = "name" | "rating" | "visits" | "lastVisit";
type SortDir = "asc" | "desc";

// Default direction when first selecting a sort option
const defaultSortDir: Record<SortBy, SortDir> = {
  name: "asc",
  rating: "desc",
  visits: "desc",
  lastVisit: "desc",
};

function sortDoctors(arr: Doctor[], sortBy: SortBy, dir: SortDir): Doctor[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...arr].sort((a, b) => {
    switch (sortBy) {
      case "name": return sign * a.name.localeCompare(b.name);
      case "rating": return sign * ((a.rating ?? -1) - (b.rating ?? -1));
      case "visits": return sign * ((a._count?.visits ?? 0) - (b._count?.visits ?? 0));
      case "lastVisit": {
        const da = a.visits?.[0]?.date ? new Date(a.visits[0].date).getTime() : 0;
        const db = b.visits?.[0]?.date ? new Date(b.visits[0].date).getTime() : 0;
        return sign * (da - db);
      }
    }
  });
}

function sortFacilities(arr: Facility[], sortBy: SortBy, dir: SortDir): Facility[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...arr].sort((a, b) => {
    switch (sortBy) {
      case "name": return sign * a.name.localeCompare(b.name);
      case "rating": return sign * ((a.rating ?? -1) - (b.rating ?? -1));
      case "visits": return sign * ((a._count?.visits ?? 0) - (b._count?.visits ?? 0));
      case "lastVisit": {
        const da = a.visits?.[0]?.date ? new Date(a.visits[0].date).getTime() : 0;
        const db = b.visits?.[0]?.date ? new Date(b.visits[0].date).getTime() : 0;
        return sign * (da - db);
      }
    }
  });
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
  const [sortBy, setSortBy] = useState<SortBy>(
    (searchParams.get("sort") as SortBy) ?? "name"
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    (searchParams.get("dir") as SortDir) ?? "asc"
  );
  const [specialty, setSpecialty] = useState(searchParams.get("specialty") ?? "");
  const addMenuRef = useRef<HTMLDivElement>(null);

  function syncToUrl(
    q: string,
    filter: "all" | "facilities" | "providers",
    inactive: boolean,
    sort: SortBy,
    dir: SortDir,
    spec: string,
  ) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filter !== "all") params.set("filter", filter);
    if (inactive) params.set("inactive", "1");
    if (sort !== "name") params.set("sort", sort);
    if (dir !== defaultSortDir[sort]) params.set("dir", dir);
    if (spec) params.set("specialty", spec);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    syncToUrl(value, showFilter, inactiveOpen, sortBy, sortDir, specialty);
  }

  function handleFilterChange(value: "all" | "facilities" | "providers") {
    setShowFilter(value);
    syncToUrl(search, value, inactiveOpen, sortBy, sortDir, specialty);
  }

  function handleInactiveToggle() {
    const next = !inactiveOpen;
    setInactiveOpen(next);
    syncToUrl(search, showFilter, next, sortBy, sortDir, specialty);
  }

  function handleSortChange(value: SortBy) {
    if (value === sortBy) {
      const newDir: SortDir = sortDir === "asc" ? "desc" : "asc";
      setSortDir(newDir);
      syncToUrl(search, showFilter, inactiveOpen, value, newDir, specialty);
    } else {
      const newDir = defaultSortDir[value];
      setSortBy(value);
      setSortDir(newDir);
      syncToUrl(search, showFilter, inactiveOpen, value, newDir, specialty);
    }
  }

  function handleSpecialtyChange(value: string) {
    setSpecialty(value);
    syncToUrl(search, showFilter, inactiveOpen, sortBy, sortDir, value);
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

  // Unique specialties for filter dropdown
  const specialties = [
    ...new Set(doctors.map((d) => d.specialty).filter(Boolean) as string[]),
  ].sort();

  const activeFacilities = facilities.filter((f) => f.active);
  const inactiveFacilities = facilities.filter((f) => !f.active);

  // Map facilityId → all doctors (active + inactive)
  const allDoctorsByFacility = new Map<string, Doctor[]>();
  const independentDoctors: Doctor[] = [];
  for (const d of doctors) {
    if (d.facilityId) {
      const arr = allDoctorsByFacility.get(d.facilityId) ?? [];
      arr.push(d);
      allDoctorsByFacility.set(d.facilityId, arr);
    } else {
      independentDoctors.push(d);
    }
  }

  const independentActiveDoctors = independentDoctors.filter((d) => d.active);
  const independentInactiveDoctors = independentDoctors.filter((d) => !d.active);

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

  function doctorMatchesSpecialty(d: Doctor): boolean {
    if (!specialty) return true;
    return d.specialty === specialty;
  }

  function doctorMatches(d: Doctor): boolean {
    return doctorMatchesSearch(d) && doctorMatchesSpecialty(d);
  }

  // Active facilities (include if facility name matches OR any of its doctors match)
  const visibleActiveFacilities = showFilter !== "providers"
    ? sortFacilities(
        activeFacilities.filter((f) =>
          facilityMatchesSearch(f) || (allDoctorsByFacility.get(f.id) ?? []).some(doctorMatches)
        ),
        sortBy,
        sortDir,
      )
    : [];

  // Independent active doctors
  const visibleIndependentActiveDoctors = showFilter !== "facilities"
    ? sortDoctors(independentActiveDoctors.filter(doctorMatches), sortBy, sortDir)
    : [];

  // Providers-only flat mode (active)
  const flatProviders = showFilter === "providers"
    ? sortDoctors(doctors.filter((d) => d.active && doctorMatches(d)), sortBy, sortDir)
    : [];

  // Providers-only flat mode (inactive)
  const flatInactiveProviders = showFilter === "providers"
    ? sortDoctors(doctors.filter((d) => !d.active && doctorMatches(d)), sortBy, sortDir)
    : [];

  // Inactive section: only inactive facilities + independent inactive doctors
  const visibleInactiveFacilities = showFilter !== "providers"
    ? sortFacilities(
        inactiveFacilities.filter((f) =>
          facilityMatchesSearch(f) || (allDoctorsByFacility.get(f.id) ?? []).some(doctorMatches)
        ),
        sortBy,
        sortDir,
      )
    : [];

  const visibleInactiveIndependentDoctors = showFilter !== "facilities"
    ? sortDoctors(independentInactiveDoctors.filter(doctorMatches), sortBy, sortDir)
    : [];

  const filteredInactiveCount =
    showFilter === "providers"
      ? flatInactiveProviders.length
      : showFilter === "facilities"
      ? visibleInactiveFacilities.length
      : visibleInactiveFacilities.length + visibleInactiveIndependentDoctors.length;

  const loading = loadingFacilities || loadingDoctors;

  const sortLabels: Record<SortBy, string> = {
    name: "Name",
    rating: "Rating",
    visits: "Most visited",
    lastVisit: "Last visit",
  };

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

      {/* Search + filters */}
      <div className="flex flex-col gap-2">
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
        <div className="flex flex-wrap gap-2 items-center">
          {/* Specialty filter — only when providers are visible */}
          {showFilter !== "facilities" && specialties.length > 0 && (
            <select
              value={specialty}
              onChange={(e) => handleSpecialtyChange(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All specialties</option>
              {specialties.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-gray-500">Sort:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
              {(["name", "rating", "visits", "lastVisit"] as SortBy[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSortChange(opt)}
                  className={`px-3 py-1.5 transition-colors flex items-center gap-1 ${
                    sortBy === opt
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {sortLabels[opt]}
                  {sortBy === opt && (
                    <span className="text-xs leading-none">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {visibleActiveFacilities.length === 0 && visibleIndependentActiveDoctors.length === 0 && flatProviders.length === 0 && (
            <p className="text-sm text-gray-400">
              {search || showFilter !== "all" || specialty
                ? "No results found."
                : "No facilities or providers added yet."}
            </p>
          )}

          {/* Providers-only flat mode */}
          {showFilter === "providers" && flatProviders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {flatProviders.map((d) => (
                <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} mini />
              ))}
            </div>
          )}

          {/* Facilities with their doctors as mini cards */}
          {showFilter !== "providers" && visibleActiveFacilities.map((f) => {
            const facilityDoctors = showFilter === "facilities"
              ? []
              : sortDoctors(
                  (allDoctorsByFacility.get(f.id) ?? []).filter(doctorMatches),
                  sortBy,
                  sortDir,
                );
            return (
              <div key={f.id} className="space-y-2">
                <FacilityCard facility={toFacilityCardProps(f)} />
                {facilityDoctors.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-3">
                    {facilityDoctors.map((d) => (
                      <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} mini />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Independent active providers */}
          {showFilter !== "providers" && visibleIndependentActiveDoctors.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Independent Providers
              </h2>
              <div className="flex flex-wrap gap-2">
                {visibleIndependentActiveDoctors.map((d) => (
                  <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} mini />
                ))}
              </div>
            </div>
          )}

          {/* Inactive section */}
          {filteredInactiveCount > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-2">
              <button
                onClick={handleInactiveToggle}
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <span className="text-xs">{inactiveOpen ? "▾" : "▸"}</span>
                {inactiveOpen ? "Hide" : "Show"} inactive (
                {filteredInactiveCount})
              </button>
              {inactiveOpen && (
                <div className="mt-3 space-y-4">
                  {/* Inactive facilities with all their doctors */}
                  {visibleInactiveFacilities.map((f) => {
                    const facilityDoctors = showFilter === "facilities"
                      ? []
                      : sortDoctors(
                          (allDoctorsByFacility.get(f.id) ?? []).filter(doctorMatches),
                          sortBy,
                          sortDir,
                        );
                    return (
                      <div key={f.id} className="space-y-2">
                        <FacilityCard facility={toFacilityCardProps(f)} />
                        {facilityDoctors.length > 0 && (
                          <div className="flex flex-wrap gap-2 pl-3">
                            {facilityDoctors.map((d) => (
                              <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} mini />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Providers mode: flat inactive list */}
                  {showFilter === "providers" && flatInactiveProviders.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {flatInactiveProviders.map((d) => (
                        <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} mini />
                      ))}
                    </div>
                  )}

                  {/* Independent inactive providers */}
                  {showFilter !== "providers" && visibleInactiveIndependentDoctors.length > 0 && (
                    <div className="space-y-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                        Independent Providers
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {visibleInactiveIndependentDoctors.map((d) => (
                          <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} mini />
                        ))}
                      </div>
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
