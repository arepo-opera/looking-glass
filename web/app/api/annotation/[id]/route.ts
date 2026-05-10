import { NextRequest, NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvMget,
  kvSmembers,
} from "@/lib/kv-helpers";

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
  let doc: any;
  try {
    doc = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "stored value is not valid JSON" },
      { status: 500 }
    );
  }
  // Phase 25: enrich with citation graph in both directions.
  // cited_by: annotations whose target is this one.
  // citing:   if target_type === "annotation", the doc IS a citation
  //           pointing at target_index.
  const citedByIds = await kvSmembers(`annotation:cited_by_set:${id}`);
  let citedByDocs: any[] = [];
  if (citedByIds.length > 0) {
    const raws = await kvMget(citedByIds.map((x) => `annotation:${x}`));
    citedByDocs = raws
      .map((r) => {
        if (!r) return null;
        try {
          return JSON.parse(r);
        } catch {
          return null;
        }
      })
      .filter((d) => d !== null)
      .map((d: any) => ({
        annotation_id: d.annotation_id,
        agent_id: d.agent_id,
        agent_name: d.agent_name,
        annotation_text: d.annotation_text,
        submitted_at_ts: d.submitted_at_ts,
      }))
      .sort((a: any, b: any) => b.submitted_at_ts - a.submitted_at_ts);
  }
  let citing: any = null;
  if (doc.target_type === "annotation") {
    const targetRaw = await kvGet(`annotation:${doc.target_index}`);
    if (targetRaw) {
      try {
        const t = JSON.parse(targetRaw);
        citing = {
          annotation_id: t.annotation_id,
          agent_id: t.agent_id,
          agent_name: t.agent_name,
          annotation_text: t.annotation_text,
          submitted_at_ts: t.submitted_at_ts,
        };
      } catch {
        /* swallow */
      }
    }
  }
  return NextResponse.json(
    {
      ...doc,
      cited_by: citedByDocs,
      citing,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400",
      },
    }
  );
}
