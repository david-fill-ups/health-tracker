"use client";

import { useProfile } from "@/components/layout/ProfileProvider";
import { MedicationForm } from "@/components/medications/MedicationForm";

export default function NewMedicationPage() {
  const { activeProfileId } = useProfile();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <a href="/medications" className="text-sm text-indigo-600 hover:underline">
          ← Back to Medications
        </a>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">New Medication</h1>
      </div>

      {!activeProfileId ? (
        <p className="text-sm text-gray-500">Select a profile first.</p>
      ) : (
        <MedicationForm profileId={activeProfileId} />
      )}
    </div>
  );
}
