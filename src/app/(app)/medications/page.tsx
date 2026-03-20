"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { MedicationCard } from "@/components/medications/MedicationCard";

interface MedicationLog {
  id: string;
  date: string;
  dosage: number;
  unit: string;
  injectionSite: string | null;
  weight: number | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string | null;
  prescribingDoctorId: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  recentLog?: MedicationLog | null;
  prescribingDoctor?: { name: string } | null;
}

export default function MedicationsPage() {
  const { activeProfileId } = useProfile();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/medications?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => setMedications(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load medications"))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  function handleDeactivate(id: string) {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: false } : m))
    );
  }

  const active = medications.filter((m) => m.active);
  const inactive = medications.filter((m) => !m.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Medications</h1>
        <Link
          href="/medications/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Medication
        </Link>
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view medications.</p>
      )}

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-700">Active</h2>
            {active.length === 0 ? (
              <p className="text-sm text-gray-500">No active medications.</p>
            ) : (
              <div className="space-y-3">
                {active.map((m) => (
                  <MedicationCard
                    key={m.id}
                    medication={m}
                    profileId={activeProfileId}
                    onDeactivate={handleDeactivate}
                  />
                ))}
              </div>
            )}
          </section>

          {inactive.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-500">Inactive</h2>
              <div className="space-y-3">
                {inactive.map((m) => (
                  <MedicationCard
                    key={m.id}
                    medication={m}
                    profileId={activeProfileId}
                    onDeactivate={handleDeactivate}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
