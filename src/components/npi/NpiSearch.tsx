"use client";

import { useState, useRef } from "react";
import type { NpiResult } from "@/lib/npi";

interface Props {
  type: "individual" | "organization";
  onSelect: (result: NpiResult) => void;
  onDismiss: () => void;
}

export function NpiSearch({ type, onSelect, onDismiss }: Props) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [results, setResults] = useState<NpiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query.trim(), type });
      if (stateFilter) params.set("state", stateFilter);
      const res = await fetch(`/api/npi?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Search failed");
      }
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const placeholder =
    type === "individual"
      ? 'Last name, or "Last, First"'
      : "Organization name";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">
          Search NPI Registry
        </h4>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Enter manually instead
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm
                     text-slate-100 placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <input
          type="text"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="ST"
          maxLength={2}
          title="Optional state filter (e.g. MA, CA)"
          className="w-14 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm
                     text-center text-slate-100 placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white
                     hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {searched && results.length === 0 && !loading && (
        <p className="text-xs text-slate-400">
          No results found. Try a broader search or different spelling.
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-1 max-h-56 overflow-y-auto">
          {results.map((r) => (
            <li key={r.npiNumber}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                className="w-full text-left rounded-lg border border-slate-700 bg-slate-900
                           px-3 py-2 hover:bg-slate-700 hover:border-indigo-500
                           transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {r.name}
                      {r.type === "individual" && r.credential
                        ? `, ${r.credential}`
                        : ""}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {r.specialty}
                      {r.address
                        ? ` · ${r.address.city}, ${r.address.state}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0 font-mono">
                    {r.npiNumber}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
