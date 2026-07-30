interface Props {
  onClose: () => void;
}

const SHORTCUTS: ReadonlyArray<readonly [string, string]> = [
  ["j / k", "Next / previous comment"],
  ["n / p", "Next / previous reply at this level"],
  ["h", "Jump to the parent"],
  ["l", "Jump to the first reply"],
  ["u", "Jump to the top of this thread"],
  ["[ / ]", "Previous / next top-level comment"],
  ["c or Enter", "Collapse or expand"],
  ["z", "Collapse the parent thread"],
  ["g g / G", "Top / bottom"],
  ["o", "Open the article in a new tab"],
  ["?", "Show this help"],
];

export default function KeyboardHelp({ onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-100"
          >
            <span aria-hidden>&times;</span>
          </button>
        </div>

        <dl className="space-y-1.5">
          {SHORTCUTS.map(([keys, label]) => (
            <div key={keys} className="flex items-baseline gap-3">
              <dt className="w-24 shrink-0 font-mono text-xs text-orange-600 dark:text-orange-400">
                {keys}
              </dt>
              <dd className="text-xs text-gray-600 dark:text-gray-300">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
