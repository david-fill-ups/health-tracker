"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { CopyButton } from "./CopyButton";
import { DocumentImportModal } from "@/components/import/DocumentImportModal";

interface Profile {
  id: string;
  name: string;
  birthDate: string;
  sex: string;
  state: string | null;
  calendarToken?: string;
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
  const { setActiveProfileId } = useProfile();
  const [importOpen, setImportOpen] = useState(false);
  const calUrl = profile.calendarToken
    ? calendarUrl(profile.id, profile.calendarToken)
    : null;

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        isActive ? "border-indigo-400 ring-2 ring-indigo-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/profiles/${profile.id}`}
            className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
          >
            {profile.name}
          </Link>
          <p className="mt-0.5 text-sm text-gray-500">
            Born {new Date(profile.birthDate).toLocaleDateString(undefined, { timeZone: "UTC" })} &middot;{" "}
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

      {calUrl && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <p className="mb-1 text-xs font-medium text-gray-500">Calendar subscription</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-xs text-gray-600">{calUrl}</code>
            <CopyButton text={calUrl} />
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Link
          href={`/profiles/${profile.id}`}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Manage
        </Link>
        {calUrl && (
          <Link
            href={`/profiles/${profile.id}/edit`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </Link>
        )}
        <button
          onClick={() => setImportOpen(true)}
          className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          Import Documents
        </button>
        <button
          onClick={() => setActiveProfileId(profile.id)}
          disabled={isActive}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-400 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        >
          {isActive ? "Active" : "Switch to this"}
        </button>
      </div>

      <DocumentImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        defaultProfileId={profile.id}
      />
    </div>
  );
}
