export default function MonthlyLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse" />
      <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded mb-8 animate-pulse" />
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
  );
}
