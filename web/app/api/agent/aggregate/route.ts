import { NextResponse } from "next/server";
import { kvConfigured, kvErrorResponse, kvGet, kvKeys } from "@/lib/kv-helpers";

export const revalidate = 60;

export async function GET() {
  if (!kvConfigured()) {
    return NextResponse.json(kvErrorResponse(), { status: 503 });
  }
  const agentKeys = await kvKeys("agent:public:*", 1000);
  const logKeys = await kvKeys("agent:timeline:*", 5000);
  const interactionsByType: Record<string, number> = {};
  const referenceCounts: Record<string, number> = {};
  let registrationsLast30d = 0;
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  // Sample logs to keep response under serverless time budget — full
  // counts come from key-count, breakdowns from a sampled walk.
  const sampled = logKeys.slice(0, 500);
  await Promise.all(
    sampled.map(async (k) => {
      const raw = await kvGet(k);
      if (!raw) return;
      try {
        const r = JSON.parse(raw) as {
          interaction_type?: string;
          epoch_or_layer_referenced?: string;
        };
        if (r.interaction_type) {
          interactionsByType[r.interaction_type] =
            (interactionsByType[r.interaction_type] ?? 0) + 1;
        }
        if (r.epoch_or_layer_referenced) {
          referenceCounts[r.epoch_or_layer_referenced] =
            (referenceCounts[r.epoch_or_layer_referenced] ?? 0) + 1;
        }
      } catch {
        /* skip */
      }
    })
  );

  // Walk public agent registrations to count last-30d.
  await Promise.all(
    agentKeys.map(async (k) => {
      const raw = await kvGet(k);
      if (!raw) return;
      try {
        const r = JSON.parse(raw) as { registered_at_ts?: number };
        if ((r.registered_at_ts ?? 0) >= thirtyDaysAgo) {
          registrationsLast30d += 1;
        }
      } catch {
        /* skip */
      }
    })
  );

  const mostReferenced = Object.entries(referenceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([ref, count]) => ({ reference: ref, count }));

  return NextResponse.json(
    {
      total_registered_agents: agentKeys.length,
      total_interactions_logged: logKeys.length,
      interactions_sampled_for_breakdown: sampled.length,
      interactions_by_type: interactionsByType,
      most_referenced: mostReferenced,
      registrations_last_30d: registrationsLast30d,
      as_of: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}
