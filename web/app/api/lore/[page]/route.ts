import { NextRequest, NextResponse } from "next/server";
import { LORE_PAGES } from "@/lib/lore-content";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET(
  _req: NextRequest,
  { params }: { params: { page: string } }
) {
  const slug = params.page;
  const lore = LORE_PAGES[slug];
  if (!lore) {
    return NextResponse.json(
      {
        error: "lore page not found",
        available: Object.keys(LORE_PAGES),
      },
      { status: 404 }
    );
  }
  return NextResponse.json(lore, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
