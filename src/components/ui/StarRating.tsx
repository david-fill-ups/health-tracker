"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number | null | undefined;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

export function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const current = hovered ?? value ?? 0;

  const starSize = size === "sm" ? "text-sm" : "text-xl";

  function getHalf(starIndex: number, e: React.MouseEvent<HTMLButtonElement>): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return x < rect.width / 2 ? starIndex - 0.5 : starIndex;
  }

  if (readonly) {
    if (!value) return null;
    return (
      <span className={`${starSize} text-amber-400 leading-none`} title={`${value} / 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i}>
            {value >= i ? "★" : value >= i - 0.5 ? "⯨" : "☆"}
          </span>
        ))}
        <span className="ml-1 text-xs text-gray-500">{value.toFixed(1)}</span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={`${starSize} leading-none cursor-pointer transition-colors ${
            current >= i ? "text-amber-400" : current >= i - 0.5 ? "text-amber-300" : "text-gray-300"
          } hover:text-amber-400`}
          onMouseMove={(e) => setHovered(getHalf(i, e))}
          onClick={(e) => onChange?.(getHalf(i, e))}
        >
          {current >= i ? "★" : current >= i - 0.5 ? "⯨" : "☆"}
        </button>
      ))}
      {value != null && (
        <button
          type="button"
          className="ml-1 text-xs text-gray-400 hover:text-red-500"
          onClick={() => onChange?.(0)}
          title="Clear rating"
        >
          ✕
        </button>
      )}
    </div>
  );
}
