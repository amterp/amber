import { FlatComment, HnItemNode, StoryHeader, Thread } from "./types";
import { extractDomain } from "./url";

/**
 * Guards against cycles and corruption in the payload. Deepest thread observed on
 * HN is 21 (the youtube-dl DMCA thread), so this leaves plenty of headroom while
 * still bounding recursion.
 */
export const MAX_DEPTH = 40;

export function isDead(n: Pick<HnItemNode, "author" | "text">): boolean {
  return n.author == null && n.text == null;
}

/**
 * Algolia serves comment IDs from the same endpoint as story IDs, and HN's own
 * permalinks point at comments. Callers should redirect those to the story with a
 * hash rather than rendering a fragment of a thread.
 */
export function commentPermalinkRedirect(
  root: HnItemNode
): { storyId: number; commentId: number } | null {
  if (root?.type !== "comment") return null;
  if (typeof root.story_id !== "number" || typeof root.id !== "number") return null;
  if (root.story_id === root.id) return null;
  return { storyId: root.story_id, commentId: root.id };
}

/**
 * Flatten the nested response into pre-order position, precomputing every
 * navigation link. The payoff: collapse becomes a filter, sibling navigation
 * becomes a field read, and keyboard movement becomes index arithmetic, none of
 * which needs to touch the DOM or re-walk a tree.
 */
export function buildThread(root: HnItemNode): Thread {
  const comments: FlatComment[] = [];
  const indexById = new Map<number, number>();
  const visited = new Set<number>();
  let syntheticId = -1;

  function emitNode(
    node: unknown,
    depth: number,
    parentIdx: number,
    ancestorIndices: number[]
  ): number {
    if (!node || typeof node !== "object") return -1;
    if (depth > MAX_DEPTH) return -1;

    const n = node as HnItemNode;
    const rawChildren = Array.isArray(n.children) ? n.children : [];
    const dead = isDead(n);

    // A dead leaf carries nothing. A dead node with replies has to stay, or its
    // descendants would shift up a level and their rails would lie.
    if (dead && rawChildren.length === 0) return -1;

    const id =
      typeof n.id === "number" && Number.isFinite(n.id) ? n.id : syntheticId--;
    if (visited.has(id)) return -1;
    visited.add(id);

    const index = comments.length;
    const flat: FlatComment = {
      index,
      id,
      parentId: typeof n.parent_id === "number" ? n.parent_id : null,
      depth,
      author: dead ? null : (n.author ?? null),
      text: dead ? null : (n.text ?? null),
      createdAtTimestamp:
        typeof n.created_at_i === "number" ? n.created_at_i : null,
      parentIndex: parentIdx,
      ancestorIndices,
      siblingIndex: 0,
      siblingCount: 1,
      nextSiblingIndex: -1,
      prevSiblingIndex: -1,
      firstChildIndex: -1,
      descendantCount: 0,
      dead,
    };
    comments.push(flat);
    indexById.set(id, index);

    const emitted = emitChildren(rawChildren, depth + 1, index, [
      ...ancestorIndices,
      index,
    ]);

    // Every child turned out to be a dead leaf, so this placeholder has nothing
    // left to hold open. Safe to drop: nothing was pushed after it.
    if (dead && emitted.length === 0 && comments.length === index + 1) {
      comments.pop();
      indexById.delete(id);
      return -1;
    }

    flat.firstChildIndex = emitted.length > 0 ? emitted[0] : -1;
    flat.descendantCount = comments.length - index - 1;
    return index;
  }

  function emitChildren(
    rawChildren: unknown[],
    depth: number,
    parentIdx: number,
    ancestorIndices: number[]
  ): number[] {
    const emitted: number[] = [];
    for (const child of rawChildren) {
      const idx = emitNode(child, depth, parentIdx, ancestorIndices);
      if (idx >= 0) emitted.push(idx);
    }

    // Sibling links can only be filled once we know which children survived.
    for (let i = 0; i < emitted.length; i++) {
      const c = comments[emitted[i]];
      c.siblingIndex = i;
      c.siblingCount = emitted.length;
      c.prevSiblingIndex = i > 0 ? emitted[i - 1] : -1;
      c.nextSiblingIndex = i < emitted.length - 1 ? emitted[i + 1] : -1;
    }
    return emitted;
  }

  const topLevelIndices = emitChildren(
    Array.isArray(root?.children) ? root.children : [],
    0,
    -1,
    []
  );

  return {
    story: buildStoryHeader(root, comments.length),
    comments,
    indexById,
    topLevelIndices,
  };
}

function buildStoryHeader(root: HnItemNode, commentCount: number): StoryHeader {
  const url = root?.url ?? null;
  return {
    id: typeof root?.id === "number" ? root.id : 0,
    title: root?.title ?? "",
    url,
    domain: extractDomain(url),
    author: root?.author ?? null,
    points: typeof root?.points === "number" ? root.points : 0,
    text: root?.text ?? null,
    createdAtTimestamp:
      typeof root?.created_at_i === "number" ? root.created_at_i : 0,
    commentCount,
  };
}

function at(t: Thread, index: number): FlatComment | null {
  if (index < 0 || index >= t.comments.length) return null;
  return t.comments[index];
}

/**
 * Indices to render, in order. A row is hidden if any ancestor is collapsed;
 * skipping a whole subtree in one jump handles nesting for free.
 */
export function visibleIndices(
  t: Thread,
  collapsed: ReadonlySet<number>
): number[] {
  const out: number[] = [];
  const cs = t.comments;
  let i = 0;
  while (i < cs.length) {
    const c = cs[i];
    out.push(i);
    i += collapsed.has(c.id) ? c.descendantCount + 1 : 1;
  }
  return out;
}

/** Half-open [start, end) covering `index` and all of its descendants. */
export function subtreeRange(
  t: Thread,
  index: number
): readonly [number, number] {
  const c = at(t, index);
  if (!c) return [0, 0];
  return [index, index + c.descendantCount + 1];
}

export function nextSibling(t: Thread, index: number): number {
  return at(t, index)?.nextSiblingIndex ?? -1;
}

export function prevSibling(t: Thread, index: number): number {
  return at(t, index)?.prevSiblingIndex ?? -1;
}

export function parentIndex(t: Thread, index: number): number {
  return at(t, index)?.parentIndex ?? -1;
}

export function firstChild(t: Thread, index: number): number {
  return at(t, index)?.firstChildIndex ?? -1;
}

/** The top-level ancestor of `index`, or `index` itself if already top-level. */
export function rootIndex(t: Thread, index: number): number {
  const c = at(t, index);
  if (!c) return -1;
  return c.ancestorIndices.length > 0 ? c.ancestorIndices[0] : index;
}

export function nextTopLevel(t: Thread, index: number): number {
  const root = rootIndex(t, index);
  if (root < 0) return t.topLevelIndices[0] ?? -1;
  return nextSibling(t, root);
}

export function prevTopLevel(t: Thread, index: number): number {
  const root = rootIndex(t, index);
  if (root < 0) return -1;
  // From inside a subtree, "previous" means the head of the one you're in.
  if (root !== index) return root;
  return prevSibling(t, root);
}

/** First position in `visible` whose value is >= index. */
function lowerBound(visible: readonly number[], index: number): number {
  let lo = 0;
  let hi = visible.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (visible[mid] < index) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Position of `index` within the visible list, or -1 if it is hidden. */
export function positionOf(visible: readonly number[], index: number): number {
  const p = lowerBound(visible, index);
  return p < visible.length && visible[p] === index ? p : -1;
}

/**
 * Move `delta` rows through the visible list. If `index` is hidden, steps from
 * the gap it would occupy, so navigation still works right after a collapse.
 */
export function stepVisible(
  visible: readonly number[],
  index: number,
  delta: number
): number {
  if (visible.length === 0) return -1;
  const lb = lowerBound(visible, index);
  const onList = lb < visible.length && visible[lb] === index;
  const p = onList ? lb + delta : delta > 0 ? lb : lb - 1;
  if (p < 0 || p >= visible.length) return -1;
  return visible[p];
}

export function toggleCollapsed(
  collapsed: ReadonlySet<number>,
  id: number
): Set<number> {
  const next = new Set(collapsed);
  if (!next.delete(id)) next.add(id);
  return next;
}

/** Clear exactly the ancestor chain of `index`, leaving other collapses alone. */
export function expandAncestors(
  t: Thread,
  collapsed: ReadonlySet<number>,
  index: number
): Set<number> {
  const next = new Set(collapsed);
  const c = at(t, index);
  if (!c) return next;
  for (const ancIdx of c.ancestorIndices) {
    const anc = at(t, ancIdx);
    if (anc) next.delete(anc.id);
  }
  return next;
}

/** Collapse every comment at `depth` that has replies. Powers "collapse to level N". */
export function collapseFromDepth(t: Thread, depth: number): Set<number> {
  const next = new Set<number>();
  for (const c of t.comments) {
    if (c.depth === depth && c.descendantCount > 0) next.add(c.id);
  }
  return next;
}
