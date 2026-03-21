import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "HN Browser API",
    docs: "/api-docs",
    endpoints: {
      search: "/api/search",
      openapi: "/api/openapi.json",
    },
  });
}
