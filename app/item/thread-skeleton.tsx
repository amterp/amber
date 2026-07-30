const ROW_INDENTS = [0, 1, 2, 1, 0, 1, 2, 0];

export default function ThreadSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-4 py-4">
      {ROW_INDENTS.map((indent, i) => (
        <div key={i} className="flex gap-3 py-2" style={{ paddingLeft: indent * 16 }}>
          <div className="min-w-0 flex-1">
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-3 w-full rounded bg-gray-100 dark:bg-gray-800/60" />
            <div className="mt-1.5 h-3 w-4/5 rounded bg-gray-100 dark:bg-gray-800/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
