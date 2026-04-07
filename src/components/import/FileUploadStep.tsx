"use client";

import { useRef, useState, useEffect } from "react";

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
  const [showCamera, setShowCamera] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // preview URLs per file (lazy-computed)
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  function addFiles(incoming: FileList | File[] | null) {
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
    <>
    {showCamera && (
      <CameraOverlay
        onCapture={(file) => { addFiles([file]); setShowCamera(false); }}
        onClose={() => setShowCamera(false)}
      />
    )}
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
          onClick={() => isMobile ? cameraInputRef.current?.click() : setShowCamera(true)}
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

      {/* AI disclaimer */}
      <p className="text-xs text-gray-400 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
        <span className="font-medium text-gray-500">Note:</span> Uploaded files are sent to an
        external AI service for processing. Do not upload documents containing information you
        are not comfortable sharing outside this app.
      </p>

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
    </>
  );
}

// ── Camera overlay (desktop webcam capture) ────────────────────────────────

function CameraOverlay({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <div className="relative bg-black rounded-xl overflow-hidden w-full max-w-lg mx-4">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-red-400 text-sm mb-4">Could not access camera: {error}</p>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white text-black text-sm rounded-lg">
              Close
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full" />
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/20 text-white text-sm rounded-lg backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capture}
                disabled={!ready}
                className="px-6 py-2 bg-white text-black text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                📷 Capture
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
