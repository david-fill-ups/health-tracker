"use client";

import { useState } from "react";
import { useProfile } from "@/components/layout/ProfileProvider";
import { UpcomingVisits } from "@/components/dashboard/UpcomingVisits";
import { NeedToSchedule } from "@/components/dashboard/NeedToSchedule";
import { UpcomingDoses } from "@/components/dashboard/UpcomingDoses";
import { VaccinationStatus } from "@/components/dashboard/VaccinationStatus";
import { ActiveConditions } from "@/components/dashboard/ActiveConditions";
import { Allergies } from "@/components/dashboard/Allergies";
import { DocumentImportModal } from "@/components/import/DocumentImportModal";

export default function DashboardPage() {
  const { activeProfileId } = useProfile();
  const [importOpen, setImportOpen] = useState(false);

  if (!activeProfileId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="text-4xl">👤</span>
        <h2 className="mt-4 text-lg font-semibold text-gray-700">Select a profile to get started</h2>
        <p className="mt-1 text-sm text-gray-400">
          Use the profile switcher in the top bar to choose a health profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setImportOpen(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 shrink-0"
        >
          Import Documents
        </button>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <UpcomingVisits activeProfileId={activeProfileId} />
        <NeedToSchedule activeProfileId={activeProfileId} />
        <UpcomingDoses activeProfileId={activeProfileId} />
        <VaccinationStatus activeProfileId={activeProfileId} />
        <ActiveConditions activeProfileId={activeProfileId} />
        <Allergies activeProfileId={activeProfileId} />
      </div>

      <DocumentImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        defaultProfileId={activeProfileId ?? undefined}
      />
    </div>
  );
}
