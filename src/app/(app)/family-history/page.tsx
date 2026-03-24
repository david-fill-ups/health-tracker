"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useProfile } from "@/components/layout/ProfileProvider";
import { CardSkeleton } from "@/components/ui/Skeleton";

type FamilyRelationship = "PARENT" | "SIBLING" | "FATHER" | "MOTHER" | "BROTHER" | "SISTER" | "HALF_BROTHER" | "HALF_SISTER" | "GRANDFATHER" | "GRANDMOTHER" | "AUNT" | "UNCLE";
type FamilySide = "MATERNAL" | "PATERNAL";
type ProfileRelationshipType =
  | "SPOUSE"
  | "PARENT" | "CHILD" | "SIBLING" | "HALF_SIBLING"
  | "GRANDPARENT" | "GRANDCHILD" | "AUNT_UNCLE" | "NIECE_NEPHEW"
  | "STEP_PARENT" | "STEP_CHILD" | "IN_LAW"
  | "MOTHER" | "FATHER" | "DAUGHTER" | "SON"
  | "SISTER" | "BROTHER" | "HALF_SISTER" | "HALF_BROTHER"
  | "MATERNAL_GRANDMOTHER" | "MATERNAL_GRANDFATHER"
  | "PATERNAL_GRANDMOTHER" | "PATERNAL_GRANDFATHER"
  | "GRANDDAUGHTER" | "GRANDSON"
  | "MATERNAL_AUNT" | "MATERNAL_UNCLE" | "PATERNAL_AUNT" | "PATERNAL_UNCLE"
  | "NIECE" | "NEPHEW" | "COUSIN"
  | "STEP_MOTHER" | "STEP_FATHER" | "STEP_DAUGHTER" | "STEP_SON"
  | "STEP_SISTER" | "STEP_BROTHER"
  | "MOTHER_IN_LAW" | "FATHER_IN_LAW" | "DAUGHTER_IN_LAW" | "SON_IN_LAW"
  | "SISTER_IN_LAW" | "BROTHER_IN_LAW"
  | "OTHER";

const SIDE_APPLICABLE: FamilyRelationship[] = ["GRANDFATHER", "GRANDMOTHER", "AUNT", "UNCLE"];

interface FamilyCondition {
  id: string;
  name: string;
  notes: string | null;
}

interface LinkedCondition {
  id: string;
  name: string;
  status: string;
  notes: string | null;
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: FamilyRelationship;
  side: FamilySide | null;
  notes: string | null;
  conditions: FamilyCondition[];
}

interface InheritedFamilyMember {
  id: string;
  name: string;
  relationship: FamilyRelationship;
  side: FamilySide | null;
  notes: string | null;
  conditions: FamilyCondition[];
}

interface InheritedLinkedProfile {
  id: string;
  toProfileId: string;
  relationship: ProfileRelationshipType;
  biological: boolean;
  toProfile: { id: string; name: string };
  conditions: LinkedCondition[];
}

interface ProfileRelationship {
  id: string;
  toProfileId: string;
  relationship: ProfileRelationshipType;
  biological: boolean;
  toProfile: { id: string; name: string };
  conditions: LinkedCondition[];
  inherited: {
    familyMembers: InheritedFamilyMember[];
    linkedProfiles: InheritedLinkedProfile[];
  } | null;
}

type ChartItem =
  | { kind: "manual"; member: FamilyMember }
  | { kind: "linked"; rel: ProfileRelationship }
  | { kind: "derived"; key: string; name: string; profileId?: string; conditions: Array<{ name: string }>; via: string; label: string };

const MANUAL_BADGE: Record<FamilyRelationship, { label: string; classes: string }> = {
  // Legacy
  PARENT:      { label: "Parent",      classes: "bg-purple-100 text-purple-700" },
  SIBLING:     { label: "Sibling",     classes: "bg-blue-100 text-blue-700" },
  // Current — gendered
  FATHER:      { label: "Father",      classes: "bg-purple-100 text-purple-700" },
  MOTHER:      { label: "Mother",      classes: "bg-purple-100 text-purple-700" },
  BROTHER:     { label: "Brother",     classes: "bg-blue-100 text-blue-700" },
  SISTER:      { label: "Sister",      classes: "bg-blue-100 text-blue-700" },
  HALF_BROTHER:{ label: "Half-Brother",classes: "bg-blue-100 text-blue-700" },
  HALF_SISTER: { label: "Half-Sister", classes: "bg-blue-100 text-blue-700" },
  GRANDFATHER: { label: "Grandfather", classes: "bg-amber-100 text-amber-700" },
  GRANDMOTHER: { label: "Grandmother", classes: "bg-orange-100 text-orange-700" },
  AUNT:        { label: "Aunt",        classes: "bg-pink-100 text-pink-700" },
  UNCLE:       { label: "Uncle",       classes: "bg-teal-100 text-teal-700" },
};

const PROFILE_BADGE: Record<ProfileRelationshipType, { label: string; classes: string }> = {
  // Legacy
  PARENT:       { label: "Parent",          classes: "bg-purple-100 text-purple-700" },
  CHILD:        { label: "Child",           classes: "bg-indigo-100 text-indigo-700" },
  SIBLING:      { label: "Sibling",         classes: "bg-blue-100 text-blue-700" },
  HALF_SIBLING: { label: "Half-Sibling",    classes: "bg-blue-100 text-blue-700" },
  GRANDPARENT:  { label: "Grandparent",     classes: "bg-amber-100 text-amber-700" },
  GRANDCHILD:   { label: "Grandchild",      classes: "bg-amber-100 text-amber-700" },
  AUNT_UNCLE:   { label: "Aunt / Uncle",    classes: "bg-pink-100 text-pink-700" },
  NIECE_NEPHEW: { label: "Niece / Nephew",  classes: "bg-pink-100 text-pink-700" },
  STEP_PARENT:  { label: "Step-Parent",     classes: "bg-purple-100 text-purple-700" },
  STEP_CHILD:   { label: "Step-Child",      classes: "bg-indigo-100 text-indigo-700" },
  IN_LAW:       { label: "In-Law",          classes: "bg-gray-100 text-gray-600" },
  // Partner
  SPOUSE:            { label: "Spouse",             classes: "bg-gray-100 text-gray-600" },
  // Parents
  MOTHER:            { label: "Mother",             classes: "bg-purple-100 text-purple-700" },
  FATHER:            { label: "Father",             classes: "bg-purple-100 text-purple-700" },
  STEP_MOTHER:       { label: "Step-Mother",        classes: "bg-purple-100 text-purple-700" },
  STEP_FATHER:       { label: "Step-Father",        classes: "bg-purple-100 text-purple-700" },
  // Children
  DAUGHTER:          { label: "Daughter",           classes: "bg-indigo-100 text-indigo-700" },
  SON:               { label: "Son",                classes: "bg-indigo-100 text-indigo-700" },
  STEP_DAUGHTER:     { label: "Step-Daughter",      classes: "bg-indigo-100 text-indigo-700" },
  STEP_SON:          { label: "Step-Son",           classes: "bg-indigo-100 text-indigo-700" },
  // Siblings
  SISTER:            { label: "Sister",             classes: "bg-blue-100 text-blue-700" },
  BROTHER:           { label: "Brother",            classes: "bg-blue-100 text-blue-700" },
  HALF_SISTER:       { label: "Half-Sister",        classes: "bg-blue-100 text-blue-700" },
  HALF_BROTHER:      { label: "Half-Brother",       classes: "bg-blue-100 text-blue-700" },
  STEP_SISTER:       { label: "Step-Sister",        classes: "bg-blue-100 text-blue-700" },
  STEP_BROTHER:      { label: "Step-Brother",       classes: "bg-blue-100 text-blue-700" },
  // Grandparents
  MATERNAL_GRANDMOTHER: { label: "Maternal Grandmother", classes: "bg-amber-100 text-amber-700" },
  MATERNAL_GRANDFATHER: { label: "Maternal Grandfather", classes: "bg-amber-100 text-amber-700" },
  PATERNAL_GRANDMOTHER: { label: "Paternal Grandmother", classes: "bg-amber-100 text-amber-700" },
  PATERNAL_GRANDFATHER: { label: "Paternal Grandfather", classes: "bg-amber-100 text-amber-700" },
  // Grandchildren
  GRANDDAUGHTER:     { label: "Granddaughter",      classes: "bg-amber-100 text-amber-700" },
  GRANDSON:          { label: "Grandson",           classes: "bg-amber-100 text-amber-700" },
  // Aunts & Uncles
  MATERNAL_AUNT:     { label: "Maternal Aunt",      classes: "bg-pink-100 text-pink-700" },
  MATERNAL_UNCLE:    { label: "Maternal Uncle",     classes: "bg-pink-100 text-pink-700" },
  PATERNAL_AUNT:     { label: "Paternal Aunt",      classes: "bg-pink-100 text-pink-700" },
  PATERNAL_UNCLE:    { label: "Paternal Uncle",     classes: "bg-pink-100 text-pink-700" },
  // Nieces & Nephews
  NIECE:             { label: "Niece",              classes: "bg-pink-100 text-pink-700" },
  NEPHEW:            { label: "Nephew",             classes: "bg-pink-100 text-pink-700" },
  // Extended
  COUSIN:            { label: "Cousin",             classes: "bg-teal-100 text-teal-700" },
  // In-laws
  MOTHER_IN_LAW:     { label: "Mother-in-Law",      classes: "bg-gray-100 text-gray-600" },
  FATHER_IN_LAW:     { label: "Father-in-Law",      classes: "bg-gray-100 text-gray-600" },
  DAUGHTER_IN_LAW:   { label: "Daughter-in-Law",    classes: "bg-gray-100 text-gray-600" },
  SON_IN_LAW:        { label: "Son-in-Law",         classes: "bg-gray-100 text-gray-600" },
  SISTER_IN_LAW:     { label: "Sister-in-Law",      classes: "bg-gray-100 text-gray-600" },
  BROTHER_IN_LAW:    { label: "Brother-in-Law",     classes: "bg-gray-100 text-gray-600" },
  OTHER:             { label: "Other",              classes: "bg-gray-100 text-gray-600" },
};

const PROFILE_RELATIONSHIP_GROUPS = [
  { label: "Partner",       options: ["SPOUSE"] },
  { label: "Parents",       options: ["MOTHER", "FATHER", "STEP_MOTHER", "STEP_FATHER"] },
  { label: "Children",      options: ["DAUGHTER", "SON", "STEP_DAUGHTER", "STEP_SON"] },
  { label: "Siblings",      options: ["SISTER", "BROTHER", "HALF_SISTER", "HALF_BROTHER", "STEP_SISTER", "STEP_BROTHER"] },
  { label: "Grandparents",  options: ["MATERNAL_GRANDMOTHER", "MATERNAL_GRANDFATHER", "PATERNAL_GRANDMOTHER", "PATERNAL_GRANDFATHER"] },
  { label: "Grandchildren", options: ["GRANDDAUGHTER", "GRANDSON"] },
  { label: "Aunts & Uncles", options: ["MATERNAL_AUNT", "MATERNAL_UNCLE", "PATERNAL_AUNT", "PATERNAL_UNCLE"] },
  { label: "Nieces & Nephews", options: ["NIECE", "NEPHEW"] },
  { label: "Extended",      options: ["COUSIN"] },
  { label: "In-Laws",       options: ["MOTHER_IN_LAW", "FATHER_IN_LAW", "DAUGHTER_IN_LAW", "SON_IN_LAW", "SISTER_IN_LAW", "BROTHER_IN_LAW"] },
  { label: "Other",         options: ["OTHER"] },
] as const;

const NON_BIOLOGICAL_PROFILE_TYPES = new Set([
  "SPOUSE", "STEP_PARENT", "STEP_CHILD", "IN_LAW",
  "STEP_MOTHER", "STEP_FATHER", "STEP_DAUGHTER", "STEP_SON", "STEP_SISTER", "STEP_BROTHER",
  "MOTHER_IN_LAW", "FATHER_IN_LAW", "DAUGHTER_IN_LAW", "SON_IN_LAW", "SISTER_IN_LAW", "BROTHER_IN_LAW",
  "OTHER",
]);

const CHILD_RELATIONSHIP_TYPES: ProfileRelationshipType[] = [
  "DAUGHTER", "SON", "CHILD", "STEP_DAUGHTER", "STEP_SON", "STEP_CHILD",
];

const MANUAL_FILTER_OPTIONS: Array<{ value: FamilyRelationship | "ALL"; label: string }> = [
  { value: "ALL",          label: "All" },
  { value: "FATHER",       label: "Father" },
  { value: "MOTHER",       label: "Mother" },
  { value: "BROTHER",      label: "Brother" },
  { value: "SISTER",       label: "Sister" },
  { value: "GRANDFATHER",  label: "Grandfather" },
  { value: "GRANDMOTHER",  label: "Grandmother" },
  { value: "AUNT",         label: "Aunt" },
  { value: "UNCLE",        label: "Uncle" },
];

const BIOLOGICAL_DEFAULTS: Partial<Record<ProfileRelationshipType, boolean>> = {
  MOTHER: true, FATHER: true, DAUGHTER: true, SON: true,
  SISTER: true, BROTHER: true, HALF_SISTER: true, HALF_BROTHER: true,
  PARENT: true, CHILD: true, SIBLING: true, HALF_SIBLING: true,
  GRANDPARENT: true, GRANDCHILD: true, AUNT_UNCLE: true, NIECE_NEPHEW: true,
  MATERNAL_GRANDMOTHER: true, MATERNAL_GRANDFATHER: true,
  PATERNAL_GRANDMOTHER: true, PATERNAL_GRANDFATHER: true,
  GRANDDAUGHTER: true, GRANDSON: true,
  MATERNAL_AUNT: true, MATERNAL_UNCLE: true, PATERNAL_AUNT: true, PATERNAL_UNCLE: true,
  NIECE: true, NEPHEW: true, COUSIN: true,
};

function ConditionPills({ conditions, maxVisible = 5 }: { conditions: Array<{ name: string }>; maxVisible?: number }) {
  if (conditions.length === 0) {
    return <p className="text-xs text-gray-400 italic">No conditions recorded</p>;
  }
  const visible = conditions.slice(0, maxVisible);
  const extra = conditions.length - maxVisible;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {visible.map((c, i) => (
        <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {c.name}
        </span>
      ))}
      {extra > 0 && (
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
          +{extra} more
        </span>
      )}
    </div>
  );
}

function ChartCard({ member }: { member: FamilyMember }) {
  const badge = MANUAL_BADGE[member.relationship];
  const [expanded, setExpanded] = useState(false);
  const MAX_CONDITIONS = 4;
  const visible = expanded ? member.conditions : member.conditions.slice(0, MAX_CONDITIONS);
  const extra = member.conditions.length - MAX_CONDITIONS;
  return (
    <div className="w-44 shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
      <Link href={`/family-history/${member.id}/edit`} className="block mb-1.5">
        <div className="font-semibold text-gray-900 text-sm leading-tight hover:text-indigo-600">{member.name}</div>
      </Link>
      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${badge.classes}`}>
          {badge.label}
        </span>
      </div>
      <div className="border-t border-gray-100 pt-1.5">
        {member.conditions.length === 0 ? (
          <p className="text-xs text-gray-300 italic">No conditions</p>
        ) : (
          <>
            <ul className="space-y-0.5">
              {visible.map((c, i) => (
                <li key={i} className="text-xs text-gray-600 leading-tight">• {c.name}</li>
              ))}
            </ul>
            {extra > 0 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                +{extra} more
              </button>
            )}
            {expanded && (
              <button
                onClick={() => setExpanded(false)}
                className="mt-1 text-xs text-gray-400 hover:text-gray-600"
              >
                Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Strips "Maternal "/"Paternal " prefix — redundant when already inside a sided chart column. */
function shortLabel(label: string): string {
  return label.replace(/^(Maternal |Paternal )/, "");
}

function TreeConnector() {
  return (
    <div className="flex justify-center my-2">
      <div className="flex flex-col items-center">
        <div className="w-px h-5 bg-gray-300" />
        <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
          <path d="M1 1L7 7L13 1" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function LinkedChartCard({ rel }: { rel: ProfileRelationship }) {
  const badge = PROFILE_BADGE[rel.relationship];
  const [expanded, setExpanded] = useState(false);
  const MAX_CONDITIONS = 4;
  const visible = expanded ? rel.conditions : rel.conditions.slice(0, MAX_CONDITIONS);
  const extra = rel.conditions.length - MAX_CONDITIONS;
  return (
    <div className="w-44 shrink-0 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all">
      <Link href={`/profiles/${rel.toProfileId}`} className="block mb-1.5">
        <div className="font-semibold text-gray-900 text-sm leading-tight hover:text-indigo-600">{rel.toProfile.name}</div>
      </Link>
      <div className="flex flex-wrap gap-1 mb-2">
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${badge?.classes ?? "bg-gray-100 text-gray-600"}`}>
          {badge?.label ? shortLabel(badge.label) : rel.relationship}
        </span>
      </div>
      <div className="border-t border-indigo-100 pt-1.5">
        {rel.conditions.length === 0 ? (
          <p className="text-xs text-gray-300 italic">No conditions</p>
        ) : (
          <>
            <ul className="space-y-0.5">
              {visible.map((c, i) => (
                <li key={i} className="text-xs text-gray-600 leading-tight">• {c.name}</li>
              ))}
            </ul>
            {extra > 0 && !expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                +{extra} more
              </button>
            )}
            {expanded && (
              <button
                onClick={() => setExpanded(false)}
                className="mt-1 text-xs text-gray-400 hover:text-gray-600"
              >
                Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DerivedChartCard({ item }: { item: Extract<ChartItem, { kind: "derived" }> }) {
  const [expanded, setExpanded] = useState(false);
  const MAX_CONDITIONS = 4;
  const visible = expanded ? item.conditions : item.conditions.slice(0, MAX_CONDITIONS);
  const extra = item.conditions.length - MAX_CONDITIONS;
  return (
    <div className="w-44 shrink-0 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all">
      {item.profileId ? (
        <Link href={`/profiles/${item.profileId}`} className="block mb-1.5">
          <div className="font-semibold text-gray-900 text-sm leading-tight hover:text-indigo-600">{item.name}</div>
        </Link>
      ) : (
        <div className="font-semibold text-gray-900 text-sm leading-tight mb-1.5">{item.name}</div>
      )}
      <div className="flex flex-wrap gap-1 mb-2">
        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
          {item.label}
        </span>
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
          via {item.via}
        </span>
      </div>
      <div className="border-t border-indigo-100 pt-1.5">
        {item.conditions.length === 0 ? (
          <p className="text-xs text-gray-300 italic">No conditions</p>
        ) : (
          <>
            <ul className="space-y-0.5">
              {visible.map((c, i) => (
                <li key={i} className="text-xs text-gray-600 leading-tight">• {c.name}</li>
              ))}
            </ul>
            {extra > 0 && !expanded && (
              <button onClick={() => setExpanded(true)} className="mt-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                +{extra} more
              </button>
            )}
            {expanded && (
              <button onClick={() => setExpanded(false)} className="mt-1 text-xs text-gray-400 hover:text-gray-600">
                Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UnifiedChartCard({ item }: { item: ChartItem }) {
  if (item.kind === "manual") return <ChartCard member={item.member} />;
  if (item.kind === "linked") return <LinkedChartCard rel={item.rel} />;
  return <DerivedChartCard item={item} />;
}

function chartItemKey(item: ChartItem): string {
  if (item.kind === "manual") return `manual-${item.member.id}`;
  if (item.kind === "linked") return `linked-${item.rel.id}`;
  return item.key;
}

export default function FamilyHistoryPage() {
  const { activeProfileId } = useProfile();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [relationships, setRelationships] = useState<ProfileRelationship[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FamilyRelationship | "ALL">("ALL");
  const [sideFilter, setSideFilter] = useState<FamilySide | "ALL">("ALL");
  const [view, setView] = useState<"list" | "chart">("list");

  // Link profile form state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkProfileId, setLinkProfileId] = useState("");
  const [linkRelationship, setLinkRelationship] = useState<ProfileRelationshipType>("PARENT");
  const [linkBiological, setLinkBiological] = useState(true);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [expandedInherited, setExpandedInherited] = useState<Set<string>>(new Set());

  function toggleInherited(relId: string) {
    setExpandedInherited((prev) => {
      const next = new Set(prev);
      next.has(relId) ? next.delete(relId) : next.add(relId);
      return next;
    });
  }

  // Edit relationship state
  const [editingRelId, setEditingRelId] = useState<string | null>(null);
  const [editRelType, setEditRelType] = useState<ProfileRelationshipType>("PARENT");
  const [editBiological, setEditBiological] = useState(true);
  const [editingSaving, setEditingSaving] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/family-members?profileId=${activeProfileId}`).then((r) => r.json()),
      fetch(`/api/profile-relationships?profileId=${activeProfileId}&includeInherited=true`).then((r) => r.json()),
      fetch("/api/profiles").then((r) => r.json()),
    ])
      .then(([membersData, relsData, profilesData]) => {
        setMembers(Array.isArray(membersData) ? membersData : []);
        setRelationships(Array.isArray(relsData) ? relsData : []);
        setProfiles(Array.isArray(profilesData) ? profilesData : []);
      })
      .catch(() => setError("Failed to load family history"))
      .finally(() => setLoading(false));
  }, [activeProfileId]);

  const filteredMembers = members
    .filter((m) => filter === "ALL" || m.relationship === filter)
    .filter((m) => {
      if (sideFilter === "ALL") return true;
      const hasSide = SIDE_APPLICABLE.includes(m.relationship);
      if (!hasSide) return false;
      return m.side === sideFilter;
    });

  const hasSideApplicableMembers = members.some((m) => SIDE_APPLICABLE.includes(m.relationship));

  // Chart view groupings
  const chartGroups = useMemo(() => {
    // Manual entries
    const manualGrandparents = members.filter((m) => ["GRANDFATHER", "GRANDMOTHER"].includes(m.relationship));
    const manualExtended = members.filter((m) => ["AUNT", "UNCLE"].includes(m.relationship));
    const manualParents = members.filter((m) => ["PARENT", "FATHER", "MOTHER"].includes(m.relationship));
    const manualSiblings = members.filter((m) => ["SIBLING", "BROTHER", "SISTER", "HALF_BROTHER", "HALF_SISTER"].includes(m.relationship));

    // Linked profiles categorised by relationship
    const linkedChildren = relationships.filter((r) => CHILD_RELATIONSHIP_TYPES.includes(r.relationship));
    const linkedParents = relationships.filter((r) =>
      ["FATHER", "MOTHER", "PARENT"].includes(r.relationship) && r.biological
    );
    const linkedSiblings = relationships.filter((r) =>
      ["BROTHER", "SISTER", "SIBLING", "HALF_BROTHER", "HALF_SISTER", "HALF_SIBLING"].includes(r.relationship)
    );
    const linkedGrandparents = relationships.filter((r) =>
      ["MATERNAL_GRANDMOTHER", "MATERNAL_GRANDFATHER", "PATERNAL_GRANDMOTHER", "PATERNAL_GRANDFATHER", "GRANDPARENT"].includes(r.relationship)
    );
    const linkedExtended = relationships.filter((r) =>
      ["MATERNAL_AUNT", "MATERNAL_UNCLE", "PATERNAL_AUNT", "PATERNAL_UNCLE", "AUNT_UNCLE"].includes(r.relationship)
    );

    // Derived relatives from parents' inherited data (one level deep)
    const directProfileIds = new Set(relationships.map((r) => r.toProfileId));

    type DerivedEntry = { key: string; name: string; profileId?: string; conditions: Array<{ name: string }>; via: string; side: FamilySide | null; label: string };
    const derivedGrandparents: DerivedEntry[] = [];
    const derivedExtended: DerivedEntry[] = [];

    function gpLabel(rel: string): string {
      if (rel === "FATHER") return "Grandfather";
      if (rel === "MOTHER") return "Grandmother";
      return "Grandparent";
    }
    function extLabel(rel: string): string {
      if (rel === "BROTHER" || rel === "HALF_BROTHER") return "Uncle";
      if (rel === "SISTER" || rel === "HALF_SISTER") return "Aunt";
      return "Aunt / Uncle";
    }

    for (const parentRel of linkedParents) {
      if (!parentRel.inherited) continue;
      const side: FamilySide | null =
        parentRel.relationship === "FATHER" ? "PATERNAL" :
        parentRel.relationship === "MOTHER" ? "MATERNAL" : null;
      const via = parentRel.toProfile.name;

      // From parent's linked profiles (FATHER/MOTHER/PARENT → grandparent; siblings → aunt/uncle)
      for (const gp of parentRel.inherited.linkedProfiles) {
        if (directProfileIds.has(gp.toProfileId)) continue;
        if (["FATHER", "MOTHER", "PARENT"].includes(gp.relationship)) {
          derivedGrandparents.push({ key: `derived-lp-${gp.toProfileId}`, name: gp.toProfile.name, profileId: gp.toProfileId, conditions: gp.conditions, via, side, label: gpLabel(gp.relationship) });
        } else if (["BROTHER", "HALF_BROTHER", "SISTER", "HALF_SISTER", "SIBLING"].includes(gp.relationship)) {
          derivedExtended.push({ key: `derived-lp-${gp.toProfileId}`, name: gp.toProfile.name, profileId: gp.toProfileId, conditions: gp.conditions, via, side, label: extLabel(gp.relationship) });
        }
      }

      // From parent's manual family members — only PARENT/FATHER/MOTHER and SIBLING/BROTHER/SISTER
      // (GRANDFATHER/GRANDMOTHER/AUNT/UNCLE would be great-grandparents — skip)
      for (const fm of parentRel.inherited.familyMembers) {
        if (["PARENT", "FATHER", "MOTHER"].includes(fm.relationship)) {
          derivedGrandparents.push({ key: `derived-fm-${fm.id}`, name: fm.name, conditions: fm.conditions, via, side, label: gpLabel(fm.relationship) });
        } else if (["SIBLING", "BROTHER", "SISTER", "HALF_BROTHER", "HALF_SISTER"].includes(fm.relationship)) {
          derivedExtended.push({ key: `derived-fm-${fm.id}`, name: fm.name, conditions: fm.conditions, via, side, label: extLabel(fm.relationship) });
        }
      }
    }

    // Build ChartItem arrays
    const toManual = (m: FamilyMember): ChartItem => ({ kind: "manual", member: m });
    const toLinked = (r: ProfileRelationship): ChartItem => ({ kind: "linked", rel: r });
    const toDerived = (d: DerivedEntry): ChartItem => ({ kind: "derived", key: d.key, name: d.name, profileId: d.profileId, conditions: d.conditions, via: d.via, label: d.label });

    const maternalGrandparents: ChartItem[] = [
      ...manualGrandparents.filter((m) => m.side === "MATERNAL").map(toManual),
      ...linkedGrandparents.filter((r) => ["MATERNAL_GRANDMOTHER", "MATERNAL_GRANDFATHER"].includes(r.relationship)).map(toLinked),
      ...derivedGrandparents.filter((g) => g.side === "MATERNAL").map(toDerived),
    ];
    const paternalGrandparents: ChartItem[] = [
      ...manualGrandparents.filter((m) => m.side === "PATERNAL").map(toManual),
      ...linkedGrandparents.filter((r) => ["PATERNAL_GRANDMOTHER", "PATERNAL_GRANDFATHER"].includes(r.relationship)).map(toLinked),
      ...derivedGrandparents.filter((g) => g.side === "PATERNAL").map(toDerived),
    ];
    const unknownGrandparents: ChartItem[] = [
      ...manualGrandparents.filter((m) => !m.side).map(toManual),
      ...linkedGrandparents.filter((r) => r.relationship === "GRANDPARENT").map(toLinked),
      ...derivedGrandparents.filter((g) => !g.side).map(toDerived),
    ];
    const maternalExtended: ChartItem[] = [
      ...manualExtended.filter((m) => m.side === "MATERNAL").map(toManual),
      ...linkedExtended.filter((r) => ["MATERNAL_AUNT", "MATERNAL_UNCLE"].includes(r.relationship)).map(toLinked),
      ...derivedExtended.filter((e) => e.side === "MATERNAL").map(toDerived),
    ];
    const paternalExtended: ChartItem[] = [
      ...manualExtended.filter((m) => m.side === "PATERNAL").map(toManual),
      ...linkedExtended.filter((r) => ["PATERNAL_AUNT", "PATERNAL_UNCLE"].includes(r.relationship)).map(toLinked),
      ...derivedExtended.filter((e) => e.side === "PATERNAL").map(toDerived),
    ];
    const unknownExtended: ChartItem[] = [
      ...manualExtended.filter((m) => !m.side).map(toManual),
      ...linkedExtended.filter((r) => r.relationship === "AUNT_UNCLE").map(toLinked),
      ...derivedExtended.filter((e) => !e.side).map(toDerived),
    ];
    const parents: ChartItem[] = [
      ...manualParents.map(toManual),
      ...linkedParents.map(toLinked),
    ];
    const siblings: ChartItem[] = [
      ...manualSiblings.map(toManual),
      ...linkedSiblings.map(toLinked),
    ];

    return {
      maternalGrandparents,
      paternalGrandparents,
      unknownGrandparents,
      maternalExtended,
      paternalExtended,
      unknownExtended,
      parents,
      siblings,
      linkedChildren,
      hasGrandparents: maternalGrandparents.length > 0 || paternalGrandparents.length > 0 || unknownGrandparents.length > 0,
      hasExtended: maternalExtended.length > 0 || paternalExtended.length > 0 || unknownExtended.length > 0,
      hasChildren: linkedChildren.length > 0,
    };
  }, [members, relationships]);

  // Profiles available to link (not already linked, not the current profile)
  const linkedProfileIds = new Set(relationships.map((r) => r.toProfileId));
  const linkableProfiles = profiles.filter(
    (p) => p.id !== activeProfileId && !linkedProfileIds.has(p.id)
  );

  async function handleLinkProfile() {
    if (!activeProfileId || !linkProfileId) return;
    setLinking(true);
    setLinkError(null);
    try {
      const res = await fetch("/api/profile-relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: activeProfileId,
          linkedProfileId: linkProfileId,
          relationship: linkRelationship,
          biological: linkBiological,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setLinkError(data.error ?? "Failed to link profile");
        return;
      }
      const newRel: ProfileRelationship = await res.json();
      setRelationships((prev) => [...prev, newRel]);
      setShowLinkForm(false);
      setLinkProfileId("");
      setLinkRelationship("PARENT");
      setLinkBiological(true);
    } finally {
      setLinking(false);
    }
  }

  function startEditRel(rel: ProfileRelationship) {
    setEditingRelId(rel.id);
    setEditRelType(rel.relationship);
    setEditBiological(rel.biological);
  }

  async function saveEditRel(relId: string) {
    if (!activeProfileId) return;
    setEditingSaving(true);
    try {
      const res = await fetch(`/api/profile-relationships/${relId}?profileId=${activeProfileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfileId, relationship: editRelType, biological: editBiological }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      // Re-fetch to get updated conditions based on new biological flag
      const fresh = await fetch(`/api/profile-relationships?profileId=${activeProfileId}&includeInherited=true`).then((r) => r.json());
      setRelationships(Array.isArray(fresh) ? fresh : []);
      setEditingRelId(null);
    } finally {
      setEditingSaving(false);
    }
  }

  async function handleUnlinkProfile(relId: string) {
    if (!activeProfileId || !confirm("Remove this profile link?")) return;
    const res = await fetch(`/api/profile-relationships/${relId}?profileId=${activeProfileId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setRelationships((prev) => prev.filter((r) => r.id !== relId));
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Family History</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "list" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView("chart")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "chart" ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Chart
            </button>
          </div>
          <Link
            href="/family-history/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + Add Family Member
          </Link>
        </div>
      </div>

      {!activeProfileId && (
        <p className="text-sm text-gray-500">Select a profile to view family history.</p>
      )}

      {loading && <CardSkeleton count={3} />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {activeProfileId && !loading && (
        <>
          {/* ── Linked Profiles (list view only) ─────────────────────────────── */}
          {view === "list" && <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-700">Linked Profiles</h2>
              {linkableProfiles.length > 0 && (
                <button
                  onClick={() => { setShowLinkForm(!showLinkForm); setLinkError(null); }}
                  className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  {showLinkForm ? "Cancel" : "Link Profile"}
                </button>
              )}
            </div>

            {showLinkForm && (
              <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                <p className="text-sm font-medium text-gray-700">Link a profile as a family member</p>
                {linkError && (
                  <p className="text-xs text-red-600">{linkError}</p>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Profile</label>
                    <select
                      value={linkProfileId}
                      onChange={(e) => setLinkProfileId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select profile…</option>
                      {linkableProfiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
                    <select
                      value={linkRelationship}
                      onChange={(e) => {
                        const val = e.target.value as ProfileRelationshipType;
                        setLinkRelationship(val);
                        setLinkBiological(BIOLOGICAL_DEFAULTS[val] ?? false);
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {PROFILE_RELATIONSHIP_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.options.map((r) => (
                            <option key={r} value={r}>{PROFILE_BADGE[r as ProfileRelationshipType]?.label ?? r}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  {!NON_BIOLOGICAL_PROFILE_TYPES.has(linkRelationship) && (
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={linkBiological}
                          onChange={(e) => setLinkBiological(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Biological relationship
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Biological relationships surface the linked profile&apos;s conditions as family history.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleLinkProfile}
                    disabled={linking || !linkProfileId}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {linking ? "Linking…" : "Link Profile"}
                  </button>
                </div>
              </div>
            )}

            {relationships.length === 0 && !showLinkForm ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
                <p className="text-sm text-gray-500 mb-2">No profiles linked yet.</p>
                {linkableProfiles.length > 0 ? (
                  <button
                    onClick={() => setShowLinkForm(true)}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Link a profile
                  </button>
                ) : (
                  <p className="text-xs text-gray-400">Add more profiles to link them here.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {relationships.map((rel) => {
                  const badge = PROFILE_BADGE[rel.relationship];
                  const isEditing = editingRelId === rel.id;
                  return (
                    <div key={rel.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
                              <select
                                value={editRelType}
                                onChange={(e) => {
                                  const val = e.target.value as ProfileRelationshipType;
                                  setEditRelType(val);
                                  setEditBiological(BIOLOGICAL_DEFAULTS[val] ?? false);
                                }}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                {PROFILE_RELATIONSHIP_GROUPS.map((group) => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.options.map((r) => (
                                      <option key={r} value={r}>{PROFILE_BADGE[r as ProfileRelationshipType]?.label ?? r}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            {!NON_BIOLOGICAL_PROFILE_TYPES.has(editRelType) && (
                              <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={editBiological}
                                    onChange={(e) => setEditBiological(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  Biological relationship
                                </label>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEditRel(rel.id)}
                              disabled={editingSaving}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {editingSaving ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingRelId(null)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{rel.toProfile.name}</span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge?.classes ?? "bg-gray-100 text-gray-600"}`}>
                                {badge?.label ?? rel.relationship}
                              </span>
                              {rel.biological && (
                                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 border border-green-200">
                                  biological
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditRel(rel)}
                                className="text-xs text-gray-500 hover:text-indigo-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleUnlinkProfile(rel.id)}
                                className="text-xs text-red-400 hover:text-red-600"
                              >
                                Unlink
                              </button>
                            </div>
                          </div>
                          {rel.biological ? (
                            rel.conditions.length > 0 ? (
                              <ConditionPills conditions={rel.conditions} />
                            ) : (
                              <p className="mt-2 text-xs text-gray-400 italic">No conditions on record</p>
                            )
                          ) : (
                            <p className="mt-2 text-xs text-gray-400 italic">
                              Non-biological — conditions not surfaced
                            </p>
                          )}
                          {rel.biological && rel.inherited && (() => {
                            const dedupedLinked = rel.inherited.linkedProfiles.filter(
                              (p) => !linkedProfileIds.has(p.toProfileId)
                            );
                            const total = rel.inherited.familyMembers.length + dedupedLinked.length;
                            if (total === 0) return null;
                            const isOpen = expandedInherited.has(rel.id);
                            return (
                              <div className="mt-3 border-t border-gray-100 pt-3">
                                <button
                                  onClick={() => toggleInherited(rel.id)}
                                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                  Family of {rel.toProfile.name} · {total} {total === 1 ? "relative" : "relatives"}
                                </button>
                                {isOpen && (
                                  <div className="mt-2 pl-4 space-y-3 border-l-2 border-indigo-100">
                                    {rel.inherited.familyMembers.map((fm) => {
                                      const fmBadge = MANUAL_BADGE[fm.relationship];
                                      return (
                                        <div key={fm.id}>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-gray-700">{fm.name}</span>
                                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${fmBadge?.classes ?? "bg-gray-100 text-gray-600"}`}>
                                              {fmBadge?.label ?? fm.relationship}
                                            </span>
                                            {fm.side && (
                                              <span className="text-xs text-gray-400">
                                                {fm.side === "MATERNAL" ? "Maternal" : "Paternal"}
                                              </span>
                                            )}
                                          </div>
                                          <ConditionPills conditions={fm.conditions} />
                                        </div>
                                      );
                                    })}
                                    {dedupedLinked.map((lp) => {
                                      const lpBadge = PROFILE_BADGE[lp.relationship];
                                      return (
                                        <div key={lp.id}>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Link href={`/profiles/${lp.toProfileId}`} className="text-sm font-medium text-gray-700 hover:text-indigo-600 hover:underline">
                                              {lp.toProfile.name}
                                            </Link>
                                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${lpBadge?.classes ?? "bg-gray-100 text-gray-600"}`}>
                                              {lpBadge?.label ?? lp.relationship}
                                            </span>
                                            {lp.biological && (
                                              <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-600 border border-green-200">
                                                bio
                                              </span>
                                            )}
                                          </div>
                                          {lp.biological ? (
                                            <ConditionPills conditions={lp.conditions} />
                                          ) : (
                                            <p className="text-xs text-gray-400 italic">Non-biological — conditions not surfaced</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>}

          {/* ── Chart / Manual Entries ────────────────────────────────────────── */}
          <section>
            {view === "list" && (
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-700">Manual Entries</h2>
              </div>
            )}

            {view === "chart" ? (
              /* ── Chart view ─────────────────────────────────────────────── */
              !chartGroups.hasGrandparents && !chartGroups.hasExtended && chartGroups.parents.length === 0 && chartGroups.siblings.length === 0 && !chartGroups.hasChildren ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <p className="text-gray-500 mb-3">No family members added yet.</p>
                  <Link
                    href="/family-history/new"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    + Add your first family member
                  </Link>
                </div>
              ) : (
              <div className="space-y-0">
                {/* Grandparents row */}
                {chartGroups.hasGrandparents && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Grandparents
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                      <div className={`rounded-xl p-3 min-h-[80px] ${
                        chartGroups.maternalGrandparents.length > 0
                          ? "bg-rose-50/60 border border-rose-100"
                          : "bg-gray-50/50 border border-dashed border-gray-200"
                      }`}>
                        <div className="text-xs font-medium text-rose-400 mb-2">Maternal</div>
                        <div className="flex flex-wrap gap-2">
                          {chartGroups.maternalGrandparents.map((item) => <UnifiedChartCard key={chartItemKey(item)} item={item} />)}
                          {chartGroups.maternalGrandparents.length === 0 && (
                            <p className="text-xs text-gray-300 italic">None recorded</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 pt-6 min-w-0">
                        {chartGroups.unknownGrandparents.map((item) => <UnifiedChartCard key={chartItemKey(item)} item={item} />)}
                        {chartGroups.unknownGrandparents.length === 0 && (
                          <div className="w-px h-8 bg-gray-200" />
                        )}
                      </div>
                      <div className={`rounded-xl p-3 min-h-[80px] ${
                        chartGroups.paternalGrandparents.length > 0
                          ? "bg-sky-50/60 border border-sky-100"
                          : "bg-gray-50/50 border border-dashed border-gray-200"
                      }`}>
                        <div className="text-xs font-medium text-sky-400 mb-2">Paternal</div>
                        <div className="flex flex-wrap gap-2">
                          {chartGroups.paternalGrandparents.map((item) => <UnifiedChartCard key={chartItemKey(item)} item={item} />)}
                          {chartGroups.paternalGrandparents.length === 0 && (
                            <p className="text-xs text-gray-300 italic">None recorded</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {(chartGroups.hasExtended || chartGroups.parents.length > 0 || chartGroups.siblings.length > 0) && <TreeConnector />}
                  </>
                )}

                {/* Extended family row */}
                {chartGroups.hasExtended && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Extended Family
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                      <div className={`rounded-xl p-3 min-h-[80px] ${
                        chartGroups.maternalExtended.length > 0
                          ? "bg-rose-50/60 border border-rose-100"
                          : "bg-gray-50/50 border border-dashed border-gray-200"
                      }`}>
                        <div className="text-xs font-medium text-rose-400 mb-2">Maternal</div>
                        <div className="flex flex-wrap gap-2">
                          {chartGroups.maternalExtended.map((item) => <UnifiedChartCard key={chartItemKey(item)} item={item} />)}
                          {chartGroups.maternalExtended.length === 0 && (
                            <p className="text-xs text-gray-300 italic">None recorded</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 pt-6 min-w-0">
                        {chartGroups.unknownExtended.map((item) => <UnifiedChartCard key={chartItemKey(item)} item={item} />)}
                        {chartGroups.unknownExtended.length === 0 && (
                          <div className="w-px h-8 bg-gray-200" />
                        )}
                      </div>
                      <div className={`rounded-xl p-3 min-h-[80px] ${
                        chartGroups.paternalExtended.length > 0
                          ? "bg-sky-50/60 border border-sky-100"
                          : "bg-gray-50/50 border border-dashed border-gray-200"
                      }`}>
                        <div className="text-xs font-medium text-sky-400 mb-2">Paternal</div>
                        <div className="flex flex-wrap gap-2">
                          {chartGroups.paternalExtended.map((item) => <UnifiedChartCard key={chartItemKey(item)} item={item} />)}
                          {chartGroups.paternalExtended.length === 0 && (
                            <p className="text-xs text-gray-300 italic">None recorded</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {(chartGroups.parents.length > 0 || chartGroups.siblings.length > 0) && <TreeConnector />}
                  </>
                )}

                {/* Parents row */}
                {chartGroups.parents.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Parents
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {chartGroups.parents.map((item) => <UnifiedChartCard key={chartItemKey(item)} item={item} />)}
                    </div>
                    {chartGroups.siblings.length > 0 && <TreeConnector />}
                  </>
                )}

                {/* Siblings row */}
                {chartGroups.siblings.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Siblings
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {chartGroups.siblings.map((item) => <UnifiedChartCard key={chartItemKey(item)} item={item} />)}
                    </div>
                    {chartGroups.hasChildren && <TreeConnector />}
                  </>
                )}

                {/* Children row */}
                {chartGroups.hasChildren && (
                  <>
                    {!chartGroups.siblings.length && <TreeConnector />}
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Children
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {chartGroups.linkedChildren.map((rel) => <LinkedChartCard key={rel.id} rel={rel} />)}
                    </div>
                  </>
                )}
              </div>
              )
            ) : members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
                <p className="text-gray-500 mb-3">No family members added yet.</p>
                <Link
                  href="/family-history/new"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  + Add your first family member
                </Link>
              </div>
            ) : (
              /* ── List view ──────────────────────────────────────────────── */
              <>
                {/* Filter bar */}
                <div className="space-y-2 mb-4">
                  <div className="flex flex-wrap gap-2">
                    {MANUAL_FILTER_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setFilter(value)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                          filter === value
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {hasSideApplicableMembers && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">Side:</span>
                      {(["ALL", "MATERNAL", "PATERNAL"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSideFilter(s)}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                            sideFilter === s
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                          }`}
                        >
                          {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {filteredMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No entries for this relationship type.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredMembers.map((member) => {
                      const badge = MANUAL_BADGE[member.relationship];
                      return (
                        <div key={member.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/family-history/${member.id}/edit`}
                              className="font-semibold text-gray-900 hover:text-indigo-600 hover:underline"
                            >
                              {member.name}
                            </Link>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
                              {badge.label}
                            </span>
                            {SIDE_APPLICABLE.includes(member.relationship) && member.side && (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600 border border-rose-200">
                                {member.side === "MATERNAL" ? "Maternal" : "Paternal"}
                              </span>
                            )}
                          </div>
                          {member.notes && (
                            <p className="mt-1 text-sm text-gray-500">{member.notes}</p>
                          )}
                          <ConditionPills conditions={member.conditions} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
