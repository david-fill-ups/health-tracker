"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  profileId: string;
  profileName: string;
}

export function ProfileActions({ profileId, profileName }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

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

  function handleExport() {
    window.location.href = `/api/profiles/${profileId}/export`;
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const mode = prompt(
      "Import mode:\n• append — add all records\n• skip_duplicates — skip matching records\n• replace — delete existing data first",
      "skip_duplicates"
    );
    if (!mode || !["append", "skip_duplicates", "replace"].includes(mode)) {
      alert("Cancelled or invalid mode.");
      e.target.value = "";
      return;
    }
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch(`/api/profiles/${profileId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, data }),
      });
      const result = await res.json();
      if (res.ok) {
        const counts = result.imported as Record<string, number>;
        const summary = Object.entries(counts)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${v} ${k}`)
          .join(", ");
        setImportMsg(summary ? `Imported: ${summary}` : "Nothing new to import.");
        router.refresh();
      } else {
        setImportMsg(`Error: ${result.error}`);
      }
    } catch {
      setImportMsg("Failed to parse file.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExport}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Export data
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {importing ? "Importing…" : "Import data"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
      {importMsg && (
        <p className="text-xs text-gray-600">{importMsg}</p>
      )}
      <button
        onClick={handleDelete}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Delete profile
      </button>
    </div>
  );
}
