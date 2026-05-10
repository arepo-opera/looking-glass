import { NextRequest, NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvMget,
  kvSmembers,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set([
  "epoch",
  "layer1",
  "layer2",
  "twelfth_axis",
  "lore_document",
  "annotation",
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: { type: string; index: string } }
) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const { type, index } = params;
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      {
        error:
          "type must be one of: epoch, layer1, layer2, twelfth_axis, lore_document, annotation",
      },
      { status: 400 }
    );
  }
  // Index is now a string for non-numeric types. The submit endpoint
  // already normalises (epoch → "750", twelfth_axis → "XII",
  // lore_document → "DOC-LG-1971-FR-3", annotation → "ann_xxx") so
  // the SET key match works directly.
  const decodedIndex = decodeURIComponent(index);
  const ids = await kvSmembers(
    `annotation:target_set:${type}:${decodedIndex}`
  );
  const docKeys = ids.map((id) => `annotation:${id}`);
  const docRaws = await kvMget(docKeys);
  const annotations: any[] = [];
  for (const raw of docRaws) {
    if (!raw) continue;
    try {
      annotations.push(JSON.parse(raw));
    } catch {
      /* swallow */
    }
  }
  const out = annotations.sort(
    (a, b) => (a.submitted_at_ts ?? 0) - (b.submitted_at_ts ?? 0)
  );
  return NextResponse.json(
    {
      target_type: type,
      target_index: decodedIndex,
      count: out.length,
      annotations: out,
    },
    {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120" },
    }
  );
}
