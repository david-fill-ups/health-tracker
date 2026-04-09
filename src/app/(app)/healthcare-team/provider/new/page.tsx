"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { DoctorForm } from "@/components/healthcare-team/DoctorForm";

interface Facility {
  id: string;
  name: string;
  websiteUrl?: string | null;
  portalUrl?: string | null;
  locations?: { id: string; name: string }[];
}

export default function NewProviderPage() {
  const { activeProfileId } = useProfile();
  const router = useRouter();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [allLocations, setAllLocations] = useState<{ id: string; name: string; facilityId: string }[]>([]);

  useEffect(() => {
    if (!activeProfileId) return;
    fetch(`/api/facilities?profileId=${activeProfileId}`)
      .then((r) => r.json())
      .then((data: Facility[]) => {
        if (!Array.isArray(data)) return;
        setFacilities(data);
        setAllLocations(
          data.flatMap((f) => (f.locations ?? []).map((l) => ({ ...l, facilityId: f.id })))
        );
      })
      .catch(() => {});
  }, [activeProfileId]);

  if (!activeProfileId) {
    return <p className="text-sm text-gray-500">Select a profile first.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/healthcare-team" className="text-sm text-indigo-600 hover:underline">
          ← Back to Healthcare Team
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">New Provider</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <DoctorForm
          profileId={activeProfileId}
          facilities={facilities}
          locations={allLocations}
          onSuccess={() => router.push("/healthcare-team")}
          onCancel={() => router.push("/healthcare-team")}
        />
      </div>
    </div>
  );
}
