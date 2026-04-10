"use client";

import { useRef, useState, useEffect } from "react";

interface ImageUploadFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
}

export function ImageUploadField({ label, value, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [sizeWarning, setSizeWarning] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  // Attach stream to video element after camera modal renders
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [showCamera]);

  // getUserMedia called directly in the click handler so the browser
  // recognises it as a user gesture and shows the permission prompt
  async function handleTakePhoto() {
    setShowMenu(false);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        setCameraError(
          "Camera permission denied. Check Windows Settings → Privacy & Security → Camera and make sure Chrome is allowed, then try again."
        );
      } else if (name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else if (name === "NotReadableError") {
        setCameraError("Camera is in use by another app. Close it and try again.");
      } else {
        setCameraError(`Camera unavailable: ${err instanceof Error ? err.message : String(err)}`);
      }
      setShowCamera(true);
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setShowCamera(false);
    setCameraError(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSizeWarning(false);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result.length > 1_400_000) {
        setSizeWarning(true);
        return;
      }
      onChange(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    if (dataUrl.length > 1_400_000) {
      setSizeWarning(true);
    } else {
      onChange(dataUrl);
    }
    closeCamera();
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="h-20 rounded-lg object-cover border border-gray-200 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600"
            aria-label={`Remove ${label}`}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="relative inline-block" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            📷 {label}
          </button>
          {showMenu && (
            <div className="absolute left-0 top-full mt-1 z-10 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => { setShowMenu(false); inputRef.current?.click(); }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                ⬆️ Upload photo
              </button>
              <button
                type="button"
                onClick={handleTakePhoto}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                📸 Take photo
              </button>
            </div>
          )}
        </div>
      )}

      {sizeWarning && (
        <p className="text-xs text-red-600">Image is too large (max ~1 MB). Please resize and try again.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <canvas ref={canvasRef} className="hidden" />

      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-4 shadow-xl w-full max-w-md mx-4">
            <p className="text-sm font-medium text-gray-700">{label}</p>
            {cameraError ? (
              <p className="text-sm text-red-600 text-center">{cameraError}</p>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-black"
              />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
