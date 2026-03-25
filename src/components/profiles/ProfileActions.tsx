"use client";

import { useRouter } from "next/navigation";

interface Props {
  profileId: string;
  profileName: string;
  isOwner: boolean;
}

export function ProfileActions({ profileId, profileName, isOwner }: Props) {
  const router = useRouter();

  if (!isOwner) return null;

  async function handleDelete() {
    if (!confirm(`Delete profile "${profileName}" and all its data? This cannot be undone.`)) return;
    const res = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/profiles");
      router.refresh();
    } else {
      alert("Failed to delete profile.");
    }
  }

  return (
    <div className="border-t border-gray-100 pt-4">
      <button
        onClick={handleDelete}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Delete profile
      </button>
    </div>
  );
}
