import { AlgoliaResponse, AlgoliaHit, HnItemNode, Submission, SubmissionType, SearchParams, SearchResponse } from "./types";
import { parseDate } from "./time";
import { extractDomain } from "./url";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

function buildTags(types: string): string {
  const tags = types.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length === 0) return "story";
  if (tags.length === 1) return tags[0];
  return `(${tags.join(",")})`;
}

function detectType(tags: string[]): SubmissionType {
  if (tags.includes("ask_hn")) return "ask_hn";
  if (tags.includes("show_hn")) return "show_hn";
  if (tags.includes("poll")) return "poll";
  if (tags.includes("job")) return "job";
  return "story";
}

function transformHit(hit: AlgoliaHit): Submission {
  return {
    id: hit.objectID,
    title: hit.title,
    url: hit.url || null,
    domain: extractDomain(hit.url),
    author: hit.author,
    points: hit.points ?? 0,
    commentCount: hit.num_comments ?? 0,
    createdAt: hit.created_at,
    createdAtTimestamp: hit.created_at_i,
    type: detectType(hit._tags),
  };
}

export async function fetchFrontPage(page: number = 0, perPage: number = 30): Promise<SearchResponse> {
  const queryParams = new URLSearchParams();
  queryParams.set("tags", "front_page");
  queryParams.set("hitsPerPage", String(Math.min(Math.max(perPage, 1), 100)));
  queryParams.set("page", String(page));

  const url = `${ALGOLIA_BASE}/search?${queryParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Algolia API error: ${res.status} ${res.statusText}`);
  }

  const data: AlgoliaResponse = await res.json();

  return {
    hits: data.hits.map(transformHit),
    total_hits: data.nbHits,
    page: data.page,
    total_pages: data.nbPages,
  };
}

export class ItemNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`HN item ${id} not found`);
    this.name = "ItemNotFoundError";
  }
}

/**
 * Fetch a whole discussion tree in one request. Algolia nests every descendant
 * under `children`, so this is the only call a thread view needs - which is what
 * makes the feature possible with no server. Note the response is uncompressed;
 * the largest threads are ~2 MB.
 */
export async function fetchItem(id: string | number, signal?: AbortSignal): Promise<HnItemNode> {
  const res = await fetch(`${ALGOLIA_BASE}/items/${encodeURIComponent(String(id))}`, { signal });

  if (res.status === 404) {
    throw new ItemNotFoundError(String(id));
  }
  if (!res.ok) {
    throw new Error(`Algolia API error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as HnItemNode;
}

export async function searchAlgolia(params: SearchParams): Promise<SearchResponse> {
  const sort = params.sort || "points";
  const endpoint = sort === "date" ? "search_by_date" : "search";
  const perPage = Math.min(Math.max(params.per_page || 20, 1), 100);

  const queryParams = new URLSearchParams();

  if (params.q) {
    queryParams.set("query", params.q);
  }

  queryParams.set("tags", buildTags(params.type || "story"));
  queryParams.set("hitsPerPage", String(perPage));
  queryParams.set("page", String(params.page || 0));

  const numericFilters: string[] = [];
  if (params.from) {
    numericFilters.push(`created_at_i>${parseDate(params.from)}`);
  }
  if (params.to) {
    numericFilters.push(`created_at_i<${parseDate(params.to)}`);
  }
  if (params.points_min !== undefined) {
    numericFilters.push(`points>=${params.points_min}`);
  }
  if (params.comments_min !== undefined) {
    numericFilters.push(`num_comments>=${params.comments_min}`);
  }
  if (numericFilters.length > 0) {
    queryParams.set("numericFilters", numericFilters.join(","));
  }

  const url = `${ALGOLIA_BASE}/${endpoint}?${queryParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Algolia API error: ${res.status} ${res.statusText}`);
  }

  const data: AlgoliaResponse = await res.json();

  return {
    hits: data.hits.map(transformHit),
    total_hits: data.nbHits,
    page: data.page,
    total_pages: data.nbPages,
  };
}
