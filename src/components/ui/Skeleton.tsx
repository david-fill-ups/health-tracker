export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse"
        >
          <div className="h-4 w-1/3 rounded bg-gray-200 mb-2" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse">
      <div className="h-10 bg-gray-50 border-b border-gray-200" />
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((__, j) => (
              <div
                key={j}
                className="h-4 rounded bg-gray-100"
                style={{ width: `${60 + (j * 20) % 40}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
