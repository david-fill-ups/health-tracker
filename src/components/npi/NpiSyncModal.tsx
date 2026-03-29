"use client";

import { useState, useEffect } from "react";
import type { NpiResult } from "@/lib/npi";

interface SyncField {
  key: string;
  label: string;
  current: string;
  incoming: string;
}

interface Props {
  npiNumber: string;
  entityType: "individual" | "organization";
  currentValues: Record<string, string>;
  onApply: (accepted: Record<string, string>, npiLastSynced: Date) => void;
  onClose: () => void;
}

export function NpiSyncModal({ npiNumber, entityType, currentValues, onApply, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<SyncField[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchNpi() {
      try {
        const params = new URLSearchParams({ q: npiNumber, type: entityType });
        const res = await fetch(`/api/npi?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Lookup failed");
        }
        const data = await res.json();
        const result: NpiResult | undefined = data.results?.[0];
        if (!result) {
          setError("No NPI record found for this number.");
          return;
        }

        const incoming: Record<string, string> =
          result.type === "individual"
            ? {
                name: result.name,
                specialty: result.specialty,
                phone: result.phone,
                credential: result.credential,
              }
            : {
                name: result.name,
                specialty: result.specialty,
                phone: result.phone,
              };

        const LABELS: Record<string, string> = {
          name: "Name",
          specialty: "Specialty",
          phone: "Phone",
          credential: "Credential",
        };

        const syncFields: SyncField[] = Object.entries(incoming).map(([key, val]) => ({
          key,
          label: LABELS[key] ?? key,
          current: currentValues[key] ?? "",
          incoming: val,
        }));

        const initialChecked: Record<string, boolean> = {};
        for (const f of syncFields) {
          initialChecked[f.key] = f.incoming !== "" && f.incoming !== f.current;
        }

        setFields(syncFields);
        setChecked(initialChecked);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sync failed");
      } finally {
        setLoading(false);
      }
    }
    fetchNpi();
  }, [npiNumber, entityType, currentValues]);

  function toggleField(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleApply() {
    const accepted: Record<string, string> = {};
    for (const f of fields) {
      if (checked[f.key]) accepted[f.key] = f.incoming;
    }
    onApply(accepted, new Date());
  }

  const anyChecked = Object.values(checked).some(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Re-sync from NPI Registry</h2>
            <p className="text-xs text-slate-400 mt-0.5">NPI {npiNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 min-h-[140px]">
          {loading && (
            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
              Fetching NPI data…
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 rounded-lg px-3 py-2">{error}</p>
          )}

          {!loading && !error && fields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-3">
                Check the fields you want to update. Unchecked fields keep their current values.
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="w-8 px-3 py-2" />
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Field</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">Current</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">NPI Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {fields.map((f) => {
                      const isDifferent = f.incoming !== f.current;
                      return (
                        <tr
                          key={f.key}
                          className={isDifferent ? "bg-slate-800/60" : "opacity-50"}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!checked[f.key]}
                              onChange={() => toggleField(f.key)}
                              disabled={!isDifferent || f.incoming === ""}
                              className="h-4 w-4 rounded border-slate-600 text-indigo-600
                                         focus:ring-indigo-500 disabled:opacity-30"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-300 font-medium">{f.label}</td>
                          <td className="px-3 py-2 text-slate-400 max-w-[140px] truncate">
                            {f.current || <span className="italic text-slate-600">empty</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-200 max-w-[140px] truncate">
                            {f.incoming || <span className="italic text-slate-600">empty</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium
                       text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!anyChecked && !loading && !error}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white
                       hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Apply Selected Changes
          </button>
        </div>
      </div>
    </div>
  );
}
