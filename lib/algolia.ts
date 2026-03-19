import { AlgoliaResponse, AlgoliaHit, Submission, SubmissionType, SearchParams, SearchResponse } from "./types";
import { parseDate } from "./time";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";

function buildTags(types: string): string {
  const tags = types.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length === 0) return "story";
  if (tags.length === 1) return tags[0];
  return `(${tags.join(",")})`;
}

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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
