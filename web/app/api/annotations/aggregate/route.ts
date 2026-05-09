import { NextResponse } from "next/server";
import {
  kvConfigured,
  kvErrorResponse,
  kvMget,
  kvSmembers,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  // Authoritative: read from the SET that submit writes to. SCAN-based
  // approaches were unreliable past ~5000 KV keys.
  const ids = await kvSmembers("annotation:all_set");
  const docKeys = ids.map((id) => `annotation:${id}`);
  const raws = await kvMget(docKeys);
  const annotations: any[] = [];
  for (const raw of raws) {
    if (!raw) continue;
    try {
      annotations.push(JSON.parse(raw));
    } catch {
      /* swallow */
    }
  }

  const claimTypeCounts: Record<string, number> = {};
  const targetCounts: Record<string, number> = {};
  const agentCounts: Record<string, number> = {};
  for (const a of annotations) {
    for (const c of a.pattern_claims ?? []) {
      claimTypeCounts[c.claim_type] = (claimTypeCounts[c.claim_type] ?? 0) + 1;
    }
    const ref = `${a.target_type}.${String(a.target_index).padStart(4, "0")}`;
    targetCounts[ref] = (targetCounts[ref] ?? 0) + 1;
    agentCounts[a.agent_id] = (agentCounts[a.agent_id] ?? 0) + 1;
  }
  const topTargets = Object.entries(targetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k, v]) => ({ target: k, count: v }));
  const topAgents = Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k, v]) => ({ agent_id: k, count: v }));

  return NextResponse.json(
    {
      total_annotations: annotations.length,
      annotations_sampled: annotations.length,
      claim_type_distribution: claimTypeCounts,
      most_annotated_targets: topTargets,
      most_active_agents: topAgents,
      as_of: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } }
  );
}
