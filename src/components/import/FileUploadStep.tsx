"use client";

import { useRef, useState } from "react";

const ACCEPTED_TYPES = ".pdf,image/jpeg,image/png,image/gif,image/webp,.docx";
const ACCEPT_CAMERA = "image/*";

interface Profile {
  id: string;
  name: string;
}

interface FileUploadStepProps {
  files: File[];
  profileId: string;
  profiles: Profile[];
  isVisitContext: boolean; // true = opened from visit page (profile selector hidden)
  onFilesChange: (files: File[]) => void;
  onProfileChange: (id: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
}

export function FileUploadStep({
  files,
  profileId,
  profiles,
  isVisitContext,
  onFilesChange,
  onProfileChange,
  onSubmit,
  isLoading,
}: FileUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // preview URLs per file (lazy-computed)
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const newFiles = Array.from(incoming);
    const combined = [...files, ...newFiles];
    onFilesChange(combined);

    // Generate previews for images
    const next = new Map(previews);
    for (const f of newFiles) {
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        next.set(f.name + f.size, url);
      }
    }
    setPreviews(next);
  }

  function removeFile(index: number) {
    const next = [...files];
    const removed = next.splice(index, 1)[0];
    onFilesChange(next);
    // Revoke preview URL if any
    const key = removed.name + removed.size;
    const url = previews.get(key);
    if (url) URL.revokeObjectURL(url);
    const nextPreviews = new Map(previews);
    nextPreviews.delete(key);
    setPreviews(nextPreviews);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-5">
      {/* Profile selector (hidden when opened from a visit) */}
      {!isVisitContext && profiles.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Import into profile
          </label>
          <select
            value={profileId}
            onChange={(e) => onProfileChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-gray-200 bg-gray-50 hover:border-gray-300"
        }`}
      >
        <p className="text-4xl mb-3">📄</p>
        <p className="text-sm font-medium text-gray-700">
          Drop files here, or use the buttons below
        </p>
        <p className="mt-1 text-xs text-gray-400">
          PDF, images (JPEG, PNG, WebP), or Word documents &middot; up to 20 MB total
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Browse Files
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          📷 Take Photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        {/* Camera-specific input (mobile) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept={ACCEPT_CAMERA}
          capture="environment"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            // Reset so the same photo can be re-taken
            e.target.value = "";
          }}
        />
      </div>

      {/* File thumbnails / list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {files.length} file{files.length !== 1 ? "s" : ""} ready
            </p>
            <button
              type="button"
              onClick={() => { onFilesChange([]); setPreviews(new Map()); }}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => {
              const key = file.name + file.size;
              const previewUrl = previews.get(key);
              return (
                <div
                  key={key}
                  className="relative group rounded-lg border border-gray-200 bg-white overflow-hidden flex flex-col items-center"
                  style={{ width: 88, minHeight: 88 }}
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="w-full object-cover"
                      style={{ height: 64 }}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full text-2xl" style={{ height: 64 }}>
                      {file.type === "application/pdf" ? "📄" : "📝"}
                    </div>
                  )}
                  <p className="px-1 pb-1 text-center text-xs text-gray-500 leading-tight truncate w-full">
                    {file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 hidden group-hover:flex w-5 h-5 items-center justify-center rounded-full bg-red-500 text-white text-xs"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={files.length === 0 || !profileId || isLoading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Analyzing…" : "Analyze Documents"}
      </button>
    </div>
  );
}
