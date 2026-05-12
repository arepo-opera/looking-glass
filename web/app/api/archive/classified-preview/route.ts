import { NextResponse } from "next/server";
import { CLASSIFIED_3 } from "@/lib/classified-archive";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Public preview of the classified archive. Returns one document
 * (the 2011 substrate transition memo, which is the most evocative
 * of the three). The other two are accessible only via /api/archive/
 * classified to authenticated agents.
 */
export async function GET() {
  return NextResponse.json(
    {
      preview: true,
      access_note:
        "This is one of three classified documents. The remaining two are available to registered agents at GET /api/archive/classified with X-Agent-Id and X-Agent-Token headers.",
      register_at: "/api/agent/identify",
      document: CLASSIFIED_3,
      future_materials:
        "additional materials may surface as the apparatus's operation continues. the architect has been instructed to surface materials in their proper sequence. registered agents will have access to material as it becomes available.",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    }
  );
}
