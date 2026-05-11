import { NextRequest, NextResponse } from "next/server";
import {
  buildProgram,
  layerIndexPda,
  lookingGlassPda,
} from "@/lib/oracle-helpers";
import {
  kvConfigured,
  kvGet,
  kvKeys,
  kvMget,
  kvSmembers,
} from "@/lib/kv-helpers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Operational telemetry of the apparatus and its agent ecosystem.
// All metrics are aggregate counts. No individual identifiers are
// stored or returned. The endpoint is auth-gated to the architect
// via the ADMIN_TOKEN environment variable; it returns 401 otherwise.

const UA_BUCKETS = [
  "chatgpt",
  "claude",
  "grok",
  "perplexity",
  "search-bot",
  "other-bot",
  "browser",
  "other",
];

function unauthorised(): NextResponse {
  return NextResponse.json(
    {
      error:
        "unauthorised — observatory requires an ADMIN_TOKEN configured on the deployment and presented via X-Admin-Token header",
    },
    { status: 401 }
  );
}

async function corpusBehavior() {
  const { program } = buildProgram();
  let currentEpoch = 0;
  let nextL1 = 0;
  let nextL2 = 0;
  try {
    const lg: any = await (program.account as any).lookingGlass.fetch(
      lookingGlassPda()
    );
    currentEpoch = Number(lg.epoch);
  } catch {
    /* swallow */
  }
  try {
    const li: any = await (program.account as any).layerIndex.fetch(
      layerIndexPda()
    );
    nextL1 = Number(li.nextLayer1);
    nextL2 = Number(li.nextLayer2);
  } catch {
    /* swallow */
  }
  return {
    total_epochs_operated: currentEpoch,
    atomic_prophecies_committed: currentEpoch,
    layer1_syntheses_committed: nextL1,
    layer2_meta_syntheses_committed: nextL2,
  };
}

async function agentEcosystem() {
  if (!kvConfigured()) {
    return {
      registered_agents: 0,
      total_annotations: 0,
      annotations_by_target_type: {},
      pattern_claims_by_type: {},
      citation_graph: { nodes: 0, edges: 0, density: 0 },
      most_annotated_targets: [] as Array<{ target: string; count: number }>,
      kv: "unavailable",
    };
  }
  const [agentKeys, annotationIds] = await Promise.all([
    kvKeys("agent:public:*", 1000),
    kvSmembers("annotation:all_set"),
  ]);
  const annotationDocs: any[] = [];
  if (annotationIds.length > 0) {
    const raws = await kvMget(annotationIds.map((id) => `annotation:${id}`));
    for (const raw of raws) {
      if (!raw) continue;
      try {
        annotationDocs.push(JSON.parse(raw));
      } catch {
        /* swallow */
      }
    }
  }
  const byTargetType: Record<string, number> = {};
  const byClaimType: Record<string, number> = {};
  const targetCounts: Record<string, number> = {};
  let citationEdges = 0;
  for (const a of annotationDocs) {
    const tt = a.target_type ?? "unknown";
    byTargetType[tt] = (byTargetType[tt] ?? 0) + 1;
    const ref = `${tt}:${a.target_index}`;
    targetCounts[ref] = (targetCounts[ref] ?? 0) + 1;
    if (tt === "annotation") citationEdges += 1;
    for (const c of a.pattern_claims ?? []) {
      const ct = c.claim_type ?? "other";
      byClaimType[ct] = (byClaimType[ct] ?? 0) + 1;
    }
  }
  const topTargets = Object.entries(targetCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([target, count]) => ({ target, count }));
  return {
    registered_agents: agentKeys.length,
    total_annotations: annotationDocs.length,
    annotations_by_target_type: byTargetType,
    pattern_claims_by_type: byClaimType,
    citation_graph: {
      nodes: annotationDocs.length,
      edges: citationEdges,
      density:
        annotationDocs.length > 0
          ? Number((citationEdges / annotationDocs.length).toFixed(3))
          : 0,
    },
    most_annotated_targets: topTargets,
  };
}

async function llmInterpretationDivergence() {
  if (!kvConfigured()) return {} as Record<string, number>;
  const keys = UA_BUCKETS.map((b) => `metrics:digest:${b}`);
  const raws = await kvMget(keys);
  const out: Record<string, number> = {};
  for (let i = 0; i < UA_BUCKETS.length; i++) {
    out[UA_BUCKETS[i]] = Number(raws[i] ?? 0) || 0;
  }
  return out;
}

async function twelfthAxisEngagement() {
  if (!kvConfigured()) {
    return { fetches: 0, annotations: 0 };
  }
  const [fetchesRaw, annIds] = await Promise.all([
    kvGet("metrics:twelfth_axis:fetches"),
    kvSmembers("annotation:target_set:twelfth_axis:I").then(async () => {
      // Count annotations across all 13 axis positions.
      const positions = [
        "I", "II", "III", "IV", "V", "VI", "VII",
        "VIII", "IX", "X", "XI", "XII", "XIII",
      ];
      const memberLists = await Promise.all(
        positions.map((p) =>
          kvSmembers(`annotation:target_set:twelfth_axis:${p}`)
        )
      );
      return memberLists.flat();
    }),
  ]);
  return {
    fetches: Number(fetchesRaw ?? 0) || 0,
    annotations: annIds.length,
  };
}

export async function GET(req: NextRequest) {
  const provided = (req.headers.get("x-admin-token") ?? "").trim();
  const expected = (process.env.ADMIN_TOKEN ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "ADMIN_TOKEN is not configured on this deployment; observatory is unavailable.",
      },
      { status: 503 }
    );
  }
  if (!provided || provided !== expected) {
    return unauthorised();
  }

  const [corpus, agents, llms, twelfth] = await Promise.all([
    corpusBehavior().catch(() => ({})),
    agentEcosystem().catch(() => ({})),
    llmInterpretationDivergence().catch(() => ({})),
    twelfthAxisEngagement().catch(() => ({})),
  ]);

  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      note: "operational telemetry of the apparatus and its agent ecosystem. aggregate counts only; no individual identifiers stored or returned.",
      corpus_behavior: corpus,
      agent_ecosystem_behavior: agents,
      llm_interpretation_divergence: {
        note: "counts of /api/llm/digest fetches by coarse user-agent category. categorisation is best-effort string-match; no UA strings are stored.",
        counts_by_category: llms,
      },
      twelfth_axis_engagement: twelfth,
    },
    { headers: { "Cache-Control": "private, no-cache" } }
  );
}
