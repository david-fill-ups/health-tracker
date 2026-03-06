"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProfile } from "./ProfileProvider";

interface Profile {
  id: string;
  name: string;
}

export function ProfileSwitcher() {
  const { activeProfileId, setActiveProfileId } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data: Profile[]) => setProfiles(data))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <span className="text-base">👤</span>
        <span>{activeProfile?.name ?? "Select a profile"}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {profiles.length === 0 && (
            <p className="px-4 py-2 text-sm text-gray-400">No profiles yet</p>
          )}
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProfileId(p.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-gray-50 ${
                p.id === activeProfileId
                  ? "font-semibold text-indigo-700"
                  : "text-gray-700"
              }`}
            >
              {p.id === activeProfileId && (
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              )}
              {p.name}
            </button>
          ))}
          <div className="my-1 border-t border-gray-100" />
          <Link
            href="/profiles/new"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            + New Profile
          </Link>
        </div>
      )}
    </div>
  );
}
