"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Toast } from "@/components/ui/Toast";

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
  frequency: string | null;
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
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
    setToast("Medication deactivated");
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

      {loading && <CardSkeleton count={3} />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          {active.length === 0 && inactive.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500 mb-3">No medications recorded.</p>
              <Link
                href="/medications/new"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                + Add your first medication
              </Link>
            </div>
          )}

          {active.length > 0 && (
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

          {inactive.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setInactiveOpen((v) => !v)}
                className="text-sm text-gray-500 underline"
              >
                {inactiveOpen ? "Hide" : "Show"} inactive ({inactive.length})
              </button>
              {inactiveOpen && (
                <div className="mt-3 space-y-3">
                  {inactive.map((m) => (
                    <MedicationCard
                      key={m.id}
                      medication={m}
                      profileId={activeProfileId}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
