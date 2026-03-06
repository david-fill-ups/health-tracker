"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyButton } from "./CopyButton";

interface Profile {
  id: string;
  name: string;
  birthYear: number;
  sex: string;
  state: string | null;
  calendarToken: string;
}

function calendarUrl(profileId: string, token: string) {
  const host = typeof window !== "undefined" ? window.location.host : "";
  return `webcal://${host}/api/calendar/${profileId}?token=${token}`;
}

export function ProfileCard({
  profile,
  isActive,
}: {
  profile: Profile;
  isActive: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
    router.refresh();
  }

  const calUrl = calendarUrl(profile.id, profile.calendarToken);

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        isActive ? "border-indigo-400 ring-2 ring-indigo-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{profile.name}</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            Born {profile.birthYear} &middot;{" "}
            {profile.sex.replace(/_/g, " ").toLowerCase()}{" "}
            {profile.state && <>&middot; {profile.state}</>}
          </p>
        </div>
        {isActive && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            Active
          </span>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <p className="mb-1 text-xs font-medium text-gray-500">Calendar subscription</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate text-xs text-gray-600">{calUrl}</code>
          <CopyButton text={calUrl} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/profiles/${profile.id}/edit`}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
