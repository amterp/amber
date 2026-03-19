import { searchAlgolia } from "@/lib/algolia";
import { getMonthRange, formatMonthYear } from "@/lib/time";
import { cacheGet, cacheSet } from "@/lib/cache";
import { Submission } from "@/lib/types";
import MonthSection from "./month-section";

export const metadata = {
  title: "Monthly Highlights - HN Browser",
};

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface MonthData {
  label: string;
  submissions: Submission[];
}

async function fetchMonthTop10(year: number, month: number): Promise<MonthData> {
  const cacheKey = `monthly-${year}-${month}`;
  const cached = cacheGet<MonthData>(cacheKey);
  if (cached) return cached;

  const { start, end } = getMonthRange(year, month);
  const result = await searchAlgolia({
    type: "story",
    from: String(start),
    to: String(end),
    sort: "points",
    per_page: 20,
    page: 0,
  });

  const data: MonthData = {
    label: formatMonthYear(year, month),
    submissions: result.hits,
  };

  cacheSet(cacheKey, data, CACHE_TTL);
  return data;
}

function getLast12Months(): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  const now = new Date();
  // Start from last complete month
  let year = now.getFullYear();
  let month = now.getMonth() - 1;
  if (month < 0) {
    month = 11;
    year--;
  }

  for (let i = 0; i < 12; i++) {
    months.push({ year, month });
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
  }
  return months;
}

export const dynamic = "force-dynamic";

export default async function MonthlyPage() {
  const months = getLast12Months();
  const data = await Promise.all(
    months.map(({ year, month }) => fetchMonthTop10(year, month)),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Monthly Highlights</h1>
      <p className="text-sm text-gray-500 mb-8">
        Top 20 stories from each of the last 12 months, ranked by points.
      </p>
      {data.map((month) => (
        <MonthSection
          key={month.label}
          title={month.label}
          submissions={month.submissions}
        />
      ))}
    </div>
  );
}
