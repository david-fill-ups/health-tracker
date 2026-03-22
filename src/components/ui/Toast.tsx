"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string | null;
  type?: "success" | "error";
  onDismiss: () => void;
}

export function Toast({ message, type = "success", onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  const colors =
    type === "error"
      ? "bg-red-600 text-white"
      : "bg-gray-900 text-white";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-lg ${colors}`}
    >
      {type === "success" ? "✓" : "✕"} {message}
    </div>
  );
}
