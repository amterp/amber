import { describe, it, expect } from "vitest";
import { HnItemNode } from "./types";
import {
  MAX_DEPTH,
  buildThread,
  collapseFromDepth,
  commentPermalinkRedirect,
  expandAncestors,
  firstChild,
  isDead,
  nextSibling,
  nextTopLevel,
  parentIndex,
  positionOf,
  prevSibling,
  prevTopLevel,
  rootIndex,
  stepVisible,
  subtreeRange,
  toggleCollapsed,
  visibleIndices,
} from "./thread";

function c(id: number, children: HnItemNode[] = [], over: Partial<HnItemNode> = {}): HnItemNode {
  return {
    id,
    parent_id: null,
    story_id: 1,
    type: "comment",
    author: `u${id}`,
    text: `text ${id}`,
    title: null,
    url: null,
    points: null,
    created_at: "2025-01-01T00:00:00.000Z",
    created_at_i: 1735689600 + id,
    options: [],
    children,
    ...over,
  };
}

function story(children: HnItemNode[], over: Partial<HnItemNode> = {}): HnItemNode {
  return {
    id: 1,
    parent_id: null,
    story_id: 1,
    type: "story",
    author: "op",
    text: null,
    title: "A story",
    url: "https://example.com/a",
    points: 100,
    created_at: "2025-01-01T00:00:00.000Z",
    created_at_i: 1735689600,
    options: [],
    children,
    ...over,
  };
}

/** 2 → [3 → [4], 5], 6 → [7] */
function sample() {
  return buildThread(
    story([c(2, [c(3, [c(4)]), c(5)]), c(6, [c(7)])])
  );
}

const idsOf = (t: ReturnType<typeof sample>, indices: number[]) =>
  indices.map((i) => t.comments[i].id);

describe("buildThread", () => {
  it("flattens in pre-order with index matching array position", () => {
    const t = sample();
    expect(t.comments.map((x) => x.id)).toEqual([2, 3, 4, 5, 6, 7]);
    t.comments.forEach((x, i) => expect(x.index).toBe(i));
    expect(t.topLevelIndices).toEqual([0, 4]);
  });

  it("records depth and root-first ancestor chains", () => {
    const t = sample();
    expect(t.comments.map((x) => x.depth)).toEqual([0, 1, 2, 1, 0, 1]);
    expect(t.comments[2].ancestorIndices).toEqual([0, 1]);
    expect(t.comments[2].ancestorIndices.length).toBe(t.comments[2].depth);
    expect(t.comments[0].ancestorIndices).toEqual([]);
  });

  it("counts descendants for leaf, single-child, wide and deep shapes", () => {
    const t = buildThread(
      story([
        c(2), // leaf
        c(3, [c(4)]), // single child
        c(5, [c(6), c(7), c(8)]), // wide
        c(9, [c(10, [c(11, [c(12)])])]), // deep
      ])
    );
    const byId = new Map(t.comments.map((x) => [x.id, x.descendantCount]));
    expect(byId.get(2)).toBe(0);
    expect(byId.get(3)).toBe(1);
    expect(byId.get(5)).toBe(3);
    expect(byId.get(9)).toBe(3);
    expect(byId.get(11)).toBe(1);
  });

  it("keeps subtreeRange consistent with descendantCount for every node", () => {
    const t = buildThread(
      story([
        c(2, [c(3, [c(4), c(5)]), c(6)]),
        c(7),
        c(8, [c(9, [c(10, [c(11)])])]),
      ])
    );
    for (const node of t.comments) {
      const [start, end] = subtreeRange(t, node.index);
      expect(start).toBe(node.index);
      expect(end - start - 1).toBe(node.descendantCount);
      // Everything in the range must actually descend from `node`.
      for (let i = start + 1; i < end; i++) {
        expect(t.comments[i].ancestorIndices).toContain(node.index);
      }
    }
  });

  it("links siblings and skips over intervening subtrees", () => {
    const t = sample();
    expect(nextSibling(t, 0)).toBe(4); // 2 → 6, jumping 3/4/5
    expect(prevSibling(t, 4)).toBe(0);
    expect(nextSibling(t, 4)).toBe(-1);
    expect(prevSibling(t, 0)).toBe(-1);
    expect(nextSibling(t, 1)).toBe(3); // 3 → 5, jumping 4
    expect(nextSibling(t, 2)).toBe(-1); // 4 is an only child
    expect(t.comments[1].siblingCount).toBe(2);
    expect(t.comments[3].siblingIndex).toBe(1);
  });

  it("resolves parent, first child and root", () => {
    const t = sample();
    expect(parentIndex(t, 2)).toBe(1);
    expect(parentIndex(t, 0)).toBe(-1);
    expect(firstChild(t, 0)).toBe(1);
    expect(firstChild(t, 2)).toBe(-1);
    expect(rootIndex(t, 2)).toBe(0);
    expect(rootIndex(t, 0)).toBe(0);
  });

  it("finds root at depth 21", () => {
    let deep = c(1021);
    for (let id = 1020; id >= 1001; id--) deep = c(id, [deep]);
    const t = buildThread(story([deep]));
    const last = t.comments[t.comments.length - 1];
    expect(last.depth).toBe(20); // 21 levels, 0-indexed
    expect(rootIndex(t, last.index)).toBe(0);
    expect(last.ancestorIndices).toHaveLength(20);
  });

  it("walks top-level comments", () => {
    const t = sample();
    expect(nextTopLevel(t, 2)).toBe(4); // from deep inside the first subtree
    expect(nextTopLevel(t, 4)).toBe(-1);
    expect(prevTopLevel(t, 2)).toBe(0); // jump to the head of the current subtree
    expect(prevTopLevel(t, 4)).toBe(0);
    expect(prevTopLevel(t, 0)).toBe(-1);
  });

  it("derives the story header, including a tree-derived comment count", () => {
    const t = sample();
    expect(t.story.title).toBe("A story");
    expect(t.story.domain).toBe("example.com");
    expect(t.story.points).toBe(100);
    expect(t.story.commentCount).toBe(6);
  });

  it("carries self-text through for Ask HN posts", () => {
    const t = buildThread(story([], { url: null, text: "<p>What do you use?" }));
    expect(t.story.text).toBe("<p>What do you use?");
    expect(t.story.domain).toBeNull();
  });
});

describe("buildThread resilience", () => {
  it("drops dead leaves but keeps dead nodes that still have replies", () => {
    const t = buildThread(
      story([
        c(2, [], { author: null, text: null }), // dead leaf: gone
        c(3, [c(4)], { author: null, text: null }), // dead with reply: placeholder
        c(5),
      ])
    );
    expect(t.comments.map((x) => x.id)).toEqual([3, 4, 5]);
    expect(t.comments[0].dead).toBe(true);
    expect(t.comments[0].author).toBeNull();
    expect(t.comments[1].depth).toBe(1); // descendant keeps its real depth
    expect(t.comments[2].dead).toBe(false);
  });

  it("drops a dead node whose only children were themselves dead leaves", () => {
    const t = buildThread(
      story([
        c(2, [c(3, [], { author: null, text: null })], { author: null, text: null }),
        c(4),
      ])
    );
    expect(t.comments.map((x) => x.id)).toEqual([4]);
    expect(t.indexById.has(2)).toBe(false);
  });

  it("terminates on a cycle", () => {
    const a = c(2);
    const b = c(3);
    a.children = [b];
    b.children = [a];
    const t = buildThread(story([a]));
    expect(t.comments.map((x) => x.id)).toEqual([2, 3]);
  });

  it("stops descending past MAX_DEPTH", () => {
    let deep = c(5000);
    for (let id = 4999; id >= 4900; id--) deep = c(id, [deep]);
    const t = buildThread(story([deep]));
    expect(t.comments.length).toBe(MAX_DEPTH + 1);
    expect(Math.max(...t.comments.map((x) => x.depth))).toBe(MAX_DEPTH);
  });

  it("survives malformed children", () => {
    const t = buildThread(
      story([
        c(2, undefined as unknown as HnItemNode[]),
        c(3, null as unknown as HnItemNode[]),
        c(4, [null as unknown as HnItemNode, c(5)]),
      ])
    );
    expect(t.comments.map((x) => x.id)).toEqual([2, 3, 4, 5]);
    expect(t.comments[2].descendantCount).toBe(1);
  });

  it("gives nodes with no usable id a unique synthetic one", () => {
    const t = buildThread(
      story([
        c(0, [], { id: undefined as unknown as number }),
        c(0, [], { id: undefined as unknown as number }),
      ])
    );
    expect(t.comments).toHaveLength(2);
    expect(t.comments[0].id).not.toBe(t.comments[1].id);
    expect(t.indexById.size).toBe(2);
  });

  it("handles a story with no comments", () => {
    const t = buildThread(story([]));
    expect(t.comments).toEqual([]);
    expect(t.topLevelIndices).toEqual([]);
    expect(t.story.commentCount).toBe(0);
    expect(visibleIndices(t, new Set())).toEqual([]);
  });
});

describe("isDead", () => {
  it("requires both author and text to be absent", () => {
    expect(isDead({ author: null, text: null })).toBe(true);
    expect(isDead({ author: "u", text: null })).toBe(false);
    expect(isDead({ author: null, text: "hi" })).toBe(false);
  });
});

describe("commentPermalinkRedirect", () => {
  it("redirects a comment id to its story", () => {
    expect(commentPermalinkRedirect(c(42, [], { story_id: 7 }))).toEqual({
      storyId: 7,
      commentId: 42,
    });
  });

  it("leaves stories alone", () => {
    expect(commentPermalinkRedirect(story([]))).toBeNull();
    expect(commentPermalinkRedirect(c(7, [], { story_id: 7 }))).toBeNull();
  });
});

describe("visibleIndices", () => {
  it("returns every index when nothing is collapsed", () => {
    const t = sample();
    expect(visibleIndices(t, new Set())).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("hides exactly the collapsed subtree", () => {
    const t = sample();
    // Collapse comment 3, hiding only its child 4.
    expect(idsOf(t, visibleIndices(t, new Set([3])))).toEqual([2, 3, 5, 6, 7]);
    // Collapse comment 2, hiding 3, 4 and 5.
    expect(idsOf(t, visibleIndices(t, new Set([2])))).toEqual([2, 6, 7]);
  });

  it("does not double-skip when a parent and child are both collapsed", () => {
    const t = sample();
    expect(idsOf(t, visibleIndices(t, new Set([2, 3])))).toEqual([2, 6, 7]);
  });

  it("does not run off the end when the last top-level node is collapsed", () => {
    const t = sample();
    expect(idsOf(t, visibleIndices(t, new Set([6])))).toEqual([2, 3, 4, 5, 6]);
  });

  it("ignores collapsed ids that are not in the thread", () => {
    const t = sample();
    expect(visibleIndices(t, new Set([9999]))).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("visible-list navigation", () => {
  it("locates visible rows and reports hidden ones as -1", () => {
    const t = sample();
    const visible = visibleIndices(t, new Set([2])); // hides 3, 4, 5
    expect(positionOf(visible, 0)).toBe(0);
    expect(positionOf(visible, 4)).toBe(1);
    expect(positionOf(visible, 1)).toBe(-1);
  });

  it("steps forward and backward across a collapsed region", () => {
    const t = sample();
    const visible = visibleIndices(t, new Set([2])); // [0, 4, 5]
    expect(stepVisible(visible, 0, 1)).toBe(4);
    expect(stepVisible(visible, 4, -1)).toBe(0);
    expect(stepVisible(visible, 5, 1)).toBe(-1);
    expect(stepVisible(visible, 0, -1)).toBe(-1);
  });

  it("steps from the gap when the current row was just hidden", () => {
    const t = sample();
    const visible = visibleIndices(t, new Set([2])); // [0, 4, 5]
    expect(stepVisible(visible, 2, 1)).toBe(4); // index 2 is hidden
    expect(stepVisible(visible, 2, -1)).toBe(0);
  });

  it("starts from the top when there is no current row", () => {
    const t = sample();
    const visible = visibleIndices(t, new Set());
    expect(stepVisible(visible, -1, 1)).toBe(0);
    expect(stepVisible(visible, -1, -1)).toBe(-1);
    expect(stepVisible([], 0, 1)).toBe(-1);
  });
});

describe("collapse-set transforms", () => {
  it("toggles without mutating the input", () => {
    const before = new Set([1]);
    const added = toggleCollapsed(before, 2);
    expect([...added].sort()).toEqual([1, 2]);
    expect([...toggleCollapsed(added, 1)]).toEqual([2]);
    expect([...before]).toEqual([1]);
  });

  it("expands exactly the ancestor chain and leaves other collapses alone", () => {
    const t = sample();
    // 2 and 3 are ancestors of index 2 (comment 4); 6 is unrelated.
    const next = expandAncestors(t, new Set([2, 3, 6]), 2);
    expect([...next]).toEqual([6]);
  });

  it("is a no-op for an unknown index", () => {
    const t = sample();
    expect([...expandAncestors(t, new Set([2]), 99)]).toEqual([2]);
  });

  it("collapses every node at a depth that has replies", () => {
    const t = sample();
    expect([...collapseFromDepth(t, 0)].sort((a, b) => a - b)).toEqual([2, 6]);
    expect([...collapseFromDepth(t, 1)]).toEqual([3]); // 5 and 7 are leaves
    expect([...collapseFromDepth(t, 9)]).toEqual([]);
  });
});
