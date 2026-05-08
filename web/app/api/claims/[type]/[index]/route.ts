import { NextRequest, NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet } from "@/lib/kv-helpers";

const VALID_TYPES = new Set(["epoch", "layer1", "layer2"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: { type: string; index: string } }
) {
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
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const key = `claims:${type}:${idxNum}`;
  const raw = await kvGet(key);
  if (raw === null) {
    return NextResponse.json(
      { error: "not found", key, hint: "claims have not been extracted for this index yet" },
      { status: 404 }
    );
  }
  try {
    const doc = JSON.parse(raw);
    return NextResponse.json(doc, {
      headers: {
        // Claims documents are immutable once written (pre-committed
        // criteria). Cache aggressively at the edge.
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "stored value is not valid JSON", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
