"use client";

import { useRouter } from "next/navigation";
import { useProfile } from "@/components/layout/ProfileProvider";
import { VisitForm } from "@/components/visits/VisitForm";

export default function NewVisitPage() {
  const { activeProfileId } = useProfile();
  const router = useRouter();

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        Select a profile to add a visit.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Visit</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <VisitForm
          profileId={activeProfileId}
          onSuccess={() => router.push("/visits")}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
