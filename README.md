<p align="center">
  <img src="public/logo.png" alt="Amber logo" width="120" />
</p>

# Amber

A historical discovery tool for Hacker News. If you don't have time to
check HN every day, this lets you go back and surface the best content
from any time period - whether that's the last 24 hours or the last
year.

All data is fetched live from the
[Algolia HN API](https://hn.algolia.com/api) - no database required.

## Pages

- **Browse** (`/browse`, also `/`) - Filter by time range
  (Hot/24h/7d/30d/1y/custom) and type (Story, Ask HN, Show HN, Poll,
  Job), sorted by points. URL state is shareable.
- **Highlights** (`/highlights`) - Top stories from each recent day,
  week, or month, with infinite scroll.
- **Thread** (`/item?id=N`) - Amber's own view of a discussion. See
  below.
- **API Docs** (`/api-docs`) - Human-readable documentation for the
  REST API.

## Reading threads

`/item?id=N` renders a whole HN discussion in one page, built around
making the nesting level obvious and easy to escape.

Every ancestor of a comment gets a colored vertical rail to its left.
Clicking any rail collapses that ancestor and scrolls to it, so you can
close off a subthread from wherever you happen to be reading rather
than scrolling back up to find its parent. A breadcrumb pinned under
the header shows the ancestor chain of whatever is currently on screen.

Each comment offers previous/next reply *at the same level*, parent,
and top-of-thread. With a mouse there is also a keyboard scheme -
press `?` for the list.

On touch devices only, a story title opens Amber's own article view
alongside the comments, so the two are one tap apart instead of two
browser tabs apart. With a mouse the title opens the real page in a new
tab, which beats any iframe. That split is keyed to `pointer: coarse`,
not screen width, so rotating a phone doesn't change where links go.

Roughly 40% of the sites HN links to refuse to be embedded, and a
browser gives no way to detect that, so known refusers are listed in
`lib/frame-policy.ts` and everything else falls back to a prominent
"open the original" link.

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
./dev -i    # install
./dev -d    # dev server
./dev -a    # lint + typecheck + test + build
```

Open [http://localhost:3000](http://localhost:3000).

Tests cover `lib/` only, and deliberately: the thread model, comment
HTML handling, and frame policy are pure functions, so they run under
vitest in a node environment with no DOM and no React test setup.

## Project Management

This project uses [Kan](https://github.com/amterp/kan) for task tracking.
Run `kan serve` to view the board in the browser, or use the `kan` CLI
directly.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Algolia HN API (no auth required)
