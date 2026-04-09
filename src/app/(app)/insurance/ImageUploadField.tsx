"use client";

import { useRef, useState } from "react";

interface ImageUploadFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (dataUrl: string | null) => void;
}

export function ImageUploadField({ label, value, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sizeWarning, setSizeWarning] = useState(false);

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
    // Reset input so the same file can be re-selected if removed and re-added
    e.target.value = "";
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
        >
          📷 {label}
        </button>
      )}
      {sizeWarning && (
        <p className="text-xs text-red-600">Image is too large (max ~1 MB). Please resize and try again.</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
