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

export type SortOrder = "points" | "date";

export type TimeRange = "24h" | "7d" | "30d" | "1y" | "custom";

export type Step = "daily" | "weekly" | "monthly";

export interface Period {
  start: number; // Unix timestamp (seconds)
  end: number;   // Unix timestamp (seconds)
  label: string;
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
