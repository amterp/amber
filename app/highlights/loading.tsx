export default function HighlightsLoading() {
  return (
    <div>
      {/* Controls skeleton */}
      <div className="sticky top-12 z-40 border-b border-gray-200 bg-white/95 dark:border-gray-700 dark:bg-gray-900/95">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse" />

        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="mb-8">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex gap-3 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
