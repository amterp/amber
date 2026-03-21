export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "HN Browser API",
    description: "A clean REST API for searching Hacker News via Algolia. Supports filtering by type, time range, points, and comments.",
    version: "1.0.0",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/search": {
      get: {
        operationId: "searchHN",
        summary: "Search Hacker News submissions",
        description: "Search and filter HN submissions. Without a query, returns top stories sorted by points. With a query, sorts by relevance.",
        parameters: [
          {
            name: "q",
            in: "query",
            schema: { type: "string", default: "" },
            description: "Search terms. Empty string returns top stories by points.",
          },
          {
            name: "type",
            in: "query",
            schema: { type: "string", default: "story" },
            description: "Comma-separated submission types: story, ask_hn, show_hn, poll, job",
          },
          {
            name: "from",
            in: "query",
            schema: { type: "string" },
            description: "Start of time range (ISO 8601 date or Unix timestamp)",
          },
          {
            name: "to",
            in: "query",
            schema: { type: "string" },
            description: "End of time range (ISO 8601 date or Unix timestamp)",
          },
          {
            name: "points_min",
            in: "query",
            schema: { type: "integer" },
            description: "Minimum points threshold",
          },
          {
            name: "comments_min",
            in: "query",
            schema: { type: "integer" },
            description: "Minimum comment count threshold",
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["points", "date"], default: "points" },
            description: "Sort order: 'points' (highest first) or 'date' (newest first). Note: when 'q' is provided, 'points' sorting uses Algolia's relevance ranking (which factors in points) rather than strict points ordering. Use 'date' if you need deterministic sort order with a query.",
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 0, minimum: 0 },
            description: "Page number (0-indexed)",
          },
          {
            name: "per_page",
            in: "query",
            schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
            description: "Results per page (1-100)",
          },
        ],
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    hits: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          title: { type: "string" },
                          url: { type: "string", nullable: true },
                          domain: { type: "string", nullable: true },
                          author: { type: "string" },
                          points: { type: "integer" },
                          commentCount: { type: "integer" },
                          createdAt: { type: "string", format: "date-time" },
                          createdAtTimestamp: { type: "integer" },
                          type: {
                            type: "string",
                            enum: ["story", "ask_hn", "show_hn", "poll", "job"],
                          },
                        },
                      },
                    },
                    total_hits: { type: "integer" },
                    page: { type: "integer" },
                    total_pages: { type: "integer" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid parameters",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
          "502": {
            description: "Upstream API error (Algolia unavailable)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
