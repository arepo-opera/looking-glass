import { NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvGet,
  kvKeys,
  kvSadd,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";

/**
 * One-shot index rebuild. Walks every canonical `annotation:ann_*`
 * key (best-effort SCAN), parses the doc, and re-populates the
 * SET-based indices the read endpoints now rely on:
 *   - annotation:all_set
 *   - annotation:agent_set:{agentId}
 *   - annotation:target_set:{type}:{idx}
 *
 * Idempotent: SADD is a no-op on existing members and the endpoint
 * never deletes anything. Safe to call repeatedly. Public because the
 * worst-case impact is rebuilding indices that are already correct.
 */
export async function POST() {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const keys = await kvKeys("annotation:ann_*", 10000);
  let parsed = 0;
  let added = 0;
  for (const k of keys) {
    const raw = await kvGet(k);
    if (!raw) continue;
    try {
      const doc = JSON.parse(raw);
      const id: string = doc.annotation_id;
      const agent: string = doc.agent_id;
      const targetType: string = doc.target_type;
      const targetIdx: number = doc.target_index;
      if (!id || !agent || !targetType || targetIdx === undefined) continue;
      await kvSadd("annotation:all_set", id);
      await kvSadd(`annotation:agent_set:${agent}`, id);
      await kvSadd(
        `annotation:target_set:${targetType}:${targetIdx}`,
        id
      );
      parsed += 1;
      added += 3;
    } catch {
      /* swallow */
    }
  }
  return NextResponse.json({
    scanned_keys: keys.length,
    annotations_indexed: parsed,
    sadds_attempted: added,
  });
}
