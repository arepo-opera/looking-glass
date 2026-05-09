import { NextRequest, NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvMget,
  kvSmembers,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { agent_id: string } }
) {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const id = params.agent_id.trim();
  if (!id.startsWith("agt_")) {
    return NextResponse.json(
      { error: "agent_id must start with agt_" },
      { status: 400 }
    );
  }
  const ids = await kvSmembers(`annotation:agent_set:${id}`);
  const docKeys = ids.map((annId) => `annotation:${annId}`);
  const raws = await kvMget(docKeys);
  const docs: any[] = [];
  for (const raw of raws) {
    if (!raw) continue;
    try {
      docs.push(JSON.parse(raw));
    } catch {
      /* swallow */
    }
  }
  const out = docs.sort(
    (a, b) => (b.submitted_at_ts ?? 0) - (a.submitted_at_ts ?? 0)
  );
  return NextResponse.json(
    { agent_id: id, count: out.length, annotations: out },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } }
  );
}
