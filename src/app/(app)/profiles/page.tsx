"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { ProfileCard } from "@/components/profiles/ProfileCard";

interface Profile {
  id: string;
  name: string;
  birthDate: string;
  sex: string;
  state: string | null;
  calendarToken?: string;
  imageData?: string | null;
}

export default function ProfilesPage() {
  const { activeProfileId } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data: Profile[]) => setProfiles(data))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Health Profiles</h1>
        <Link
          href="/profiles/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          + New Profile
        </Link>
      </div>
      <p className="text-sm text-gray-500">
        Manage health profiles for yourself and family members.
      </p>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && profiles.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">No profiles yet.</p>
          <Link
            href="/profiles/new"
            className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            Create your first profile →
          </Link>
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              isActive={p.id === activeProfileId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
