"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { FacilityCard } from "@/components/healthcare-team/FacilityCard";
import { DoctorCard } from "@/components/healthcare-team/DoctorCard";
import type { FacilityType } from "@/generated/prisma/enums";

interface Doctor {
  id: string;
  name: string;
  specialty?: string | null;
  facilityId?: string | null;
  facility?: { id: string; name: string } | null;
  phone?: string | null;
  active: boolean;
  _count?: { visits: number };
  visits?: Array<{ date: string | null }>;
}

interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  phone?: string | null;
  active: boolean;
  _count?: { visits: number };
  visits?: Array<{ date: string | null }>;
}

export default function HealthcareTeamPage() {
  const { activeProfileId } = useProfile();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [inactiveFacilitiesOpen, setInactiveFacilitiesOpen] = useState(false);
  const [inactiveDoctorsOpen, setInactiveDoctorsOpen] = useState(false);

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

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Select a profile to view your healthcare team.
      </div>
    );
  }

  const activeFacilities = facilities.filter((f) => f.active);
  const inactiveFacilities = facilities.filter((f) => !f.active);
  const activeDoctors = doctors.filter((d) => d.active);
  const inactiveDoctors = doctors.filter((d) => !d.active);

  function toFacilityCardProps(f: Facility) {
    return {
      ...f,
      visitCount: f._count?.visits,
      lastVisit: f.visits?.[0]?.date ?? null,
    };
  }

  function toDoctorCardProps(d: Doctor) {
    return {
      ...d,
      visitCount: d._count?.visits,
      lastVisit: d.visits?.[0]?.date ?? null,
    };
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Healthcare Team</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Facilities column */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Facilities</h2>
            <Link
              href="/healthcare-team/facility/new"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Add Facility
            </Link>
          </div>

          {loadingFacilities ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              {activeFacilities.length === 0 && inactiveFacilities.length === 0 && (
                <p className="text-sm text-gray-400">No facilities added yet.</p>
              )}
              <div className="space-y-2">
                {activeFacilities.map((f) => (
                  <FacilityCard key={f.id} facility={toFacilityCardProps(f)} />
                ))}
              </div>

              {inactiveFacilities.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setInactiveFacilitiesOpen((v) => !v)}
                    className="text-sm text-gray-500 underline"
                  >
                    {inactiveFacilitiesOpen ? "Hide" : "Show"} inactive ({inactiveFacilities.length})
                  </button>
                  {inactiveFacilitiesOpen && (
                    <div className="mt-2 space-y-2">
                      {inactiveFacilities.map((f) => (
                        <FacilityCard key={f.id} facility={toFacilityCardProps(f)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Doctors column */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Doctors & Providers</h2>
            <Link
              href="/healthcare-team/provider/new"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Add Doctor
            </Link>
          </div>

          {loadingDoctors ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              {activeDoctors.length === 0 && inactiveDoctors.length === 0 && (
                <p className="text-sm text-gray-400">No doctors added yet.</p>
              )}
              <div className="space-y-2">
                {activeDoctors.map((d) => (
                  <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} />
                ))}
              </div>

              {inactiveDoctors.length > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setInactiveDoctorsOpen((v) => !v)}
                    className="text-sm text-gray-500 underline"
                  >
                    {inactiveDoctorsOpen ? "Hide" : "Show"} inactive ({inactiveDoctors.length})
                  </button>
                  {inactiveDoctorsOpen && (
                    <div className="mt-2 space-y-2">
                      {inactiveDoctors.map((d) => (
                        <DoctorCard key={d.id} doctor={toDoctorCardProps(d)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
