import { NextRequest, NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvKeys,
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
  const indexKeys = await kvKeys(
    `annotation:target:${type}:${idxNum}:*`,
    500
  );
  // Each key holds the annotation_id; resolve to full docs.
  const ids = await Promise.all(
    indexKeys.map((k) => kvGet(k))
  );
  const annotations = await Promise.all(
    ids
      .filter((v): v is string => typeof v === "string")
      .map(async (id) => {
        const raw = await kvGet(`annotation:${id}`);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
  );
  const out = annotations
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => (a.submitted_at_ts ?? 0) - (b.submitted_at_ts ?? 0));
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
