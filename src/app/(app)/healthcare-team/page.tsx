"use client";

import { useState, useEffect, useCallback } from "react";
import { useProfile } from "@/components/layout/ProfileProvider";
import { FacilityCard } from "@/components/healthcare-team/FacilityCard";
import { FacilityForm } from "@/components/healthcare-team/FacilityForm";
import { DoctorCard } from "@/components/healthcare-team/DoctorCard";
import { DoctorForm } from "@/components/healthcare-team/DoctorForm";
import type { FacilityType } from "@/generated/prisma/enums";

interface Location {
  id: string;
  name: string;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  active: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialty?: string | null;
  facilityId?: string | null;
  facility?: { id: string; name: string } | null;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  phone?: string | null;
  notes?: string | null;
  active: boolean;
}

interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  phone?: string | null;
  active: boolean;
  locations: Location[];
  doctors: Doctor[];
}

type FacilityEditTarget = {
  id: string;
  name: string;
  type: FacilityType;
  websiteUrl: string;
  portalUrl: string;
  phone: string;
  active: boolean;
};

type DoctorEditTarget = {
  id: string;
  name: string;
  specialty: string;
  facilityId: string;
  websiteUrl: string;
  portalUrl: string;
  phone: string;
  notes: string;
  active: boolean;
};

export default function HealthcareTeamPage() {
  const { activeProfileId } = useProfile();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [editFacility, setEditFacility] = useState<FacilityEditTarget | null>(null);

  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [editDoctor, setEditDoctor] = useState<DoctorEditTarget | null>(null);

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

  async function handleDeleteFacility(id: string) {
    await fetch(`/api/facilities/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleDeleteDoctor(id: string) {
    await fetch(`/api/doctors/${id}?profileId=${activeProfileId}`, { method: "DELETE" });
    setDoctors((prev) => prev.filter((d) => d.id !== id));
  }

  function handleEditFacility(facility: Facility) {
    setEditFacility({
      id: facility.id,
      name: facility.name,
      type: facility.type,
      websiteUrl: facility.websiteUrl ?? "",
      portalUrl: facility.portalUrl ?? "",
      phone: facility.phone ?? "",
      active: facility.active,
    });
    setShowFacilityForm(true);
  }

  function handleEditDoctor(doctor: Doctor) {
    setEditDoctor({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty ?? "",
      facilityId: doctor.facilityId ?? "",
      websiteUrl: doctor.websiteUrl ?? "",
      portalUrl: doctor.portalUrl ?? "",
      phone: doctor.phone ?? "",
      notes: doctor.notes ?? "",
      active: doctor.active,
    });
    setShowDoctorForm(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleFacilitySuccess(saved: any) {
    setFacilities((prev) => {
      const idx = prev.findIndex((f) => f.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...saved };
        return next;
      }
      return [...prev, { ...saved, locations: saved.locations ?? [], doctors: saved.doctors ?? [] }];
    });
    setShowFacilityForm(false);
    setEditFacility(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleDoctorSuccess(saved: any) {
    setDoctors((prev) => {
      const idx = prev.findIndex((d) => d.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    setShowDoctorForm(false);
    setEditDoctor(null);
  }

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

  const facilitySimpleList = facilities.map((f) => ({ id: f.id, name: f.name }));

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">Healthcare Team</h1>

      {/* Facilities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Facilities</h2>
          <button
            onClick={() => {
              setEditFacility(null);
              setShowFacilityForm((v) => !v);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Facility
          </button>
        </div>

        {showFacilityForm && (
          <FacilityForm
            profileId={activeProfileId}
            initial={editFacility ?? undefined}
            onSuccess={handleFacilitySuccess}
            onCancel={() => {
              setShowFacilityForm(false);
              setEditFacility(null);
            }}
          />
        )}

        {loadingFacilities ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            {activeFacilities.length === 0 && inactiveFacilities.length === 0 && (
              <p className="text-sm text-gray-400">No facilities added yet.</p>
            )}
            <div className="space-y-3">
              {activeFacilities.map((f) => (
                <FacilityCard
                  key={f.id}
                  facility={f}
                  onEdit={handleEditFacility}
                  onDelete={handleDeleteFacility}
                />
              ))}
            </div>

            {inactiveFacilities.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setInactiveFacilitiesOpen((v) => !v)}
                  className="text-sm text-gray-500 underline"
                >
                  {inactiveFacilitiesOpen ? "Hide" : "Show"} inactive ({inactiveFacilities.length})
                </button>
                {inactiveFacilitiesOpen && (
                  <div className="mt-3 space-y-3">
                    {inactiveFacilities.map((f) => (
                      <FacilityCard
                        key={f.id}
                        facility={f}
                        onEdit={handleEditFacility}
                        onDelete={handleDeleteFacility}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Doctors */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Doctors & Providers</h2>
          <button
            onClick={() => {
              setEditDoctor(null);
              setShowDoctorForm((v) => !v);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Doctor
          </button>
        </div>

        {showDoctorForm && (
          <DoctorForm
            profileId={activeProfileId}
            facilities={facilitySimpleList}
            initial={editDoctor ?? undefined}
            onSuccess={handleDoctorSuccess}
            onCancel={() => {
              setShowDoctorForm(false);
              setEditDoctor(null);
            }}
          />
        )}

        {loadingDoctors ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            {activeDoctors.length === 0 && inactiveDoctors.length === 0 && (
              <p className="text-sm text-gray-400">No doctors added yet.</p>
            )}
            <div className="space-y-3">
              {activeDoctors.map((d) => (
                <DoctorCard
                  key={d.id}
                  doctor={d}
                  onEdit={handleEditDoctor}
                  onDelete={handleDeleteDoctor}
                />
              ))}
            </div>

            {inactiveDoctors.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setInactiveDoctorsOpen((v) => !v)}
                  className="text-sm text-gray-500 underline"
                >
                  {inactiveDoctorsOpen ? "Hide" : "Show"} inactive ({inactiveDoctors.length})
                </button>
                {inactiveDoctorsOpen && (
                  <div className="mt-3 space-y-3">
                    {inactiveDoctors.map((d) => (
                      <DoctorCard
                        key={d.id}
                        doctor={d}
                        onEdit={handleEditDoctor}
                        onDelete={handleDeleteDoctor}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
