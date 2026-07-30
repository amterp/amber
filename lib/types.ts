export const VALID_TYPES = ["story", "ask_hn", "show_hn", "poll", "job"] as const;

export interface AlgoliaHit {
  objectID: string;
  title: string;
  url: string | null;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
  created_at_i: number;
  story_text?: string | null;
  _tags: string[];
}

export interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

export interface Submission {
  id: string;
  title: string;
  url: string | null;
  domain: string | null;
  author: string;
  points: number;
  commentCount: number;
  createdAt: string;
  createdAtTimestamp: number;
  type: SubmissionType;
}

export type SubmissionType = (typeof VALID_TYPES)[number];

/** A node from Algolia's /items/{id} endpoint. The whole tree arrives nested. */
export interface HnItemNode {
  id: number;
  parent_id: number | null;
  story_id: number | null;
  type: "story" | "comment" | "poll" | "pollopt" | "job";
  author: string | null;
  text: string | null; // HN-flavored HTML
  title: string | null; // story only
  url: string | null; // story only
  points: number | null; // always null on comments - Algolia never exposes comment scores
  created_at: string | null;
  created_at_i: number | null;
  options: unknown[];
  children: HnItemNode[];
}

export interface StoryHeader {
  id: number;
  title: string;
  url: string | null;
  domain: string | null;
  author: string | null;
  points: number;
  text: string | null; // self-text: Ask HN, Show HN, or link plus commentary
  createdAtTimestamp: number;
  /**
   * Counted from the tree, not from the search API's num_comments. Dead comments
   * are omitted from the tree, so the two disagree by ~2% and num_comments would
   * be a visible lie next to a list you can count.
   */
  commentCount: number;
}

/**
 * One comment in pre-order position. Every navigation link is precomputed here so
 * the UI never walks a tree: the subtree of index `i` occupies
 * [i + 1, i + 1 + descendantCount).
 */
export interface FlatComment {
  index: number;
  id: number;
  parentId: number | null;
  depth: number; // 0 = top-level
  author: string | null;
  text: string | null;
  createdAtTimestamp: number | null;
  parentIndex: number; // -1 at top level
  ancestorIndices: number[]; // root-first; length === depth
  siblingIndex: number;
  siblingCount: number;
  nextSiblingIndex: number; // -1 if none
  prevSiblingIndex: number; // -1 if none
  firstChildIndex: number; // -1 if none
  descendantCount: number; // excludes self
  dead: boolean;
}

export interface Thread {
  story: StoryHeader;
  comments: FlatComment[];
  indexById: Map<number, number>;
  topLevelIndices: number[];
}

export type SortOrder = "points" | "date";

export type TimeRange = "hot" | "24h" | "7d" | "30d" | "1y" | "custom";

export type Step = "daily" | "weekly" | "monthly";

export interface Period {
  start: number;        // Unix timestamp (seconds)
  end: number;          // Unix timestamp (seconds)
  label: string;
  inProgress?: boolean;
}

export interface SearchParams {
  q?: string;
  type?: string;
  from?: string;
  to?: string;
  points_min?: number;
  comments_min?: number;
  sort?: SortOrder;
  page?: number;
  per_page?: number;
}

export interface SearchResponse {
  hits: Submission[];
  total_hits: number;
  page: number;
  total_pages: number;
}
