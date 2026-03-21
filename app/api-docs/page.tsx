export const metadata = {
  title: "API Docs - HN Browser",
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[0.85em]">
      {children}
    </code>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-orange-600 dark:text-orange-400 mt-10 mb-3">
      {children}
    </h2>
  );
}

const PARAMS = [
  { name: "q", type: "string", def: '""', desc: "Search terms (empty = top by points)" },
  { name: "type", type: "string", def: "story", desc: "Comma-separated: story, ask_hn, show_hn, poll, job" },
  { name: "from", type: "string", def: "-", desc: "Start of time range (ISO date or Unix timestamp)" },
  { name: "to", type: "string", def: "-", desc: "End of time range (ISO date or Unix timestamp)" },
  { name: "points_min", type: "number", def: "-", desc: "Minimum points" },
  { name: "comments_min", type: "number", def: "-", desc: "Minimum comments" },
  { name: "sort", type: "string", def: "points", desc: "points or date" },
  { name: "page", type: "number", def: "0", desc: "Page (0-indexed)" },
  { name: "per_page", type: "number", def: "20", desc: "Results per page (1-100)" },
];

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-gray-700 dark:text-gray-300 leading-relaxed">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        HN Browser API
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        A clean REST API for searching and filtering Hacker News submissions.
      </p>

      <SectionHeading>Endpoints</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-4 font-semibold text-gray-500 dark:text-gray-400">Method</th>
              <th className="text-left py-2 pr-4 font-semibold text-gray-500 dark:text-gray-400">Path</th>
              <th className="text-left py-2 font-semibold text-gray-500 dark:text-gray-400">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4">GET</td>
              <td className="py-2 pr-4">
                <a href="/api/search" className="text-orange-600 dark:text-orange-400 hover:underline">/api/search</a>
              </td>
              <td className="py-2">Search and filter HN submissions</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4">GET</td>
              <td className="py-2 pr-4">
                <a href="/api/openapi.json" className="text-orange-600 dark:text-orange-400 hover:underline">/api/openapi.json</a>
              </td>
              <td className="py-2">OpenAPI 3.1 spec (for agents)</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 pr-4">GET</td>
              <td className="py-2 pr-4"><Code>/api</Code></td>
              <td className="py-2">JSON discovery (links to endpoints and docs)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SectionHeading>GET /api/search</SectionHeading>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-4 font-semibold text-gray-500 dark:text-gray-400">Param</th>
              <th className="text-left py-2 pr-4 font-semibold text-gray-500 dark:text-gray-400">Type</th>
              <th className="text-left py-2 pr-4 font-semibold text-gray-500 dark:text-gray-400">Default</th>
              <th className="text-left py-2 font-semibold text-gray-500 dark:text-gray-400">Description</th>
            </tr>
          </thead>
          <tbody>
            {PARAMS.map((p) => (
              <tr key={p.name} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4"><Code>{p.name}</Code></td>
                <td className="py-2 pr-4">{p.type}</td>
                <td className="py-2 pr-4"><Code>{p.def}</Code></td>
                <td className="py-2">{p.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <strong>Note on sorting:</strong> When <Code>q</Code> is provided with{" "}
        <Code>sort=points</Code>, results use Algolia&apos;s relevance ranking
        (which factors in points) rather than strict points ordering. Use{" "}
        <Code>sort=date</Code> for deterministic ordering with a search query.
      </p>

      <SectionHeading>Examples</SectionHeading>
      <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto leading-relaxed">
{`# Top stories from last 7 days
curl '/api/search?type=story&from=2026-03-14'

# Ask HN posts with 100+ points
curl '/api/search?type=ask_hn&points_min=100'

# Search for "rust" in Show HN, sorted by date
curl '/api/search?q=rust&type=show_hn&sort=date'

# Multiple types
curl '/api/search?type=story,ask_hn,show_hn'`}
      </pre>

      <SectionHeading>Response Format</SectionHeading>
      <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto leading-relaxed">
{`{
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
}`}
      </pre>

      <SectionHeading>Error Responses</SectionHeading>
      <p className="text-sm mb-2">
        <Code>400</Code> for invalid parameters, <Code>502</Code> if the upstream Algolia API is unavailable.
      </p>
      <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
{`{ "error": "per_page must be an integer between 1 and 100" }`}
      </pre>
    </div>
  );
}
