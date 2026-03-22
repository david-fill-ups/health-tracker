"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { FacilityForm } from "@/components/healthcare-team/FacilityForm";

export default function NewFacilityPage() {
  const { activeProfileId } = useProfile();
  const router = useRouter();

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/healthcare-team" className="text-sm text-indigo-600 hover:underline">
          ← Back to Healthcare Team
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">New Facility</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <FacilityForm
          profileId={activeProfileId}
          onSuccess={() => router.push("/healthcare-team")}
          onCancel={() => router.push("/healthcare-team")}
        />
      </div>
    </div>
  );
}
