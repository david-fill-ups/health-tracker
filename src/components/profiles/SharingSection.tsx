"use client";

import { useState, useEffect, useCallback } from "react";

interface Member {
  id: string;
  permission: "OWNER" | "WRITE" | "READ_ONLY";
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface Pending {
  id: string;
  email: string;
  permission: "OWNER" | "WRITE" | "READ_ONLY";
}

const PERMISSION_LABELS: Record<string, string> = {
  OWNER: "Owner",
  WRITE: "Edit",
  READ_ONLY: "View only",
};

const PERMISSION_COLORS: Record<string, string> = {
  OWNER: "bg-indigo-100 text-indigo-700",
  WRITE: "bg-green-100 text-green-700",
  READ_ONLY: "bg-gray-100 text-gray-600",
};

export function SharingSection({ profileId, currentUserId }: { profileId: string; currentUserId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"READ_ONLY" | "WRITE" | "OWNER">("READ_ONLY");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOwner = members.some((m) => m.user.id === currentUserId && m.permission === "OWNER");

  const load = useCallback(async () => {
    const res = await fetch(`/api/profiles/${profileId}/access`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      setPending(data.pending);
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setSharing(true);
    setError(null);
    setSuccess(null);

    const res = await fetch(`/api/profiles/${profileId}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, permission }),
    });

    setSharing(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }

    const result = await res.json();
    setSuccess(result.type === "invited" ? `Invitation sent to ${email}.` : `Access granted to ${email}.`);
    setEmail("");
    load();
  }

  async function handleRemove(targetUserId: string) {
    await fetch(`/api/profiles/${profileId}/access/${targetUserId}`, { method: "DELETE" });
    load();
  }

  async function handleCancelInvite(inviteEmail: string) {
    await fetch(`/api/profiles/${profileId}/access/${encodeURIComponent(inviteEmail)}?type=invitation`, {
      method: "DELETE",
    });
    load();
  }

  async function handleChangePermission(targetUserId: string, newPermission: string) {
    await fetch(`/api/profiles/${profileId}/access/${targetUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permission: newPermission }),
    });
    load();
  }

  if (loading) return null;

  return (
    <div className="border-t border-gray-100 pt-5 space-y-4">
      <p className="text-sm font-medium text-gray-700">People with access</p>

      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-gray-800">{m.user.name ?? m.user.email}</p>
              <p className="truncate text-xs text-gray-400">{m.user.email}</p>
            </div>
            {isOwner && m.user.id !== currentUserId ? (
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={m.permission}
                  onChange={(e) => handleChangePermission(m.user.id, e.target.value)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="READ_ONLY">View only</option>
                  <option value="WRITE">Edit</option>
                  <option value="OWNER">Owner</option>
                </select>
                <button
                  onClick={() => handleRemove(m.user.id)}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PERMISSION_COLORS[m.permission]}`}>
                {PERMISSION_LABELS[m.permission]}{m.user.id === currentUserId ? " (you)" : ""}
              </span>
            )}
          </li>
        ))}

        {pending.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex-1 min-w-0">
              <p className="truncate text-gray-500 italic">{inv.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                Pending · {PERMISSION_LABELS[inv.permission]}
              </span>
              {isOwner && (
                <button
                  onClick={() => handleCancelInvite(inv.email)}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isOwner && (
        <form onSubmit={handleShare} className="space-y-2 pt-1">
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}
          <div className="flex gap-2">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as typeof permission)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="READ_ONLY">View only</option>
              <option value="WRITE">Edit</option>
              <option value="OWNER">Owner</option>
            </select>
            <button
              type="submit"
              disabled={sharing}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {sharing ? "…" : "Share"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
