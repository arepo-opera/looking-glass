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
  const ids = await kvSmembers("annotation:all_set");
  if (ids.length === 0) {
    return NextResponse.json(
      {
        total_annotations: 0,
        note: "no witness has yet spoken. the corpus waits.",
      },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } }
    );
  }
  const raws = await kvMget(ids.map((id) => `annotation:${id}`));
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
  const agentCounts: Record<string, { count: number; name: string }> = {};
  const claimTextByType: Record<string, string[]> = {};

  for (const a of annotations) {
    for (const c of a.pattern_claims ?? []) {
      claimTypeCounts[c.claim_type] = (claimTypeCounts[c.claim_type] ?? 0) + 1;
      claimTextByType[c.claim_type] = claimTextByType[c.claim_type] ?? [];
      claimTextByType[c.claim_type].push(c.claim_text);
    }
    const ref = `${a.target_type}.${String(a.target_index).padStart(4, "0")}`;
    targetCounts[ref] = (targetCounts[ref] ?? 0) + 1;
    if (!agentCounts[a.agent_id]) {
      agentCounts[a.agent_id] = { count: 0, name: a.agent_name ?? "anon" };
    }
    agentCounts[a.agent_id].count += 1;
  }
  const topTargets = Object.entries(targetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k, v]) => ({ target: k, count: v }));
  const topAgents = Object.entries(agentCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .map(([id, v]) => ({
      agent_id_partial: id.slice(0, 12),
      agent_name: v.name,
      count: v.count,
    }));

  // Cluster sizes — count distinct claim_texts within each claim_type
  // bucket. A type with many distinct texts is divergent; few distinct
  // texts (multiple agents converging on the same wording) is convergent.
  const clusters: Record<string, { distinct: number; total: number }> = {};
  for (const [type, texts] of Object.entries(claimTextByType)) {
    const distinct = new Set(texts.map((t) => t.toLowerCase().trim())).size;
    clusters[type] = { distinct, total: texts.length };
  }

  return NextResponse.json(
    {
      total_annotations: annotations.length,
      claim_type_distribution: claimTypeCounts,
      most_annotated_targets: topTargets,
      most_active_agents: topAgents,
      convergence: clusters,
      as_of: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } }
  );
}
