# HN Browser

A clean interface for browsing top Hacker News submissions by time
period and type, plus a structured REST API for programmatic access.

All data is fetched live from the
[Algolia HN API](https://hn.algolia.com/api) - no database required.

## Pages

- **Browse** (`/browse`, also `/`) - Filter by time range
  (24h/7d/30d/1y/custom) and type (Story, Ask HN, Show HN, Poll, Job),
  sorted by points. URL state is shareable.
- **Monthly Highlights** (`/monthly`) - Top 20 stories from each of the
  last 12 calendar months. Cached in-memory for 1 hour.
- **API Docs** (`/api-docs`) - Human-readable documentation for the
  REST API.

## REST API

### `GET /api/search`

| Param          | Type   | Default  | Description                        |
|----------------|--------|----------|------------------------------------|
| `q`            | string | `""`     | Search terms (empty = top by pts)  |
| `type`         | string | `story`  | story, ask_hn, show_hn, poll, job  |
| `from`         | string | -        | Start (ISO date or Unix timestamp) |
| `to`           | string | -        | End (ISO date or Unix timestamp)   |
| `points_min`   | number | -        | Minimum points                     |
| `comments_min` | number | -        | Minimum comments                   |
| `sort`         | string | `points` | `points` or `date`                 |
| `page`         | number | `0`      | Page (0-indexed)                   |
| `per_page`     | number | `20`     | Results per page (1-100)           |

### `GET /api/openapi.json`

OpenAPI 3.1 spec for the search endpoint. Agents can fetch this to
discover the API.

### `GET /api`

JSON discovery endpoint with links to docs and all API routes.

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Algolia HN API (no auth required)
