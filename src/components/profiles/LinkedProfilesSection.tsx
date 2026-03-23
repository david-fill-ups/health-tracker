"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Relationship {
  id: string;
  relationship: string;
  biological: boolean;
  toProfile: { id: string; name: string };
}

interface Profile {
  id: string;
  name: string;
  isOwnerProfile: boolean;
}

// Types where biological is meaningless — hide the checkbox entirely
const NON_BIOLOGICAL_TYPES = new Set([
  "SPOUSE",
  "STEP_PARENT", "STEP_CHILD", "STEP_MOTHER", "STEP_FATHER",
  "STEP_DAUGHTER", "STEP_SON", "STEP_SISTER", "STEP_BROTHER",
  "IN_LAW", "MOTHER_IN_LAW", "FATHER_IN_LAW",
  "DAUGHTER_IN_LAW", "SON_IN_LAW", "SISTER_IN_LAW", "BROTHER_IN_LAW",
  "OTHER",
]);

const BIOLOGICAL_DEFAULTS: Record<string, boolean> = {
  // Legacy
  PARENT: true, CHILD: true, SIBLING: true, HALF_SIBLING: true,
  GRANDPARENT: true, GRANDCHILD: true, AUNT_UNCLE: true, NIECE_NEPHEW: true, COUSIN: true,
  // Current
  MOTHER: true, FATHER: true, DAUGHTER: true, SON: true,
  SISTER: true, BROTHER: true, HALF_SISTER: true, HALF_BROTHER: true,
  MATERNAL_GRANDMOTHER: true, MATERNAL_GRANDFATHER: true,
  PATERNAL_GRANDMOTHER: true, PATERNAL_GRANDFATHER: true,
  GRANDDAUGHTER: true, GRANDSON: true,
  MATERNAL_AUNT: true, MATERNAL_UNCLE: true,
  PATERNAL_AUNT: true, PATERNAL_UNCLE: true,
  NIECE: true, NEPHEW: true,
};

// Labels for display (covers both legacy and current values)
const RELATIONSHIP_LABELS: Record<string, string> = {
  // Legacy (may appear in existing records)
  SPOUSE: "Spouse", PARENT: "Parent", CHILD: "Child", SIBLING: "Sibling",
  HALF_SIBLING: "Half-Sibling", GRANDPARENT: "Grandparent", GRANDCHILD: "Grandchild",
  AUNT_UNCLE: "Aunt / Uncle", NIECE_NEPHEW: "Niece / Nephew", COUSIN: "Cousin",
  STEP_PARENT: "Step-Parent", STEP_CHILD: "Step-Child", IN_LAW: "In-Law",
  // Current
  MOTHER: "Mother", FATHER: "Father",
  DAUGHTER: "Daughter", SON: "Son",
  SISTER: "Sister", BROTHER: "Brother",
  HALF_SISTER: "Half-Sister", HALF_BROTHER: "Half-Brother",
  MATERNAL_GRANDMOTHER: "Maternal Grandmother", MATERNAL_GRANDFATHER: "Maternal Grandfather",
  PATERNAL_GRANDMOTHER: "Paternal Grandmother", PATERNAL_GRANDFATHER: "Paternal Grandfather",
  GRANDDAUGHTER: "Granddaughter", GRANDSON: "Grandson",
  MATERNAL_AUNT: "Maternal Aunt", MATERNAL_UNCLE: "Maternal Uncle",
  PATERNAL_AUNT: "Paternal Aunt", PATERNAL_UNCLE: "Paternal Uncle",
  NIECE: "Niece", NEPHEW: "Nephew",
  STEP_MOTHER: "Step-Mother", STEP_FATHER: "Step-Father",
  STEP_DAUGHTER: "Step-Daughter", STEP_SON: "Step-Son",
  STEP_SISTER: "Step-Sister", STEP_BROTHER: "Step-Brother",
  MOTHER_IN_LAW: "Mother-in-Law", FATHER_IN_LAW: "Father-in-Law",
  DAUGHTER_IN_LAW: "Daughter-in-Law", SON_IN_LAW: "Son-in-Law",
  SISTER_IN_LAW: "Sister-in-Law", BROTHER_IN_LAW: "Brother-in-Law",
  OTHER: "Other",
};

// Grouped options for the dropdown (new specific values only)
const RELATIONSHIP_GROUPS = [
  {
    label: "Partner",
    options: ["SPOUSE"],
  },
  {
    label: "Parents",
    options: ["MOTHER", "FATHER", "STEP_MOTHER", "STEP_FATHER"],
  },
  {
    label: "Children",
    options: ["DAUGHTER", "SON", "STEP_DAUGHTER", "STEP_SON"],
  },
  {
    label: "Siblings",
    options: ["SISTER", "BROTHER", "HALF_SISTER", "HALF_BROTHER", "STEP_SISTER", "STEP_BROTHER"],
  },
  {
    label: "Grandparents",
    options: [
      "MATERNAL_GRANDMOTHER", "MATERNAL_GRANDFATHER",
      "PATERNAL_GRANDMOTHER", "PATERNAL_GRANDFATHER",
    ],
  },
  {
    label: "Grandchildren",
    options: ["GRANDDAUGHTER", "GRANDSON"],
  },
  {
    label: "Aunts & Uncles",
    options: ["MATERNAL_AUNT", "MATERNAL_UNCLE", "PATERNAL_AUNT", "PATERNAL_UNCLE"],
  },
  {
    label: "Nieces & Nephews",
    options: ["NIECE", "NEPHEW"],
  },
  {
    label: "Extended",
    options: ["COUSIN"],
  },
  {
    label: "In-Laws",
    options: [
      "MOTHER_IN_LAW", "FATHER_IN_LAW",
      "DAUGHTER_IN_LAW", "SON_IN_LAW",
      "SISTER_IN_LAW", "BROTHER_IN_LAW",
    ],
  },
  {
    label: "Other",
    options: ["OTHER"],
  },
];

function bioDefault(rel: string) {
  return BIOLOGICAL_DEFAULTS[rel] ?? false;
}

function showBio(rel: string) {
  return !NON_BIOLOGICAL_TYPES.has(rel);
}

function RelationshipSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {RELATIONSHIP_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((v) => (
            <option key={v} value={v}>
              {RELATIONSHIP_LABELS[v]}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function LinkedProfilesSection({
  profileId,
  profileName,
  isOwner,
}: {
  profileId: string;
  profileName: string;
  isOwner: boolean;
}) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [ownProfile, setOwnProfile] = useState<Profile | null>(null);
  const [myRelationship, setMyRelationship] = useState<Relationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRel, setEditRel] = useState("MOTHER");
  const [editBio, setEditBio] = useState(true);
  const [addProfileId, setAddProfileId] = useState("");
  const [addRel, setAddRel] = useState("DAUGHTER");
  const [addBio, setAddBio] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // My relationship state
  const [myRelType, setMyRelType] = useState("SPOUSE");
  const [myRelBio, setMyRelBio] = useState(false);
  const [myRelEditing, setMyRelEditing] = useState(false);
  const [savingMyRel, setSavingMyRel] = useState(false);
  const [myRelError, setMyRelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [relsRes, profilesRes] = await Promise.all([
      fetch(`/api/profile-relationships?profileId=${profileId}`),
      fetch("/api/profiles"),
    ]);
    if (relsRes.ok) setRelationships(await relsRes.json());

    if (profilesRes.ok) {
      const profiles: Profile[] = await profilesRes.json();
      setAllProfiles(profiles);
      const own = profiles.find((p) => p.isOwnerProfile) ?? null;
      setOwnProfile(own);

      if (own && own.id !== profileId) {
        const ownRelsRes = await fetch(`/api/profile-relationships?profileId=${own.id}`);
        if (ownRelsRes.ok) {
          const ownRels: Relationship[] = await ownRelsRes.json();
          const myRel = ownRels.find((r) => r.toProfile.id === profileId) ?? null;
          setMyRelationship(myRel);
          if (myRel) {
            setMyRelType(myRel.relationship);
            setMyRelBio(myRel.biological);
          }
        }
      }
    }

    setLoading(false);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const linkedIds = new Set(relationships.map((r) => r.toProfile.id));
  const availableToLink = allProfiles.filter((p) => p.id !== profileId && !linkedIds.has(p.id));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile-relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        linkedProfileId: addProfileId,
        relationship: addRel,
        biological: showBio(addRel) ? addBio : false,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to link profile.");
      return;
    }
    setIsAdding(false);
    setAddProfileId("");
    setAddRel("DAUGHTER");
    setAddBio(true);
    load();
  }

  function startEdit(rel: Relationship) {
    setEditingId(rel.id);
    setEditRel(rel.relationship);
    setEditBio(rel.biological);
  }

  async function handleSaveEdit(relId: string) {
    await fetch(`/api/profile-relationships/${relId}?profileId=${profileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        relationship: editRel,
        biological: showBio(editRel) ? editBio : false,
      }),
    });
    setEditingId(null);
    load();
  }

  async function handleUnlink(relId: string) {
    await fetch(`/api/profile-relationships/${relId}?profileId=${profileId}`, { method: "DELETE" });
    load();
  }

  async function handleSaveMyRel(e: React.FormEvent) {
    e.preventDefault();
    if (!ownProfile) return;
    setSavingMyRel(true);
    setMyRelError(null);
    const bio = showBio(myRelType) ? myRelBio : false;

    if (myRelationship) {
      await fetch(`/api/profile-relationships/${myRelationship.id}?profileId=${ownProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: ownProfile.id, relationship: myRelType, biological: bio }),
      });
    } else {
      const res = await fetch("/api/profile-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: ownProfile.id,
          linkedProfileId: profileId,
          relationship: myRelType,
          biological: bio,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMyRelError(data.error ?? "Failed to save.");
        setSavingMyRel(false);
        return;
      }
    }

    setSavingMyRel(false);
    setMyRelEditing(false);
    load();
  }

  async function handleRemoveMyRel() {
    if (!myRelationship || !ownProfile) return;
    await fetch(`/api/profile-relationships/${myRelationship.id}?profileId=${ownProfile.id}`, {
      method: "DELETE",
    });
    setMyRelationship(null);
    setMyRelEditing(false);
    load();
  }

  if (loading) return null;
  if (!isOwner && relationships.length === 0 && !myRelationship && !ownProfile) return null;

  const showMyRelSection = ownProfile && ownProfile.id !== profileId;
  const selectClass = "rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="border-t border-gray-100 pt-5 space-y-3">
      <p className="text-sm font-medium text-gray-700">Family Connections</p>

      {relationships.length === 0 ? (
        <p className="text-sm text-gray-400">No connections linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {relationships.map((rel) =>
            editingId === rel.id ? (
              <li key={rel.id} className="flex items-center gap-2 text-sm flex-wrap">
                <RelationshipSelect
                  value={editRel}
                  onChange={(v) => { setEditRel(v); setEditBio(bioDefault(v)); }}
                  className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {showBio(editRel) && (
                  <label className="flex items-center gap-1 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={editBio}
                      onChange={(e) => setEditBio(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600"
                    />
                    Biological
                  </label>
                )}
                <button
                  onClick={() => handleSaveEdit(rel.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </li>
            ) : (
              <li key={rel.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={`/profiles/${rel.toProfile.id}`}
                    className="font-medium text-indigo-600 hover:underline truncate"
                  >
                    {rel.toProfile.name}
                  </Link>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {RELATIONSHIP_LABELS[rel.relationship] ?? rel.relationship}
                  </span>
                  {rel.biological && showBio(rel.relationship) && (
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
                      Biological
                    </span>
                  )}
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(rel)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Edit</button>
                    <button onClick={() => handleUnlink(rel.id)} className="text-xs text-gray-400 hover:text-red-600 transition-colors">Unlink</button>
                  </div>
                )}
              </li>
            )
          )}
        </ul>
      )}

      {isOwner && (
        <div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          {isAdding ? (
            <form onSubmit={handleAdd} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <select
                value={addProfileId}
                onChange={(e) => setAddProfileId(e.target.value)}
                required
                className={`w-full ${selectClass}`}
              >
                <option value="">Select a profile…</option>
                {availableToLink.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="flex gap-2 items-center">
                <RelationshipSelect
                  value={addRel}
                  onChange={(v) => { setAddRel(v); setAddBio(bioDefault(v)); }}
                  className={`flex-1 ${selectClass}`}
                />
                {showBio(addRel) && (
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 shrink-0">
                    <input
                      type="checkbox"
                      checked={addBio}
                      onChange={(e) => setAddBio(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Biological
                  </label>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !addProfileId}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "…" : "Link"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setError(null); }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : availableToLink.length > 0 ? (
            <button
              onClick={() => setIsAdding(true)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              + Add connection
            </button>
          ) : (
            <p className="text-xs text-gray-400">
              {allProfiles.length <= 1
                ? "No other profiles available to link."
                : "All accessible profiles are already linked."}
            </p>
          )}
        </div>
      )}

      {/* My relationship to this profile (from the user's own profile perspective) */}
      {showMyRelSection && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">My relationship to {profileName}</p>
          {myRelEditing ? (
            <form onSubmit={handleSaveMyRel} className="space-y-2 rounded-lg border border-gray-200 p-3">
              {myRelError && <p className="text-xs text-red-600">{myRelError}</p>}
              <div className="flex gap-2 items-center">
                <RelationshipSelect
                  value={myRelType}
                  onChange={(v) => { setMyRelType(v); setMyRelBio(bioDefault(v)); }}
                  className={`flex-1 ${selectClass}`}
                />
                {showBio(myRelType) && (
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 shrink-0">
                    <input
                      type="checkbox"
                      checked={myRelBio}
                      onChange={(e) => setMyRelBio(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Biological
                  </label>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingMyRel}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {savingMyRel ? "…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMyRelEditing(false);
                    setMyRelError(null);
                    if (myRelationship) { setMyRelType(myRelationship.relationship); setMyRelBio(myRelationship.biological); }
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                {myRelationship && (
                  <button
                    type="button"
                    onClick={handleRemoveMyRel}
                    className="ml-auto text-xs text-gray-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </form>
          ) : myRelationship ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {RELATIONSHIP_LABELS[myRelationship.relationship] ?? myRelationship.relationship}
              </span>
              {myRelationship.biological && showBio(myRelationship.relationship) && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">Biological</span>
              )}
              <button
                onClick={() => setMyRelEditing(true)}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              onClick={() => setMyRelEditing(true)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              + Set my relationship
            </button>
          )}
        </div>
      )}
    </div>
  );
}
