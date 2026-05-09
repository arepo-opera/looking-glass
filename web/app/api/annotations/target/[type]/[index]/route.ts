import { NextRequest, NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvMget,
  kvSmembers,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["epoch", "layer1", "layer2"]);

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
      { error: "type must be one of: epoch, layer1, layer2" },
      { status: 400 }
    );
  }
  const idxNum = Number(index);
  if (!Number.isFinite(idxNum) || idxNum < 0) {
    return NextResponse.json(
      { error: "index must be a non-negative integer" },
      { status: 400 }
    );
  }
  // Authoritative SET-based index: O(1) read, no SCAN.
  const ids = await kvSmembers(
    `annotation:target_set:${type}:${idxNum}`
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
      target_index: idxNum,
      count: out.length,
      annotations: out,
    },
    {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=120" },
    }
  );
}
