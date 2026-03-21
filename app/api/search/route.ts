import { NextRequest, NextResponse } from "next/server";
import { searchAlgolia } from "@/lib/algolia";
import { SearchParams, SortOrder, VALID_TYPES } from "@/lib/types";

function isValidSort(value: string): value is SortOrder {
  return value === "points" || value === "date";
}

function validateTypes(input: string): string | null {
  const types = input.split(",").map((t) => t.trim()).filter(Boolean);
  const invalid = types.filter((t) => !(VALID_TYPES as readonly string[]).includes(t));
  if (invalid.length > 0) {
    return `Invalid type(s): ${invalid.join(", ")}. Valid: ${VALID_TYPES.join(", ")}`;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const sortParam = sp.get("sort") || "points";
  if (!isValidSort(sortParam)) {
    return NextResponse.json(
      { error: `Invalid sort value: "${sortParam}". Must be "points" or "date"` },
      { status: 400 },
    );
  }

  const typeParam = sp.get("type") || "story";
  const typeError = validateTypes(typeParam);
  if (typeError) {
    return NextResponse.json({ error: typeError }, { status: 400 });
  }

  const page = sp.has("page") ? Number(sp.get("page")) : 0;
  if (isNaN(page) || !Number.isInteger(page) || page < 0) {
    return NextResponse.json({ error: "page must be a non-negative integer" }, { status: 400 });
  }

  const perPage = sp.has("per_page") ? Number(sp.get("per_page")) : 20;
  if (isNaN(perPage) || !Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
    return NextResponse.json(
      { error: "per_page must be an integer between 1 and 100" },
      { status: 400 },
    );
  }

  const params: SearchParams = {
    q: sp.get("q") || undefined,
    type: typeParam,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    sort: sortParam,
    page,
    per_page: perPage,
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

  try {
    const result = await searchAlgolia(params);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const isUpstream = message.includes("Algolia API error");
    return NextResponse.json({ error: message }, { status: isUpstream ? 502 : 400 });
  }
}
