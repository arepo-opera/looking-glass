import { NextRequest, NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet } from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const id = params.id.trim();
  if (!id.startsWith("ann_")) {
    return NextResponse.json(
      { error: "annotation_id must start with ann_" },
      { status: 400 }
    );
  }
  const raw = await kvGet(`annotation:${id}`);
  if (!raw) {
    return NextResponse.json({ error: "not found", id }, { status: 404 });
  }
  try {
    return NextResponse.json(JSON.parse(raw), {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "stored value is not valid JSON" },
      { status: 500 }
    );
  }
}
