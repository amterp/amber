import { memo, useEffect, useRef } from "react";
import { formatTimeAgo } from "@/lib/time";
import { FlatComment } from "@/lib/types";
import CommentBody from "./comment-body";
import { railTint, railWidthClass } from "./rail-style";
import { RowTracker } from "./row-tracker";

interface Props {
  comment: FlatComment;
  collapsed: boolean;
  current: boolean;
  onToggle: (id: number) => void;
  /** Collapse an ancestor by its index in the flat list, and scroll to it. */
  onCollapseAncestor: (index: number) => void;
  onNavigate: (index: number) => void;
  authorAt: (index: number) => string;
  tracker: RowTracker | null;
}

/**
 * One comment, rendered flat. Indentation comes from the row of rails on the
 * left rather than from nested DOM, so collapsing a subtree is a filter over an
 * array instead of a tree reconciliation.
 *
 * Each rail is also the click target for collapsing that ancestor, which is what
 * makes "collapse the level I'm looking at" work at any scroll position without
 * scrolling back up to hunt for the parent.
 */
function CommentRow({
  comment,
  collapsed,
  current,
  onToggle,
  onCollapseAncestor,
  onNavigate,
  authorAt,
  tracker,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !tracker) return;
    tracker.observe(el);
    return () => tracker.unobserve(el);
  }, [tracker]);

  const { prevSiblingIndex, nextSiblingIndex, parentIndex, ancestorIndices } = comment;
  const rootIdx = ancestorIndices.length > 0 ? ancestorIndices[0] : -1;

  return (
    <article
      id={`c${comment.id}`}
      ref={ref}
      data-index={comment.index}
      tabIndex={-1}
      className={`group/cmt flex scroll-mt-[var(--hn-scroll-offset)] outline-none transition-opacity duration-200 motion-reduce:transition-none [content-visibility:auto] [contain-intrinsic-size:auto_96px] ${
        collapsed ? "opacity-70" : ""
      }`}
    >
      {ancestorIndices.map((ancestorIndex, level) => (
        <button
          key={ancestorIndex}
          type="button"
          onClick={() => onCollapseAncestor(ancestorIndex)}
          title={`Collapse ${authorAt(ancestorIndex)}'s thread`}
          aria-label={`Collapse the thread started by ${authorAt(ancestorIndex)}`}
          className={`group/rail relative shrink-0 cursor-pointer touch-manipulation before:absolute before:inset-y-0 before:-inset-x-1 before:content-[''] ${railWidthClass(
            level
          )}`}
        >
          {/* 3px, not a hairline: rails carry the nesting level, which is the
              whole point of this view. A 1px line lands on a half-pixel boundary
              and anti-aliases itself into invisibility. */}
          <span
            className={`absolute inset-y-0 left-0 w-[3px] rounded-full transition-all group-hover/rail:-left-px group-hover/rail:w-[5px] ${railTint(
              level
            )}`}
          />
        </button>
      ))}

      {/* min-w-0 keeps a wide <pre> or a bare URL inside its own scroll box
          instead of stretching the page. */}
      <div
        className={`min-w-0 flex-1 border-b py-1.5 ${
          current
            ? "border-gray-100 bg-orange-50/60 dark:border-gray-800 dark:bg-orange-500/5"
            : "border-gray-100 dark:border-gray-800"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggle(comment.id)}
            aria-expanded={!collapsed}
            className="flex min-w-0 items-center gap-1.5 rounded py-0.5 text-left text-xs text-gray-500 transition-colors hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-orange-500 dark:text-gray-400 dark:hover:text-gray-100"
          >
            {/* One glyph rotated rather than two swapped, so the state change
                is a movement you can follow instead of a substitution. */}
            <span
              aria-hidden
              className={`inline-block w-3 shrink-0 text-gray-400 transition-transform duration-200 motion-reduce:transition-none dark:text-gray-500 ${
                collapsed ? "-rotate-90" : ""
              }`}
            >
              ▾
            </span>

            {comment.dead ? (
              <span className="italic text-gray-400 dark:text-gray-500">[deleted]</span>
            ) : (
              <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                {comment.author}
              </span>
            )}

            {!collapsed && comment.createdAtTimestamp !== null && (
              <>
                <span aria-hidden>&middot;</span>
                <span className="shrink-0">
                  {formatTimeAgo(comment.createdAtTimestamp)}
                </span>
              </>
            )}

            {collapsed && comment.descendantCount > 0 && (
              <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                +{comment.descendantCount}
              </span>
            )}
          </button>

          {/* Coarse and no-pointer devices keep these visible; only fine pointers
              opt into hover-reveal. Written this way round so we never depend on
              Tailwind's variant ordering to resolve the conflict. */}
          <div className="ml-auto flex shrink-0 items-center gap-0.5 text-gray-400 pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-focus-within/cmt:opacity-100 pointer-fine:group-hover/cmt:opacity-100 dark:text-gray-500">
            <NavButton
              target={prevSiblingIndex}
              onNavigate={onNavigate}
              label="Previous reply at this level"
              hint="p"
              glyph="↑"
            />
            <NavButton
              target={nextSiblingIndex}
              onNavigate={onNavigate}
              label="Next reply at this level"
              hint="n"
              glyph="↓"
            />
            <NavButton
              target={parentIndex}
              onNavigate={onNavigate}
              label="Parent comment"
              hint="h"
              glyph="⤴"
            />
            <NavButton
              target={rootIdx}
              onNavigate={onNavigate}
              label="Top of this thread"
              hint="u"
              glyph="⌂"
            />
            <a
              href={`#c${comment.id}`}
              title="Link to this comment"
              aria-label="Link to this comment"
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              <span aria-hidden className="text-[11px]">
                #
              </span>
            </a>
          </div>
        </div>

        {!collapsed && !comment.dead && <CommentBody html={comment.text} />}
      </div>
    </article>
  );
}

interface NavButtonProps {
  target: number;
  onNavigate: (index: number) => void;
  label: string;
  hint: string;
  glyph: string;
}

function NavButton({ target, onNavigate, label, hint, glyph }: NavButtonProps) {
  if (target < 0) {
    // Keep the slot so the control cluster doesn't reflow between rows.
    return <span aria-hidden className="h-6 w-6" />;
  }
  return (
    <button
      type="button"
      onClick={() => onNavigate(target)}
      title={`${label} (${hint})`}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded text-xs transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}

export default memo(CommentRow);
