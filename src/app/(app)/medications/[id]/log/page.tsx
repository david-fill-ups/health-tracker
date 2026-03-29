"use client";

import { useState, useEffect, use } from "react";
import { useProfile } from "@/components/layout/ProfileProvider";
import { MedicationLogForm } from "@/components/medications/MedicationLogForm";

export default function LogDosePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { activeProfileId } = useProfile();
  const [medicationName, setMedicationName] = useState<string | null>(null);
  const [medicationDosage, setMedicationDosage] = useState<string | null>(null);
  const [medicationType, setMedicationType] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/medications/${id}?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data) => {
        setMedicationName(data?.name ?? null);
        setMedicationDosage(data?.dosage ?? null);
        setMedicationType(data?.medicationType ?? null);
      })
      .catch(() => {});
  }, [id, activeProfileId]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/medications" className="text-sm text-indigo-600 hover:underline">
          ← Back to Medications
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Log dose{medicationName ? ` — ${medicationName}` : ""}
        </h1>
      </div>

      {!activeProfileId ? (
        <p className="text-sm text-gray-500">Select a profile first.</p>
      ) : (
        <MedicationLogForm
          medicationId={id}
          profileId={activeProfileId}
          medicationDosage={medicationDosage}
          medicationType={medicationType}
        />
      )}
    </div>
  );
}
