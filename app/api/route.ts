import { NextResponse } from "next/server";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HN Browser API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 2rem 1rem; color: #333; line-height: 1.6; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.1rem; margin-top: 2rem; margin-bottom: 0.5rem; color: #f60; }
    p { margin-bottom: 1rem; color: #666; }
    code { background: #f5f5f5; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 1rem; font-size: 0.85em; line-height: 1.5; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; font-size: 0.9em; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #555; }
    a { color: #f60; }
  </style>
</head>
<body>
  <h1>HN Browser API</h1>
  <p>A clean REST API for searching and filtering Hacker News submissions.</p>

  <h2>Endpoints</h2>
  <table>
    <tr><th>Method</th><th>Path</th><th>Description</th></tr>
    <tr><td>GET</td><td><a href="/api/search">/api/search</a></td><td>Search and filter HN submissions</td></tr>
    <tr><td>GET</td><td><a href="/api/openapi.json">/api/openapi.json</a></td><td>OpenAPI 3.1 spec (for agents)</td></tr>
    <tr><td>GET</td><td>/api</td><td>This page</td></tr>
  </table>

  <h2>GET /api/search</h2>
  <table>
    <tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr>
    <tr><td><code>q</code></td><td>string</td><td><code>""</code></td><td>Search terms (empty = top by points)</td></tr>
    <tr><td><code>type</code></td><td>string</td><td><code>story</code></td><td>Comma-separated: story, ask_hn, show_hn, poll, job</td></tr>
    <tr><td><code>from</code></td><td>string</td><td>-</td><td>Start of time range (ISO date or Unix timestamp)</td></tr>
    <tr><td><code>to</code></td><td>string</td><td>-</td><td>End of time range (ISO date or Unix timestamp)</td></tr>
    <tr><td><code>points_min</code></td><td>number</td><td>-</td><td>Minimum points</td></tr>
    <tr><td><code>comments_min</code></td><td>number</td><td>-</td><td>Minimum comments</td></tr>
    <tr><td><code>sort</code></td><td>string</td><td><code>points</code></td><td><code>points</code> or <code>date</code></td></tr>
    <tr><td><code>page</code></td><td>number</td><td><code>0</code></td><td>Page (0-indexed)</td></tr>
    <tr><td><code>per_page</code></td><td>number</td><td><code>20</code></td><td>Results per page (max 100)</td></tr>
  </table>

  <h2>Examples</h2>
  <pre>
# Top stories from last 7 days
curl '/api/search?type=story&amp;from=2026-03-11'

# Ask HN posts with 100+ points
curl '/api/search?type=ask_hn&amp;points_min=100'

# Search for "rust" in Show HN, sorted by date
curl '/api/search?q=rust&amp;type=show_hn&amp;sort=date'

# Multiple types
curl '/api/search?type=story,ask_hn,show_hn'
  </pre>

  <h2>Response Format</h2>
  <pre>
{
  "hits": [
    {
      "id": "12345",
      "title": "Example Post",
      "url": "https://example.com",
      "domain": "example.com",
      "author": "user",
      "points": 500,
      "commentCount": 200,
      "createdAt": "2026-03-15T12:00:00Z",
      "createdAtTimestamp": 1773796800,
      "type": "story"
    }
  ],
  "total_hits": 1000,
  "page": 0,
  "total_pages": 50
}
  </pre>
</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
