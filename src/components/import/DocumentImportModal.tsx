"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/components/layout/ProfileProvider";
import { FileUploadStep } from "./FileUploadStep";
import { ProposalReviewStep } from "./ProposalReviewStep";
import type { ProposalItem, ImportProposal, ApplyResult } from "@/lib/ai-import/types";

type ModalState =
  | "file_selection"
  | "analyzing"
  | "review"
  | "applying"
  | "success";

interface Profile {
  id: string;
  name: string;
}

interface DocumentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected profile. If omitted, falls back to the active profile. */
  defaultProfileId?: string;
  /** When set, the modal is scoped to a specific visit (profile selector hidden). */
  visitId?: string;
  /** Date hint passed to Claude for context. */
  visitDate?: string;
}

export function DocumentImportModal({
  isOpen,
  onClose,
  defaultProfileId,
  visitId,
  visitDate,
}: DocumentImportModalProps) {
  const { activeProfileId } = useProfile();

  const [modalState, setModalState] = useState<ModalState>("file_selection");
  const [files, setFiles] = useState<File[]>([]);
  const [profileId, setProfileId] = useState<string>("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [proposal, setProposal] = useState<ImportProposal | null>(null);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRevising, setIsRevising] = useState(false);

  // Load profiles for selector
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data: Profile[]) => {
        setProfiles(data);
        // Determine starting profile
        const startId = defaultProfileId ?? activeProfileId ?? data[0]?.id ?? "";
        setProfileId(startId);
      })
      .catch(() => {});
  }, [isOpen, defaultProfileId, activeProfileId]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalState("file_selection");
      setFiles([]);
      setProposal(null);
      setItems([]);
      setApplyResult(null);
      setError(null);
      setIsRevising(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Analyze ──────────────────────────────────────────────────────────

  async function analyze(revisionFeedback?: string) {
    if (!profileId) return;
    setError(null);

    if (revisionFeedback) {
      setIsRevising(true);
    } else {
      setModalState("analyzing");
    }

    const form = new FormData();
    form.append("profileId", profileId);
    if (visitId) form.append("visitId", visitId);
    if (visitDate) form.append("context", `Visit date: ${visitDate}`);
    if (revisionFeedback) form.append("revisionFeedback", revisionFeedback);
    for (const file of files) form.append("files", file);

    try {
      const res = await fetch("/api/ai-import/analyze", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error ?? "Analysis failed");
      }
      const data: ImportProposal = await res.json();
      setProposal(data);
      // Default all items to "approved"
      setItems(data.items.map((item) => ({ ...item, status: "approved" as const })));
      setModalState("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to analyze documents");
      setModalState("file_selection");
    } finally {
      setIsRevising(false);
    }
  }

  // ── Apply ────────────────────────────────────────────────────────────

  async function apply() {
    const approved = items.filter((i) => i.status === "approved");
    if (approved.length === 0) return;
    setModalState("applying");
    setError(null);

    try {
      const res = await fetch("/api/ai-import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, items: approved }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error ?? "Apply failed");
      }
      const result: ApplyResult = await res.json();
      setApplyResult(result);
      setModalState("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
      setModalState("review");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────

  const title =
    modalState === "file_selection"
      ? "Import Documents"
      : modalState === "analyzing"
      ? "Analyzing…"
      : modalState === "review"
      ? "Review Proposed Changes"
      : modalState === "applying"
      ? "Saving Changes…"
      : "Import Complete";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (modalState !== "analyzing" && modalState !== "applying") onClose();
        }}
      />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-xl max-h-[90dvh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {modalState !== "analyzing" && modalState !== "applying" && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* File selection */}
          {(modalState === "file_selection" || modalState === "analyzing") && (
            <FileUploadStep
              files={files}
              profileId={profileId}
              profiles={profiles}
              isVisitContext={!!visitId}
              onFilesChange={setFiles}
              onProfileChange={setProfileId}
              onSubmit={() => analyze()}
              isLoading={modalState === "analyzing"}
            />
          )}

          {/* Analyzing spinner */}
          {modalState === "analyzing" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-700">Analyzing with Claude…</p>
              <p className="mt-1 text-xs text-gray-400">
                Extracting medical entities and checking for duplicates
              </p>
            </div>
          )}

          {/* Review */}
          {(modalState === "review") && proposal && (
            <ProposalReviewStep
              items={items}
              skippedCount={proposal.skippedCount}
              warnings={proposal.warnings}
              onItemsChange={setItems}
              onConfirm={apply}
              onRevise={analyze}
              isApplying={false}
              isRevising={isRevising}
            />
          )}

          {/* Applying spinner */}
          {modalState === "applying" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-700">Saving changes…</p>
            </div>
          )}

          {/* Success */}
          {modalState === "success" && applyResult && (
            <SuccessView result={applyResult} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Success view ───────────────────────────────────────────────────────────

const ENTITY_DISPLAY: Partial<Record<string, string>> = {
  facility: "Facilities",
  location: "Locations",
  doctor: "Providers",
  visit: "Visits",
  medication: "Medications",
  condition: "Conditions",
  allergy: "Allergies",
  vaccination: "Vaccinations",
  health_metric: "Health Metrics",
};

function SuccessView({ result, onClose }: { result: ApplyResult; onClose: () => void }) {
  const rows: { label: string; created: number; updated: number; merged: number }[] = [];

  const allKeys = new Set([
    ...Object.keys(result.created),
    ...Object.keys(result.updated),
    ...Object.keys(result.merged),
  ]);

  for (const key of allKeys) {
    const created = (result.created as Record<string, number>)[key] ?? 0;
    const updated = (result.updated as Record<string, number>)[key] ?? 0;
    const merged = (result.merged as Record<string, number>)[key] ?? 0;
    if (created + updated + merged > 0) {
      rows.push({ label: ENTITY_DISPLAY[key] ?? key, created, updated, merged });
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <p className="text-4xl">✅</p>
        <p className="mt-2 text-base font-semibold text-gray-900">Import complete</p>
        <p className="text-sm text-gray-500 mt-1">Your health records have been updated.</p>
      </div>

      {rows.length > 0 && (
        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
          {rows.map(({ label, created, updated, merged }) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-medium text-gray-700">{label}</span>
              <div className="flex gap-3 text-xs">
                {created > 0 && <span className="text-green-600">{created} added</span>}
                {updated > 0 && <span className="text-blue-600">{updated} updated</span>}
                {merged > 0 && <span className="text-amber-600">{merged} merged</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Done
      </button>
    </div>
  );
}
