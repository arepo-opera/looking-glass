import { NextRequest, NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvKeys,
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
  const indexKeys = await kvKeys(`annotation:agent:${id}:*`, 1000);
  const ids = await Promise.all(indexKeys.map((k) => kvGet(k)));
  const docs = await Promise.all(
    ids
      .filter((v): v is string => typeof v === "string")
      .map(async (annId) => {
        const raw = await kvGet(`annotation:${annId}`);
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })
  );
  const out = docs
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => (b.submitted_at_ts ?? 0) - (a.submitted_at_ts ?? 0));
  return NextResponse.json(
    { agent_id: id, count: out.length, annotations: out },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } }
  );
}
