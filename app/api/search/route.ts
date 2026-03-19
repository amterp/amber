import { NextRequest, NextResponse } from "next/server";
import { searchAlgolia } from "@/lib/algolia";
import { SearchParams, SortOrder } from "@/lib/types";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  try {
    const params: SearchParams = {
      q: sp.get("q") || undefined,
      type: sp.get("type") || "story",
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      sort: (sp.get("sort") as SortOrder) || "points",
      page: sp.has("page") ? Number(sp.get("page")) : 0,
      per_page: sp.has("per_page") ? Number(sp.get("per_page")) : 20,
    };

    if (sp.has("points_min")) {
      params.points_min = Number(sp.get("points_min"));
      if (isNaN(params.points_min)) {
        return NextResponse.json({ error: "points_min must be a number" }, { status: 400 });
      }
    }
    if (sp.has("comments_min")) {
      params.comments_min = Number(sp.get("comments_min"));
      if (isNaN(params.comments_min)) {
        return NextResponse.json({ error: "comments_min must be a number" }, { status: 400 });
      }
    }

    if (params.per_page !== undefined && (params.per_page < 1 || params.per_page > 100)) {
      return NextResponse.json({ error: "per_page must be between 1 and 100" }, { status: 400 });
    }

    const result = await searchAlgolia(params);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
