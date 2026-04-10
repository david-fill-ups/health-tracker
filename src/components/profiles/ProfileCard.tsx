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
            <a
              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Add to Google Calendar"
              className="shrink-0 rounded-md bg-white border border-gray-200 p-1 hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              {/* Google Calendar icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" fill="white" stroke="#dadce0" strokeWidth="1.5"/>
                <rect x="3" y="5" width="18" height="6" rx="2" fill="#4285F4"/>
                <rect x="3" y="8" width="18" height="3" fill="#4285F4"/>
                <line x1="8" y1="3" x2="8" y2="7" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
                <line x1="16" y1="3" x2="16" y2="7" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
                <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#4285F4"/>
                <rect x="10.5" y="13" width="3" height="3" rx="0.5" fill="#FBBC04"/>
                <rect x="14" y="13" width="3" height="3" rx="0.5" fill="#34A853"/>
              </svg>
            </a>
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
